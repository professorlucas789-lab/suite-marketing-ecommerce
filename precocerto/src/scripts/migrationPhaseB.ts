/**
 * FASE B — Script de Migração de Produtos (Firebase Admin SDK)
 *
 * Migra de estrutura fragmentada para unificada:
 *
 * ANTES:
 *   products/{id}
 *   stores/{storeId}/products/{id}   (stock por loja)
 *
 * DEPOIS:
 *   products/{id}/
 *     ├── (dados globais)
 *     └── stock/{storeId}/ (stock por loja)
 *
 * Usa o Admin SDK porque:
 * - as Security Rules exigem utilizador autenticado e membro da loja, e não
 *   cobrem os caminhos novos (stock) nem as coleções de backup;
 * - a migração lê coleções inteiras (sem filtro por storeId), o que as regras
 *   multi-tenant rejeitam para qualquer utilizador de cliente.
 *
 * SEGURANÇA:
 * - Backup automático antes de qualquer escrita (products_backup e
 *   stores_products_backup, com o campo backupId)
 * - NÃO altera nem apaga a estrutura antiga: só acrescenta products/{id}/stock
 * - NÃO sobrescreve stock já existente (evita perder vendas posteriores
 *   a uma primeira execução)
 * - Modo dryRun: calcula tudo sem escrever
 * - Rollback real: remove o stock migrado e repõe originais em falta
 *
 * O ficheiro recebe a instância Firestore por parâmetro; a validação do projeto
 * (staging vs produção) é feita em scripts/run-migration-staging.ts.
 */

import type {
  DocumentReference,
  Firestore,
} from 'firebase-admin/firestore';

/** Máximo de operações por batch do Firestore é 500; deixa-se margem. */
const TAMANHO_LOTE = 400;

export interface MigrationOptions {
  /** Calcula e reporta sem escrever nada */
  dryRun?: boolean;
}

export interface MigrationReport {
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  backupId: string;
  dryRun: boolean;
  productsProcessed: number;
  storesProcessed: number;
  stockEntriesMigrated: number;
  stockEntriesSkipped: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface RollbackReport {
  backupId: string;
  stockRemoved: number;
  productsRestored: number;
  storeProductsRestored: number;
}

interface Escrita {
  ref: DocumentReference;
  dados: Record<string, unknown>;
}

interface StockPlaneado {
  ref: DocumentReference;
  productId: string;
  storeId: string;
  dados: Record<string, unknown>;
}

/**
 * Metadados acrescentados aos documentos de backup. Os campos storeId/productId
 * ficam de fora de propósito: podem ser campos originais dos documentos.
 */
const CAMPOS_META_BACKUP = ['originalId', 'backupId', 'backupTimestamp'];

function removerMetaBackup(dados: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(dados).filter(([chave]) => !CAMPOS_META_BACKUP.includes(chave))
  );
}

function dividir<T>(itens: T[], tamanho: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    grupos.push(itens.slice(i, i + tamanho));
  }
  return grupos;
}

async function escreverEmLotes(db: Firestore, escritas: Escrita[], dryRun: boolean): Promise<void> {
  if (dryRun) return;

  for (const grupo of dividir(escritas, TAMANHO_LOTE)) {
    const lote = db.batch();
    for (const { ref, dados } of grupo) {
      lote.set(ref, dados);
    }
    await lote.commit();
  }
}

async function apagarEmLotes(db: Firestore, refs: DocumentReference[]): Promise<void> {
  for (const grupo of dividir(refs, TAMANHO_LOTE)) {
    const lote = db.batch();
    for (const ref of grupo) {
      lote.delete(ref);
    }
    await lote.commit();
  }
}

/** Lê vários documentos de uma vez; devolve um Map caminho → dados (só os existentes) */
async function lerExistentes(
  db: Firestore,
  refs: DocumentReference[]
): Promise<Map<string, Record<string, unknown>>> {
  const existentes = new Map<string, Record<string, unknown>>();

  for (const grupo of dividir(refs, TAMANHO_LOTE)) {
    const snaps = await db.getAll(...grupo);
    for (const snap of snaps) {
      if (snap.exists) {
        existentes.set(snap.ref.path, snap.data() as Record<string, unknown>);
      }
    }
  }

  return existentes;
}

