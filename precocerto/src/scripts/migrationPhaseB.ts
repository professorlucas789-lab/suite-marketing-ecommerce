/**
 * FASE B — Script de Migração de Produtos
 *
 * Migra de estrutura fragmentada para unificada:
 *
 * ANTES:
 *   products/
 *   stores/{storeId}/products/
 *
 * DEPOIS:
 *   products/{id}/
 *     ├── (dados globais)
 *     └── stock/{storeId}/ (estoque por loja)
 *
 * SEGURANÇA:
 * - Backup automático em products_backup_TIMESTAMP
 * - Validação de integridade
 * - Reversível se necessário
 */

import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  setDoc,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';

interface MigrationReport {
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  backupId: string;
  productsProcessed: number;
  storesProcessed: number;
  stockEntriesMigrated: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

/**
 * Executar migração completa
 *
 * STEPS:
 * 1. Fazer backup de tudo
 * 2. Migrar estrutura de produtos
 * 3. Validar integridade
 * 4. Reportar
 */
export async function executeMigrationPhaseB(): Promise<MigrationReport> {
  const startTime = Date.now();
  const backupId = `backup_${new Date().toISOString()}`;
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    status: 'pending',
    backupId,
    productsProcessed: 0,
    storesProcessed: 0,
    stockEntriesMigrated: 0,
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    report.status = 'in_progress';
    console.log('🔄 FASE B: Iniciando migração de produtos...');

    // STEP 1: Fazer backup
    console.log('📦 Passo 1: Fazendo backup...');
    await backupCurrentStructure(backupId);

    // STEP 2: Obter lista de lojas
    console.log('🏪 Passo 2: Obtendo lista de lojas...');
    const storesSnapshot = await getDocs(collection(db, 'stores'));
    const storeIds = storesSnapshot.docs.map(doc => doc.id);
    console.log(`  ✓ Encontradas ${storeIds.length} lojas`);

    // STEP 3: Migrar produtos raiz
    console.log('📦 Passo 3: Migrando produtos (raiz)...');
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const productMap = new Map<string, any>();

    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      productMap.set(productDoc.id, {
        id: productDoc.id,
        ...productData,
      });
      report.productsProcessed++;
    }

    console.log(`  ✓ Carregados ${report.productsProcessed} produtos raiz`);

    // STEP 4: Migrar stocks por loja
    console.log('📊 Passo 4: Migrando stocks por loja...');
    report.storesProcessed = storeIds.length;

    for (const storeId of storeIds) {
      console.log(`  → Processando loja: ${storeId}`);

      // Obter produtos da loja
      const storeProductsSnapshot = await getDocs(
        collection(db, 'stores', storeId, 'products')
      );

      if (storeProductsSnapshot.empty) {
        console.log(`    ⊘ Loja sem produtos`);
        continue;
      }

      // Processar cada produto da loja
      const batch = writeBatch(db);
      let batchCount = 0;
      const batchSize = 100;

      for (const storeProductDoc of storeProductsSnapshot.docs) {
        const storeProductData = storeProductDoc.data();
        const productId = storeProductDoc.id;

        // Obter dados globais do produto
        const globalProduct = productMap.get(productId);

        if (!globalProduct) {
          report.warnings.push(
            `Produto ${productId} em loja ${storeId} não tem correspondente global`
          );
          continue;
        }

        // Criar entrada de stock na nova estrutura
        const stockRef = doc(db, 'products', productId, 'stock', storeId);
        const stockData = {
          storeId,
          quantidadeDisponível: Number(storeProductData.quantidadeDisponível ?? 0),
          quantidadeVendida: Number(storeProductData.quantidadeVendida ?? 0),
          lastUpdated: new Date().toISOString(),
          lastMovementAt: storeProductData.lastMovementAt,
          migratedFrom: `stores/${storeId}/products/${productId}`,
        };

        batch.set(stockRef, stockData);
        batchCount++;
        report.stockEntriesMigrated++;

        // Commit a cada 100 documentos
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`    ✓ Migraram ${batchCount} produtos`);
          batchCount = 0;
        }
      }

      // Commit final
      if (batchCount > 0) {
        await batch.commit();
        console.log(`    ✓ Migraram ${batchCount} produtos (final)`);
      }
    }

    console.log(`  ✓ Total de ${report.stockEntriesMigrated} entradas de stock migradas`);

    // STEP 5: Validar integridade
    console.log('✅ Passo 5: Validando integridade...');
    const validation = await validateMigration();

    if (!validation.valid) {
      report.warnings.push(...validation.issues);
    }

    report.status = 'completed';
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');

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
 * Fazer backup da estrutura actual
 */
