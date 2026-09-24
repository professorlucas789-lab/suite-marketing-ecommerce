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
  'precocerto-pricehistory-migration-dry-run.json'
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

function assertDryRunSafety() {
  if (DRY_RUN !== true || ALLOW_WRITES !== false) {
    throw new Error(
      '[SECURITY] Script autorizado somente com DRY_RUN=true e ALLOW_WRITES=false.'
    );
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
  assertDryRunSafety();
  log('Gerando plano de migração (DRY-RUN)...');

  const plan = {
    totalDocuments: 0,
    alreadyValid: 0,
    migrationCandidates: 0,

    classificationCounts: {
      deterministicProduct: 0,
      deterministicUserSingleStore: 0,
      ambiguous: 0,
      noEvidence: 0,
      userStoreConflict: 0,
      unexpectedStoreIdState: 0
    },

    candidates: [],
    blockers: [],
    inferredStoreDistribution: {},

    validation: {
      allCandidateStoreIdsValid: false,
      uniqueCandidateDocumentIds: false,
      zeroBlockers: false,
      safeToExecute: false
    },

    result: null
  };

  try {
    const snapshot = await db.collection('priceHistory').get();
    log(`Leitura de ${snapshot.size} documentos em /priceHistory`);
    plan.totalDocuments = snapshot.size;

    for (const doc of snapshot.docs) {
      const docId = doc.id;
      const data = doc.data();
      const productId = data.productId;
      const userId = data.userId;
      const currentStoreId = data.storeId;

      // Classificar estado atual de storeId
      const hasStoreIdField = Object.prototype.hasOwnProperty.call(data, 'storeId');
      const isStoreIdString = typeof currentStoreId === 'string';
      const isCurrentStoreIdValid =
        hasStoreIdField &&
        isStoreIdString &&
        currentStoreId.trim() !== '' &&
        validStoreIds.has(currentStoreId);

      // Caso 1: já válido
      if (isCurrentStoreIdValid) {
        plan.alreadyValid++;
        continue;
      }

      // Caso 2: campo existe mas é inválido
      if (hasStoreIdField) {
        plan.classificationCounts.unexpectedStoreIdState++;
        plan.blockers.push({
          documentId: docId,
          productId: productId || null,
          userId: userId || null,
          currentStoreId: currentStoreId ?? null,
          type: 'BLOCKING_UNEXPECTED_STOREID_STATE'
        });
        continue;
      }

      // Caso 3: campo AUSENTE - proceder com inferência
      let inferredStoreId = null;
      let method = null;
      let classification = null;

      // Prioridade 1: productId
      if (productId && productStoreMap.has(productId)) {
        inferredStoreId = productStoreMap.get(productId);
        method = 'productId';
        classification = 'DETERMINÍSTICO_PRODUCT';
      }
      // Prioridade 2: user single-store
      else {
        const userStores = userId ? (userStoresMap.get(userId) || []) : [];

        if (userStores.length === 1) {
          inferredStoreId = userStores[0];
          method = 'userId-single-store';
          classification = 'DETERMINÍSTICO_USER_SINGLE_STORE';
        }
        else if (userStores.length > 1) {
          plan.classificationCounts.ambiguous++;
          plan.blockers.push({
            documentId: docId,
            productId: productId || null,
            userId: userId || null,
            type: 'AMBÍGUO'
          });
          continue;
        }
        else {
          plan.classificationCounts.noEvidence++;
          plan.blockers.push({
            documentId: docId,
            productId: productId || null,
            userId: userId || null,
            type: 'SEM_EVIDÊNCIA'
          });
          continue;
        }
      }

      // Validar user ↔ inferredStoreId (mesmo para produto)
      if (userId) {
        const userStores = userStoresMap.get(userId) || [];
        if (
          userStores.length > 0 &&
          !userStores.includes(inferredStoreId)
        ) {
          plan.classificationCounts.userStoreConflict++;
          plan.blockers.push({
            documentId: docId,
            productId: productId || null,
            userId: userId || null,
            inferredStoreId,
            userStores,
            type: 'USER_STORE_CONFLICT'
          });
          continue;
        }
      }

      // Validar storeId inferida
      if (
        !inferredStoreId ||
        !validStoreIds.has(inferredStoreId)
      ) {
        plan.classificationCounts.noEvidence++;
        plan.blockers.push({
          documentId: docId,
          productId: productId || null,
          userId: userId || null,
          type: 'SEM_EVIDÊNCIA'
        });
        continue;
      }

      // Criar candidato aprovado
      const candidate = {
        documentId: docId,
        productId: productId || null,
        userId: userId || null,
        currentStoreId: null,
        inferredStoreId,
        method,
        classification,
        updatePayload: {
          storeId: inferredStoreId
        }
      };

      plan.candidates.push(candidate);
      plan.migrationCandidates++;

      // Incrementar contadores de classificação
      if (classification === 'DETERMINÍSTICO_PRODUCT') {
        plan.classificationCounts.deterministicProduct++;
      } else if (classification === 'DETERMINÍSTICO_USER_SINGLE_STORE') {
        plan.classificationCounts.deterministicUserSingleStore++;
      }

      // Distribuição por inferredStoreId
      if (!plan.inferredStoreDistribution[inferredStoreId]) {
        plan.inferredStoreDistribution[inferredStoreId] = 0;
      }
      plan.inferredStoreDistribution[inferredStoreId]++;
    }

    // Validar documentIds únicos
    const candidateIds = plan.candidates.map(c => c.documentId);
    const uniqueCandidateIds = new Set(candidateIds);
    plan.validation.uniqueCandidateDocumentIds = uniqueCandidateIds.size === candidateIds.length;

    // Validar inferredStoreIds
    plan.validation.allCandidateStoreIdsValid = plan.candidates.every(candidate =>
      typeof candidate.inferredStoreId === 'string' &&
      candidate.inferredStoreId.trim() !== '' &&
      validStoreIds.has(candidate.inferredStoreId)
    );

    // Validar blockers
    plan.validation.zeroBlockers = plan.blockers.length === 0;

    // Critério correto de safeToExecute
    plan.validation.safeToExecute =
      DRY_RUN === true &&
      ALLOW_WRITES === false &&
      plan.validation.allCandidateStoreIdsValid &&
      plan.validation.uniqueCandidateDocumentIds &&
      plan.validation.zeroBlockers;

    // Resultado final
    plan.result = plan.validation.safeToExecute
      ? 'DRY_RUN_MIGRATION_APPROVED'
      : 'DRY_RUN_MIGRATION_BLOCKED';

    log(`  ✓ Candidatos de migração: ${plan.migrationCandidates}`);
    log(`  ✓ Já com storeId válido: ${plan.alreadyValid}`);
    log(`  ✗ Blockers encontrados: ${plan.blockers.length}`);
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
  console.log('Total atual:');
  console.log(`  ${migrationPlan.totalDocuments}`);
  console.log('');

  console.log('Already valid:');
  console.log(`  ${migrationPlan.alreadyValid}`);
  console.log('');

  console.log('Migration candidates:');
  console.log(`  ${migrationPlan.migrationCandidates}`);
  console.log('');

  console.log('DETERMINÍSTICO_PRODUCT:');
  console.log(`  ${migrationPlan.classificationCounts.deterministicProduct}`);
  console.log('');

  console.log('DETERMINÍSTICO_USER_SINGLE_STORE:');
  console.log(`  ${migrationPlan.classificationCounts.deterministicUserSingleStore}`);
  console.log('');

  console.log('AMBÍGUO:');
  console.log(`  ${migrationPlan.classificationCounts.ambiguous}`);
  console.log('');

  console.log('SEM_EVIDÊNCIA:');
  console.log(`  ${migrationPlan.classificationCounts.noEvidence}`);
  console.log('');

  console.log('USER_STORE_CONFLICT:');
  console.log(`  ${migrationPlan.classificationCounts.userStoreConflict}`);
  console.log('');

  console.log('BLOCKING_UNEXPECTED_STOREID_STATE:');
  console.log(`  ${migrationPlan.classificationCounts.unexpectedStoreIdState}`);
  console.log('');

  console.log('Blockers:');
  console.log(`  ${migrationPlan.blockers.length}`);
  console.log('');

  if (Object.keys(migrationPlan.inferredStoreDistribution).length > 0) {
    console.log('Distribuição por inferredStoreId:');
    Object.entries(migrationPlan.inferredStoreDistribution).forEach(([storeId, count]) => {
      console.log(`  ${storeId}: ${count}`);
    });
    console.log('');
  }

  console.log('VALIDAÇÃO:');
  console.log('==========');
  console.log(`  ✓ Todos os storeIds válidos: ${migrationPlan.validation.allCandidateStoreIdsValid ? 'SIM' : 'NÃO'}`);
  console.log(`  ✓ DocumentIds únicos: ${migrationPlan.validation.uniqueCandidateDocumentIds ? 'SIM' : 'NÃO'}`);
  console.log(`  ✓ Zero blockers: ${migrationPlan.validation.zeroBlockers ? 'SIM' : 'NÃO'}`);
  console.log('');

  console.log('safeToExecute:');
  console.log(`  ${migrationPlan.validation.safeToExecute}`);
  console.log('');

  console.log('Resultado:');
  console.log(`  ${migrationPlan.result}`);
  console.log('');

  console.log('RESULTADO FINAL:');
  console.log('================');
  console.log(`  ✓ Nenhum documento Firestore foi alterado (DRY-RUN).`);
  console.log(`  ✓ Plano de migração gerado e validado.`);
  console.log(`  ✓ Ficheiro de plano salvo: ${MIGRATION_PLAN_FILE}`);
  console.log('');

  if (migrationPlan.validation.safeToExecute) {
    console.log('✅ DRY-RUN APROVADO — Migração segura para executar');
  } else {
    console.log('❌ DRY-RUN BLOQUEADO — Revisar blockers acima');
  }
  console.log('');
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