/**
 * Executar migração completa
 *
 * STEPS:
 * 1. Fazer backup de tudo
 * 2. Planear o stock novo (loja × produto)
 * 3. Escrever stock novo (sem sobrescrever o que já existe)
 * 4. Validar integridade
 * 5. Reportar
 */
export async function executeMigrationPhaseB(
  db: Firestore,
  options: MigrationOptions = {}
): Promise<MigrationReport> {
  const dryRun = options.dryRun === true;
  const startTime = Date.now();
  const backupId = `backup_${new Date().toISOString()}`;
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    status: 'pending',
    backupId,
    dryRun,
    productsProcessed: 0,
    storesProcessed: 0,
    stockEntriesMigrated: 0,
    stockEntriesSkipped: 0,
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    report.status = 'in_progress';
    console.log(`🔄 FASE B: Iniciando migração de produtos${dryRun ? ' (DRY-RUN: sem escrita)' : ''}...`);

    // STEP 1: Backup
    console.log('📦 Passo 1: Fazendo backup...');
    await backupCurrentStructure(db, backupId, dryRun);

    // STEP 2: Lojas (listDocuments inclui lojas só com subcoleções)
    console.log('🏪 Passo 2: Obtendo lista de lojas...');
    const storeRefs = await db.collection('stores').listDocuments();
    const storeIds = storeRefs.map(ref => ref.id);
    report.storesProcessed = storeIds.length;
    console.log(`  ✓ Encontradas ${storeIds.length} lojas`);

    // STEP 3: Produtos globais
    console.log('📦 Passo 3: Lendo produtos (raiz)...');
    const productsSnapshot = await db.collection('products').get();
    const produtosGlobais = new Set<string>();
    for (const productDoc of productsSnapshot.docs) {
      produtosGlobais.add(productDoc.id);
      report.productsProcessed++;
    }
    console.log(`  ✓ Carregados ${report.productsProcessed} produtos raiz`);

    // STEP 4: Planear stock por loja
    console.log('📊 Passo 4: Planeando stock por loja...');
    const planeado: StockPlaneado[] = [];

    for (const storeId of storeIds) {
      const storeProductsSnapshot = await db.collection(`stores/${storeId}/products`).get();

      if (storeProductsSnapshot.empty) {
        console.log(`  ⊘ ${storeId}: loja sem produtos`);
        continue;
      }

      console.log(`  → ${storeId}: ${storeProductsSnapshot.size} produtos`);

      for (const storeProductDoc of storeProductsSnapshot.docs) {
        const productId = storeProductDoc.id;
        const origem = storeProductDoc.data();

        if (!produtosGlobais.has(productId)) {
          report.warnings.push(
            `Produto ${productId} em loja ${storeId} não tem correspondente global`
          );
          continue;
        }

        const dados: Record<string, unknown> = {
          storeId,
          quantidadeDisponível: Number(origem.quantidadeDisponível ?? 0),
          quantidadeVendida: Number(origem.quantidadeVendida ?? 0),
          lastUpdated: new Date().toISOString(),
          migratedFrom: `stores/${storeId}/products/${productId}`,
          migrationBackupId: backupId,
        };
        // O Admin SDK rejeita valores undefined
        if (origem.lastMovementAt !== undefined) {
          dados.lastMovementAt = origem.lastMovementAt;
        }

        planeado.push({
          ref: db.doc(`products/${productId}/stock/${storeId}`),
          productId,
          storeId,
          dados,
        });
      }
    }

    // STEP 5: Escrever sem sobrescrever stock existente
    console.log('✍️  Passo 5: Escrevendo stock novo...');
    const existentes = await lerExistentes(db, planeado.map(p => p.ref));
    const novos: StockPlaneado[] = [];

    for (const item of planeado) {
      const atual = existentes.get(item.ref.path);
      if (atual) {
        report.stockEntriesSkipped++;
        const qtdAtual = Number(atual.quantidadeDisponível ?? 0);
        const qtdOrigem = Number(item.dados.quantidadeDisponível);
        if (qtdAtual !== qtdOrigem) {
          report.warnings.push(
            `Stock já existente em ${item.ref.path} (${qtdAtual}) difere da origem (${qtdOrigem}); mantido`
          );
        }
      } else {
        novos.push(item);
      }
    }

    await escreverEmLotes(db, novos, dryRun);
    report.stockEntriesMigrated = novos.length;
    console.log(
      `  ✓ ${novos.length} entradas ${dryRun ? 'a migrar (dry-run)' : 'migradas'}, ` +
      `${report.stockEntriesSkipped} já existiam`
    );

    // STEP 6: Validar
    if (dryRun) {
      console.log('✅ Passo 6: Validação ignorada em dry-run');
    } else {
      console.log('✅ Passo 6: Validando integridade...');
      const validation = await validateMigration(db, planeado, produtosGlobais, storeIds);
      report.warnings.push(...validation.issues);
    }

    report.status = 'completed';
    console.log(`✅ MIGRAÇÃO ${dryRun ? 'SIMULADA ' : ''}CONCLUÍDA COM SUCESSO!`);

  } catch (error: any) {
    report.status = 'failed';
    report.errors.push(error.message || 'Erro desconhecido');
    console.error('❌ ERRO DURANTE MIGRAÇÃO:', error);
  } finally {
    report.duration = Date.now() - startTime;
  }

  return report;
}