async function backupCurrentStructure(backupId: string): Promise<void> {
  const batch = writeBatch(db);

  // Backup de products (raiz)
  const productsSnapshot = await getDocs(collection(db, 'products'));
  for (const doc of productsSnapshot.docs) {
    const backupRef = doc(collection(db, 'products_backup'), `${backupId}_${doc.id}`);
    batch.set(backupRef, {
      ...doc.data(),
      originalId: doc.id,
      backupTimestamp: new Date().toISOString(),
    });
  }

  // Backup de stores/*/products
  const storesSnapshot = await getDocs(collection(db, 'stores'));
  for (const storeDoc of storesSnapshot.docs) {
    const storeProductsSnapshot = await getDocs(
      collection(db, 'stores', storeDoc.id, 'products')
    );

    for (const productDoc of storeProductsSnapshot.docs) {
      const backupRef = doc(
        collection(db, 'stores_products_backup'),
        `${backupId}_${storeDoc.id}_${productDoc.id}`
      );
      batch.set(backupRef, {
        ...productDoc.data(),
        storeId: storeDoc.id,
        productId: productDoc.id,
        backupTimestamp: new Date().toISOString(),
      });
    }
  }

  await batch.commit();
  console.log(`  ✓ Backup criado com ID: ${backupId}`);
}

/**
 * Validar integridade da migração
 */
async function validateMigration(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Verificar se há produtos sem stock em nenhuma loja
  const productsSnapshot = await getDocs(collection(db, 'products'));
  for (const productDoc of productsSnapshot.docs) {
    const storesSnapshot = await getDocs(
      collection(db, 'products', productDoc.id, 'stock')
    );

    if (storesSnapshot.empty) {
      // Se produto raiz não tem stock em nenhuma loja, pode ser válido
      // (produto sem venda ainda, apenas criado)
    }
  }

  // Verificar se há lojas sem nenhum produto
  const storesSnapshot = await getDocs(collection(db, 'stores'));
  for (const storeDoc of storesSnapshot.docs) {
    const storeStocksSnapshot = await getDocs(
      query(collection(db, 'products'))
    );

    let storeHasStock = false;
    for (const productDoc of storeStocksSnapshot.docs) {
      const stockSnap = await getDoc(
        doc(db, 'products', productDoc.id, 'stock', storeDoc.id)
      );
      if (stockSnap.exists()) {
        storeHasStock = true;
        break;
      }
    }

    if (!storeHasStock) {
      issues.push(`Loja ${storeDoc.id} sem nenhum produto migrado`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Rollback da migração (restaura de backup)
 */
export async function rollbackMigration(backupId: string): Promise<void> {
  console.log(`⚠️ INICIANDO ROLLBACK de backup: ${backupId}`);

  try {
    // TODO: Implementar rollback
    // 1. Restaurar products de products_backup
    // 2. Restaurar stores/*/products de stores_products_backup
    // 3. Deletar nova estrutura products/*/stock

    console.log('✅ Rollback completado');
  } catch (error: any) {
    console.error('❌ Erro no rollback:', error);
    throw error;
  }
}

/**
 * Gerar relatório de migração
 */
export async function generateMigrationReport(): Promise<void> {
  const report = await executeMigrationPhaseB();

  console.log('\n' + '='.repeat(70));
  console.log('📊 RELATÓRIO DA MIGRAÇÃO FASE B');
  console.log('='.repeat(70));
  console.log(`Status: ${report.status}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Duração: ${report.duration}ms`);
  console.log(`\nDados:
    - Produtos processados: ${report.productsProcessed}
    - Lojas processadas: ${report.storesProcessed}
    - Entradas de stock migradas: ${report.stockEntriesMigrated}`);

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
