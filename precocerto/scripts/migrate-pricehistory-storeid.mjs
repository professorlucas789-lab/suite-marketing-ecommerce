#!/usr/bin/env node

/**
 * PC-02B.3D.1: Dry-run de Migração de storeId em priceHistory
 *
 * Objetivo: Preparar e validar o plano de migração de documentos em priceHistory
 * que atualmente carecem de `storeId`, inferindo-o de forma determinística.
 *
 * Segurança:
 * - DRY_RUN = true (nenhuma escrita em Firestore)
 * - ALLOW_WRITES = false (proteção adicional)
 * - Usa ADC nativa do Firebase Admin SDK
 * - Valida projectId === "precocerto-cc04a"
 * - Apenas leitura de Firestore
 * - Produz plano de migração em ficheiro local
 */

import {
  initializeApp,
  applicationDefault
} from 'firebase-admin/app';
import {
  getFirestore
} from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const DRY_RUN = true;
const ALLOW_WRITES = false;
const MIGRATION_PLAN_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-migration-plan.json'
);

function log(...args) {
  console.log('[MIGRATE-DRY-RUN]', ...args);
}

function logError(...args) {
  console.error('[MIGRATE-DRY-RUN-ERROR]', ...args);
}

function assertReadOnly(operation) {
  const forbiddenOperations = ['set', 'update', 'delete', 'create', 'batch', 'transaction', 'bulkWrite'];
  if (!ALLOW_WRITES && forbiddenOperations.includes(operation)) {
    throw new Error(`[SECURITY] Operação de escrita '${operation}' bloqueada. Este é um DRY-RUN READ-ONLY.`);
  }
}