/**
 * Fazer backup da estrutura actual (em lotes de TAMANHO_LOTE)
 */
async function backupCurrentStructure(
  db: Firestore,
  backupId: string,
  dryRun: boolean
): Promise<void> {
  const agora = new Date().toISOString();
  const escritas: Escrita[] = [];

  // Backup de products (raiz)
  const productsSnapshot = await db.collection('products').get();
  for (const productDoc of productsSnapshot.docs) {
    escritas.push({
      ref: db.doc(`products_backup/${backupId}_${productDoc.id}`),
      dados: {
        ...productDoc.data(),
        originalId: productDoc.id,
        backupId,
        backupTimestamp: agora,
      },
    });
  }

  // Backup de stores/*/products
  const storeRefs = await db.collection('stores').listDocuments();
  for (const storeRef of storeRefs) {
    const storeProductsSnapshot = await db.collection(`stores/${storeRef.id}/products`).get();

    for (const productDoc of storeProductsSnapshot.docs) {
      escritas.push({
        ref: db.doc(`stores_products_backup/${backupId}_${storeRef.id}_${productDoc.id}`),
        dados: {
          ...productDoc.data(),
          storeId: storeRef.id,
          productId: productDoc.id,
          backupId,
          backupTimestamp: agora,
        },
      });
    }
  }

  await escreverEmLotes(db, escritas, dryRun);
  console.log(
    `  ✓ Backup ${dryRun ? 'simulado' : 'criado'} com ID: ${backupId} (${escritas.length} documentos)`
  );
}

/**
 * Validar integridade da migração
 */
