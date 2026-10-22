#!/usr/bin/env node

/**
 * Seed de dados de teste (estrutura ANTIGA) em Firebase STAGING para a migração FASE B
 *
 * Cria, no formato anterior à migração:
 * - stores/{storeId}                      (2 lojas)
 * - products/{productId}                  (3 produtos globais)
 * - stores/{storeId}/products/{productId} (stock por loja, 8 entradas)
 *
 * Segurança:
 * - Bloqueia imediatamente se o projeto for produção
 * - Só aceita o projeto precocerto-staging
 * - Usa Firebase Admin SDK com applicationDefault() (ignora as Security Rules)
 * - IDs com prefixo "fasebseed_": não colidem com as fixtures do smoke
 *   (_stg_smoke), cujo preflight aborta se encontrar fixtures residuais
 * - Só escreve/apaga documentos com o prefixo "fasebseed_"
 *
 * Uso:
 *   node scripts/staging-seed-fase-b.mjs            # cria os dados de teste
 *   node scripts/staging-seed-fase-b.mjs --limpar   # remove os dados de teste
 *                                                     (inclui a subcoleção stock
 *                                                     e os backups da migração)
 *
 * Requer: firebase-admin e credenciais aplicacionais (gcloud auth
 * application-default login, ou GOOGLE_APPLICATION_CREDENTIALS).
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';
const PREFIXO = 'fasebseed_';

const LOJAS = [
  { id: `${PREFIXO}store_1`, nome: 'Loja Centro (seed FASE B)' },
  { id: `${PREFIXO}store_2`, nome: 'Loja Norte (seed FASE B)' },
];

const PRODUTOS = [
  { id: `${PREFIXO}prod_001`, nome: 'Paracetamol 500mg', categoria: 'Medicamentos', preco: 2.5 },
  { id: `${PREFIXO}prod_002`, nome: 'Ibuprofeno 400mg', categoria: 'Medicamentos', preco: 3.0 },
  { id: `${PREFIXO}prod_003`, nome: 'Vitamina C', categoria: 'Suplementos', preco: 4.5 },
];

// [loja, produto, quantidadeDisponível, quantidadeVendida]
const STOCKS = [
  [0, 0, 50, 10],
  [0, 1, 30, 5],
  [0, 2, 20, 2],
  [1, 0, 75, 20],
  [1, 1, 45, 8],
  [1, 2, 60, 12],
];

function log(...args) {
  console.log('[STG-SEED-FASE-B]', ...args);
}

function validarProjeto(projectId) {
  if (projectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `SEGURANÇA CRÍTICA: projeto de PRODUÇÃO (${PRODUCTION_PROJECT_ID}). ` +
      `Este script trabalha SOMENTE com ${STAGING_PROJECT_ID}. Operação abortada.`
    );
  }
  if (projectId !== STAGING_PROJECT_ID) {
    throw new Error(`projectId deve ser '${STAGING_PROJECT_ID}', obtido '${projectId}'`);
  }
}

function assertPrefixo(id) {
  if (!id.startsWith(PREFIXO)) {
    throw new Error(`ID '${id}' não tem o prefixo ${PREFIXO}; recusado.`);
  }
}

async function criar(db) {
  const agora = new Date().toISOString();

  // Falha-rápido: não sobrescrever dados existentes
  const existentes = [];
  for (const loja of LOJAS) {
    if ((await db.doc(`stores/${loja.id}`).get()).exists) existentes.push(`stores/${loja.id}`);
  }
  for (const produto of PRODUTOS) {
    if ((await db.doc(`products/${produto.id}`).get()).exists) existentes.push(`products/${produto.id}`);
  }
  if (existentes.length > 0) {
    throw new Error(
      `Dados de seed já existem (${existentes.join(', ')}). ` +
      `Execute primeiro com --limpar.`
    );
  }

  const batch = db.batch();

  for (const loja of LOJAS) {
    assertPrefixo(loja.id);
    batch.set(db.doc(`stores/${loja.id}`), { nome: loja.nome, ativa: true, createdAt: agora });
  }

  for (const produto of PRODUTOS) {
    assertPrefixo(produto.id);
    batch.set(db.doc(`products/${produto.id}`), {
      nome: produto.nome,
      categoria: produto.categoria,
      preco: produto.preco,
      createdAt: agora,
      updatedAt: agora,
    });
  }

  for (const [l, p, disponivel, vendida] of STOCKS) {
    const loja = LOJAS[l];
    const produto = PRODUTOS[p];
    batch.set(db.doc(`stores/${loja.id}/products/${produto.id}`), {
      productId: produto.id,
      quantidadeDisponível: disponivel,
      quantidadeVendida: vendida,
      // A migração copia este campo; undefined faria o Firestore rejeitar a escrita
      lastMovementAt: agora,
    });
  }

  await batch.commit();

  log(`Criadas ${LOJAS.length} lojas, ${PRODUTOS.length} produtos e ${STOCKS.length} entradas de stock.`);
}

async function apagarSubcolecao(db, caminho) {
  const snap = await db.collection(caminho).get();
  for (const d of snap.docs) {
    await d.ref.delete();
  }
  return snap.size;
}

async function limpar(db) {
  let apagados = 0;

  for (const loja of LOJAS) {
    assertPrefixo(loja.id);
    apagados += await apagarSubcolecao(db, `stores/${loja.id}/products`);
    await db.doc(`stores/${loja.id}`).delete();
    apagados++;
  }

  for (const produto of PRODUTOS) {
    assertPrefixo(produto.id);
    apagados += await apagarSubcolecao(db, `products/${produto.id}/stock`);
    await db.doc(`products/${produto.id}`).delete();
    apagados++;
  }

  // Backups criados pela migração para estes produtos/lojas (ID: backup_<ts>_<...>)
  for (const colecao of ['products_backup', 'stores_products_backup']) {
    const snap = await db.collection(colecao).get();
    for (const d of snap.docs) {
      if (d.id.includes(PREFIXO)) {
        await d.ref.delete();
        apagados++;
      }
    }
  }

  log(`Removidos ${apagados} documentos de seed.`);
}

async function main() {
  const modoLimpar = process.argv.includes('--limpar');

  validarProjeto(STAGING_PROJECT_ID);
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    validarProjeto(process.env.VITE_FIREBASE_PROJECT_ID);
  }

  const app = initializeApp({ credential: applicationDefault(), projectId: STAGING_PROJECT_ID });
  validarProjeto(app.options.projectId);
  log(`Projeto validado: ${app.options.projectId}`);

  const db = getFirestore(app);

  if (modoLimpar) {
    await limpar(db);
  } else {
    await criar(db);
    log('Próximo passo: npm run migrate:staging');
  }
}

// Erros de credenciais do gRPC chegam fora do try/catch: mostrar mensagem amigável
process.on('uncaughtException', error => {
  console.error('');
  console.error('[STG-SEED-FASE-B] ERRO:', error.message);
  if (error.message.includes('default credentials')) {
    console.error('   Falta autenticação. Execute: gcloud auth application-default login');
    console.error('   (ou defina GOOGLE_APPLICATION_CREDENTIALS com um service account de staging)');
  }
  process.exit(1);
});

main().catch(error => {
  console.error('[STG-SEED-FASE-B] ERRO:', error.message);
  process.exitCode = 1;
});