function assertDryRun() {
  if (!DRY_RUN) {
    throw new Error('[SECURITY] DRY_RUN deve estar ativo para validação segura.');
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

let db = null;

async function initFirebase() {
  try {
    log('Tentando Application Default Credentials (ADC)...');
    const credential = applicationDefault();

    const app = initializeApp({
      credential,
      projectId: PRODUCTION_PROJECT_ID,
    });

    db = getFirestore(app);

    log(`Firestore inicializado para projeto: ${PRODUCTION_PROJECT_ID}`);
    log('Autenticação via: ADC (Application Default Credentials)');
    log(`DRY-RUN: ${DRY_RUN ? 'ATIVO' : 'INATIVO'}`);

    return db;
  } catch (err) {
    logError('Falha ao inicializar Firebase:', err.message);
    throw new Error(`Falha ao inicializar Firebase: ${err.message}`);
  }
}

// ============================================================
// DRY-RUN: PLANO DE MIGRAÇÃO
// ============================================================

async function generateMigrationPlan(validStoreIds, productStoreMap, userStoresMap) {
  assertReadOnly('read');
  assertDryRun();
  log('Gerando plano de migração (DRY-RUN)...');

  const plan = {
    totalDocuments: 0,
    migratable: 0,
    nonMigratable: 0,
    updates: [],
    validation: {
      allInferredStoreIdsValid: false,
      noConflicts: false,
      deterministic: false,
      safeToExecute: false
    },
    warnings: []
  };

  try {
    const snapshot = await db.collection('priceHistory').get();
    log(`Leitura de ${snapshot.size} documentos em /priceHistory`);
    plan.totalDocuments = snapshot.size;

    const storeIdMap = new Map(); // para detectar conflitos
    const productIdConflicts = new Map();
    const userIdConflicts = new Map();

    for (const doc of snapshot.docs) {
      const docId = doc.id;
      const data = doc.data();
      const productId = data.productId;
      const userId = data.userId;
      const currentStoreId = data.storeId;

      // Validar: campo storeId deve estar AUSENTE (conforme auditoria)
      const hasStoreIdField = Object.prototype.hasOwnProperty.call(data, 'storeId');
      if (hasStoreIdField && currentStoreId !== undefined && currentStoreId !== null) {
        plan.warnings.push({
          documentId: docId,
          warning: `storeId já presente (${currentStoreId}), não será sobrescrito`
        });
        continue;
      }

      // Inferir storeId
      let inferredStoreId = null;
      let method = null;

      if (productId && productStoreMap.has(productId)) {
        inferredStoreId = productStoreMap.get(productId);
        method = 'productId';
      } else {
        const userStores = userId ? (userStoresMap.get(userId) || []) : [];
        if (userStores.length === 1) {
          inferredStoreId = userStores[0];
          method = 'userId-single-store';
        }
      }

      // Validar inferência
      if (!inferredStoreId || !validStoreIds.has(inferredStoreId)) {
        plan.nonMigratable++;
        plan.warnings.push({
          documentId: docId,
          warning: `Não foi possível inferir storeId válido`
        });
        continue;
      }

      // Registar plano de atualização
      plan.updates.push({
        documentId: docId,
        productId: productId || null,
        userId: userId || null,
        inferredStoreId,
        method,
        updatePayload: {
          storeId: inferredStoreId,
          updatedAt: new Date().toISOString(), // será serverTimestamp em execução real
          migratedAt: new Date().toISOString()  // marcador de migração
        }
      });

      plan.migratable++;

      // Rastrear para detectar conflitos
      if (!storeIdMap.has(inferredStoreId)) {
        storeIdMap.set(inferredStoreId, []);
      }
      storeIdMap.get(inferredStoreId).push(docId);

      if (method === 'productId') {
        if (!productIdConflicts.has(productId)) {
          productIdConflicts.set(productId, []);
        }
        productIdConflicts.get(productId).push(inferredStoreId);
      } else if (method === 'userId-single-store') {
        if (!userIdConflicts.has(userId)) {
          userIdConflicts.set(userId, []);
        }
        userIdConflicts.get(userId).push(inferredStoreId);
      }
    }

    // Validação de Conflitos
    let hasConflicts = false;

    // Validar cada produto mapeia a uma ÚNICA store
    productIdConflicts.forEach((storeIds, productId) => {
      const uniqueStores = new Set(storeIds);
      if (uniqueStores.size > 1) {
        hasConflicts = true;
        plan.warnings.push({
          type: 'CONFLICT',
          productId,
          storeIds: Array.from(uniqueStores),
          warning: `Produto mapeia a múltiplas stores`
        });
      }
    });

    // Validar cada utilizador com 1 loja
    userIdConflicts.forEach((storeIds, userId) => {
      const uniqueStores = new Set(storeIds);
      if (uniqueStores.size > 1) {
        hasConflicts = true;
        plan.warnings.push({
          type: 'CONFLICT',
          userId,
          storeIds: Array.from(uniqueStores),
          warning: `Utilizador mapeia a múltiplas stores (não-single-store?)`
        });
      }
    });

    // Distribuição por store
    const distribution = {};
    storeIdMap.forEach((docIds, storeId) => {
      distribution[storeId] = docIds.length;
    });

    plan.distribution = distribution;

    // Validação Final
    plan.validation.allInferredStoreIdsValid = plan.updates.every(u => validStoreIds.has(u.inferredStoreId));
    plan.validation.noConflicts = !hasConflicts;
    plan.validation.deterministic = plan.migratable === plan.totalDocuments && plan.updates.length === plan.totalDocuments;
    plan.validation.safeToExecute =
      plan.validation.allInferredStoreIdsValid &&
      plan.validation.noConflicts &&
      plan.validation.deterministic &&
      DRY_RUN &&
      !ALLOW_WRITES;

    log(`  ✓ Documentos migráveis: ${plan.migratable}`);
    log(`  ✗ Documentos não-migráveis: ${plan.nonMigratable}`);
    log(`  ✓ Inferência DETERMINÍSTICA: ${plan.validation.deterministic ? 'SIM' : 'NÃO'}`);
    log(`  ✓ Sem conflitos: ${plan.validation.noConflicts ? 'SIM' : 'NÃO'}`);
    log(`  ✓ Seguro executar: ${plan.validation.safeToExecute ? 'SIM' : 'NÃO'}`);

  } catch (err) {
    logError('Falha ao gerar plano de migração:', err.message);
    throw new Error(`Falha ao gerar plano de migração: ${err.message}`);
  }

  return plan;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('PC-02B.3D.1 — DRY-RUN: PLANO DE MIGRAÇÃO DE priceHistory');
  console.log('=========================================================');
  console.log('');

  await initFirebase();

  // Pré-carregar referências válidas
  log('Pré-carregando referências válidas...');
  let validStoreIds = new Set();
  let productStoreMap = new Map();
  let userStoresMap = new Map();

  try {
    const storesSnapshot = await db.collection('stores').get();
    validStoreIds = new Set(storesSnapshot.docs.map(d => d.id));
    log(`  - Stores carregados: ${validStoreIds.size}`);

    const productsSnapshot = await db.collection('products').get();
    productStoreMap = new Map();
    productsSnapshot.docs.forEach(d => {
      const storeId = d.data().storeId;
      if (storeId && typeof storeId === 'string' && storeId.trim() !== '' && validStoreIds.has(storeId)) {
        productStoreMap.set(d.id, storeId);
      }
    });
    log(`  - Products com storeId válido: ${productStoreMap.size} / ${productsSnapshot.size}`);

    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.docs.forEach(d => {
      const lojas = d.data().lojas;
      if (lojas && Array.isArray(lojas)) {
        const dedupedLojas = Array.from(new Set(
          lojas
            .filter(loja => loja && typeof loja === 'string' && loja.trim() !== '')
            .map(loja => loja.trim())
        ));
        const validLojas = dedupedLojas.filter(loja => validStoreIds.has(loja));
        userStoresMap.set(d.id, validLojas);
      } else {
        userStoresMap.set(d.id, []);
      }
    });
    log(`  - Users carregados: ${userStoresMap.size} / ${usersSnapshot.size}`);
  } catch (err) {
    logError('Falha ao pré-carregar referências:', err.message);
    process.exit(1);
  }
  console.log('');

  // Gerar plano de migração
  const migrationPlan = await generateMigrationPlan(validStoreIds, productStoreMap, userStoresMap);
  console.log('');

  // Escrever ficheiro de plano
  try {
    fs.writeFileSync(MIGRATION_PLAN_FILE, JSON.stringify(migrationPlan, null, 2), 'utf8');
    log(`Plano de migração salvo em: ${MIGRATION_PLAN_FILE}`);
  } catch (err) {
    logError(`Falha ao escrever plano de migração: ${err.message}`);
    throw new Error(`Falha ao escrever plano de migração: ${err.message}`);
  }

  console.log('');
  console.log('RESUMO DO PLANO DE MIGRAÇÃO:');
  console.log('============================');
  console.log(`  Total de documentos: ${migrationPlan.totalDocuments}`);
  console.log(`  Migráveis: ${migrationPlan.migratable}`);
  console.log(`  Não-migráveis: ${migrationPlan.nonMigratable}`);
  console.log('');

  console.log('VALIDAÇÃO:');
  console.log('==========');
  console.log(`  ✓ Todos os storeIds válidos: ${migrationPlan.validation.allInferredStoreIdsValid ? 'SIM' : 'NÃO'}`);
  console.log(`  ✓ Sem conflitos: ${migrationPlan.validation.noConflicts ? 'SIM' : 'NÃO'}`);
  console.log(`  ✓ Determinístico: ${migrationPlan.validation.deterministic ? 'SIM' : 'NÃO'}`);
  console.log(`  ✓ Seguro executar: ${migrationPlan.validation.safeToExecute ? 'SIM' : 'NÃO'}`);
  console.log('');

  if (migrationPlan.distribution && Object.keys(migrationPlan.distribution).length > 0) {
    console.log('DISTRIBUIÇÃO POR STORE:');
    console.log('=======================');
    Object.entries(migrationPlan.distribution).forEach(([storeId, count]) => {
      console.log(`  ${storeId}: ${count} documentos`);
    });
    console.log('');
  }

  if (migrationPlan.warnings && migrationPlan.warnings.length > 0) {
    console.log('AVISOS:');
    console.log('=======');
    migrationPlan.warnings.slice(0, 20).forEach(w => {
      console.log(`  ⚠️  ${w.documentId || w.productId || w.userId || 'N/A'}: ${w.warning}`);
    });
    if (migrationPlan.warnings.length > 20) {
      console.log(`  ... e ${migrationPlan.warnings.length - 20} mais`);
    }
    console.log('');
  }

  console.log('RESULTADO FINAL:');
  console.log('================');
  console.log(`  ✓ Nenhum documento Firestore foi alterado (DRY-RUN).`);
  console.log(`  ✓ Plano de migração gerado e validado.`);
  console.log(`  ✓ Ficheiro de plano salvo: ${MIGRATION_PLAN_FILE}`);
  console.log('');

  if (migrationPlan.validation.safeToExecute) {
    console.log('✅ PLANO APROVADO PARA EXECUÇÃO');
  } else {
    console.log('❌ PLANO NÃO SEGURO — Revisar avisos acima');
  }
  console.log('');
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