async function validateMigration(
  db: Firestore,
  planeado: StockPlaneado[],
  produtosGlobais: Set<string>,
  storeIds: string[]
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // 1. Todo o stock planeado tem de existir
  const existentes = await lerExistentes(db, planeado.map(p => p.ref));
  for (const item of planeado) {
    if (!existentes.has(item.ref.path)) {
      issues.push(`Stock em falta após migração: ${item.ref.path}`);
    }
  }

  // 2. Lojas sem nenhum produto migrado
  const lojasComStock = new Set(planeado.map(p => p.storeId));
  for (const storeId of storeIds) {
    if (!lojasComStock.has(storeId)) {
      issues.push(`Loja ${storeId} sem nenhum produto migrado`);
    }
  }

  // 3. Produtos globais sem stock em nenhuma loja (aviso: pode ser válido)
  const produtosComStock = new Set(planeado.map(p => p.productId));
  const semStock = [...produtosGlobais].filter(id => !produtosComStock.has(id));
  if (semStock.length > 0) {
    const amostra = semStock.slice(0, 10).join(', ');
    issues.push(
      `${semStock.length} produto(s) sem stock em nenhuma loja` +
      `${semStock.length > 10 ? ` (primeiros 10: ${amostra})` : ` (${amostra})`}`
    );
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Rollback da migração
 *
 * 1. Remove o stock criado por esta migração (migrationBackupId === backupId)
 * 2. Repõe, a partir do backup, apenas documentos originais que já NÃO existam
 *    (nunca sobrescreve dados atuais)
 *
 * A estrutura antiga não é alterada pela migração, pelo que normalmente só o
 * passo 1 tem efeito.
 */
export async function rollbackMigration(
  db: Firestore,
  backupId: string,
  options: MigrationOptions = {}
): Promise<RollbackReport> {
  const dryRun = options.dryRun === true;
  console.log(`⚠️ INICIANDO ROLLBACK de backup: ${backupId}${dryRun ? ' (DRY-RUN)' : ''}`);

  const resultado: RollbackReport = {
    backupId,
    stockRemoved: 0,
    productsRestored: 0,
    storeProductsRestored: 0,
  };

  // 1. Remover stock migrado
  const aApagar: DocumentReference[] = [];
  const productRefs = await db.collection('products').listDocuments();
  for (const productRef of productRefs) {
    const stockSnapshot = await productRef.collection('stock').get();
    for (const stockDoc of stockSnapshot.docs) {
      if (stockDoc.data().migrationBackupId === backupId) {
        aApagar.push(stockDoc.ref);
      }
    }
  }
  if (!dryRun) {
    await apagarEmLotes(db, aApagar);
  }
  resultado.stockRemoved = aApagar.length;
  console.log(`  ✓ Stock migrado ${dryRun ? 'a remover' : 'removido'}: ${aApagar.length}`);

  // 2. Repor originais em falta (nunca sobrescreve)
  const repor: Escrita[] = [];

  const backupProdutos = await db.collection('products_backup').where('backupId', '==', backupId).get();
  const refsProdutos = backupProdutos.docs.map(d =>
    db.doc(`products/${String(d.data().originalId)}`)
  );
  const produtosAtuais = await lerExistentes(db, refsProdutos);
  backupProdutos.docs.forEach((d, i) => {
    if (!produtosAtuais.has(refsProdutos[i].path)) {
      repor.push({ ref: refsProdutos[i], dados: removerMetaBackup(d.data()) });
      resultado.productsRestored++;
    }
  });

  const backupLojas = await db.collection('stores_products_backup').where('backupId', '==', backupId).get();
  const refsLojas = backupLojas.docs.map(d => {
    const dados = d.data();
    return db.doc(`stores/${String(dados.storeId)}/products/${String(dados.productId)}`);
  });
  const lojasAtuais = await lerExistentes(db, refsLojas);
  backupLojas.docs.forEach((d, i) => {
    if (!lojasAtuais.has(refsLojas[i].path)) {
      repor.push({ ref: refsLojas[i], dados: removerMetaBackup(d.data()) });
      resultado.storeProductsRestored++;
    }
  });

  await escreverEmLotes(db, repor, dryRun);
  console.log(
    `  ✓ Repostos em falta: ${resultado.productsRestored} produtos, ` +
    `${resultado.storeProductsRestored} produtos de loja`
  );

  console.log(dryRun ? '✅ Rollback simulado (nada foi alterado)' : '✅ Rollback concluído');
  return resultado;
}

/**
 * Imprimir relatório de migração
 */
export function printMigrationReport(report: MigrationReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO DA MIGRAÇÃO FASE B');
  console.log('='.repeat(70));
  console.log(`Status: ${report.status}${report.dryRun ? ' (DRY-RUN: nada foi escrito)' : ''}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Duração: ${report.duration}ms`);
  console.log(`\nDados:
    - Produtos processados: ${report.productsProcessed}
    - Lojas processadas: ${report.storesProcessed}
    - Entradas de stock migradas: ${report.stockEntriesMigrated}
    - Entradas de stock já existentes (mantidas): ${report.stockEntriesSkipped}`);

  if (report.errors.length > 0) {
    console.log(`\n❌ Erros (${report.errors.length}):`);
    report.errors.forEach(e => console.log(`  - ${e}`));
  }

  if (report.warnings.length > 0) {
    console.log(`\n⚠️ Avisos (${report.warnings.length}):`);
    report.warnings.forEach(w => console.log(`  - ${w}`));
  }

  console.log(`\nBackup ID: ${report.backupId}`);
  console.log('='.repeat(70));
}
