#!/usr/bin/env node

/**
 * PC-02B.3D.2: Executor Seguro da Migração Real de storeId em priceHistory
 *
 * Objetivo: Executar a migração de `storeId` nos documentos de priceHistory
 * que foram aprovados pela auditoria de dry-run.
 *
 * Segurança:
 * - Valida produto de dry-run antes de executar
 * - Transações por lote (batch) com validação
 * - Apenas ADICIONA storeId (nunca sobrescreve)
 * - Logging detalhado de cada operação
 * - Usa ADC nativa do Firebase Admin SDK
 * - Valida projectId === "precocerto-cc04a"
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
const EXECUTE_MIGRATION = false; // BLOQUEADO: só ativar após aprovação formal do dry-run
const ALLOW_WRITES = false; // NUNCA alterar para true neste script
const DRY_RUN_PLAN_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-migration-dry-run.json'
);
const MIGRATION_LOG_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-migration-execution.log'
);
const MIGRATION_EXECUTION_REPORT_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-migration-execution.json'
);

function log(...args) {
  const message = `[MIGRATE-EXECUTE] ${new Date().toISOString()} ${args.join(' ')}`;
  console.log(message);
  try {
    fs.appendFileSync(MIGRATION_LOG_FILE, message + '\n', 'utf8');
  } catch (err) {
    console.error('[LOG-ERROR]', err.message);
  }
}

function logError(...args) {
  const message = `[MIGRATE-EXECUTE-ERROR] ${new Date().toISOString()} ${args.join(' ')}`;
  console.error(message);
  try {
    fs.appendFileSync(MIGRATION_LOG_FILE, message + '\n', 'utf8');
  } catch (err) {
    console.error('[LOG-ERROR]', err.message);
  }
}

function assertExecutionAuthorized() {
  if (EXECUTE_MIGRATION !== true || ALLOW_WRITES !== true) {
    throw new Error(
      '[SECURITY] Migração real NÃO autorizada. ' +
      'EXECUTE_MIGRATION=true e ALLOW_WRITES=true são obrigatórios. ' +
      'Esta função será chamada apenas imediatamente antes da operação real de commit.'
    );
  }
}

// ============================================================
// BASELINE APROVADO
// ============================================================

const APPROVED_BASELINE = Object.freeze({
  totalDocuments: 60,
  alreadyValid: 0,
  migrationCandidates: 60,
  deterministicProduct: 53,
  deterministicUserSingleStore: 7,
  ambiguous: 0,
  noEvidence: 0,
  userStoreConflict: 0,
  unexpectedStoreIdState: 0
});

// ============================================================
// ESTRUTURA DE ANÁLISE
// ============================================================

const analysis = Object.create(null);

function initAnalysis() {
  return {
    totalDocuments: 0,
    alreadyValid: 0,
    migrationCandidates: 0,

    deterministicProduct: 0,
    deterministicUserSingleStore: 0,

    ambiguous: 0,
    noEvidence: 0,
    userStoreConflict: 0,
    unexpectedStoreIdState: 0,

    candidates: [],
    blockers: [],
    inferredStoreDistribution: {}
  };
}

// ============================================================
// INICIALIZAÇÃO FIRESTORE
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

    // Validar que o projeto é o correto (PASSO 8)
    if (app.options.projectId !== PRODUCTION_PROJECT_ID) {
      throw new Error(
        `[SECURITY] ProjectId mismatch: esperado "${PRODUCTION_PROJECT_ID}", ` +
        `obtido "${app.options.projectId}". Operação bloqueada.`
      );
    }

    log(`Firestore inicializado para projeto: ${PRODUCTION_PROJECT_ID}`);
    log('Autenticação via: ADC (Application Default Credentials)');

    return db;
  } catch (err) {
    logError('Falha ao inicializar Firebase:', err.message);
    throw new Error(`Falha ao inicializar Firebase: ${err.message}`);
  }
}

// ============================================================
// CARREGAR REFERÊNCIAS ATUAIS (READ-ONLY)
// ============================================================

async function loadCurrentReferences() {
  log('Carregando referências atuais de Firestore...');

  // PASSO 13 — STORES
  const storesSnapshot = await db.collection('stores').get();
  const validStoreIds = new Set(storesSnapshot.docs.map(d => d.id));

  if (validStoreIds.size === 0) {
    throw new Error('[VALIDATION] Nenhuma store encontrada. Estado inválido.');
  }

  log(`  ✓ Stores carregadas: ${validStoreIds.size}`);

  // PASSO 14 — PRODUCTS
  const productsSnapshot = await db.collection('products').get();
  const productStoreMap = new Map();

  productsSnapshot.docs.forEach(d => {
    const storeId = d.data().storeId;
    if (
      storeId &&
      typeof storeId === 'string' &&
      storeId.trim() !== '' &&
      validStoreIds.has(storeId)
    ) {
      productStoreMap.set(d.id, storeId);
    }
  });

  log(`  ✓ Products com storeId válido: ${productStoreMap.size} / ${productsSnapshot.size}`);

  // PASSO 15 — USERS
  const usersSnapshot = await db.collection('users').get();
  const userStoresMap = new Map();

  usersSnapshot.docs.forEach(d => {
    const lojas = d.data().lojas;
    let validLojas = [];

    if (lojas && Array.isArray(lojas)) {
      validLojas = Array.from(
        new Set(
          lojas
            .filter(loja => loja && typeof loja === 'string' && loja.trim() !== '')
            .map(loja => loja.trim())
        )
      ).filter(loja => validStoreIds.has(loja));
    }

    userStoresMap.set(d.id, validLojas);
  });

  log(`  ✓ Users carregados: ${usersSnapshot.size}`);

  return {
    validStoreIds,
    productStoreMap,
    userStoresMap
  };
}

// ============================================================
// ANALISAR priceHistory ATUAL (BLOCO 2/4)
// ============================================================

async function analyzeCurrentPriceHistory(references) {
  log('Analisando priceHistory atual (BLOCO 2/4)...');

  const { validStoreIds, productStoreMap, userStoresMap } = references;

  // PASSO 16 — LER priceHistory ATUAL
  const priceHistorySnapshot = await db.collection('priceHistory').get();
  const currentAnalysis = initAnalysis();
  currentAnalysis.totalDocuments = priceHistorySnapshot.size;

  log(`  Documentos priceHistory encontrados: ${currentAnalysis.totalDocuments}`);

  // Processar cada documento
  priceHistorySnapshot.docs.forEach(doc => {
    // PASSO 17 — EXTRAIR CAMPOS CANÓNICOS
    const data = doc.data();
    const documentId = doc.id;
    const productId = data.productId;
    const userId = data.userId;

    const hasStoreIdField = Object.prototype.hasOwnProperty.call(data, 'storeId');
    const currentStoreId = data.storeId;

    const isCurrentStoreIdValid =
      hasStoreIdField &&
      typeof currentStoreId === 'string' &&
      currentStoreId.trim() !== '' &&
      validStoreIds.has(currentStoreId);

    // PASSO 18 — ALREADY_VALID
    if (isCurrentStoreIdValid === true) {
      currentAnalysis.alreadyValid++;
      return;
    }

    // PASSO 19 — storeId EXISTENTE MAS INVÁLIDO
    if (hasStoreIdField === true && isCurrentStoreIdValid === false) {
      currentAnalysis.unexpectedStoreIdState++;
      currentAnalysis.blockers.push({
        documentId,
        productId: productId || null,
        userId: userId || null,
        currentStoreId: currentStoreId ?? null,
        type: 'BLOCKING_UNEXPECTED_STOREID_STATE'
      });
      return;
    }

    // PASSO 20 — SOMENTE CAMPO AUSENTE PODE SER CANDIDATO
    if (hasStoreIdField === false) {
      let inferredStoreId = null;
      let method = null;
      let classification = null;

      // PASSO 21 — INFERÊNCIA PRIORIDADE 1: productId
      if (productId && productStoreMap.has(productId)) {
        inferredStoreId = productStoreMap.get(productId);
        method = 'productId';
        classification = 'DETERMINÍSTICO_PRODUCT';
      }
      // PASSO 22 — INFERÊNCIA PRIORIDADE 2: USER SINGLE STORE
      else {
        const userStores = userId ? userStoresMap.get(userId) || [] : [];

        if (userStores.length === 1) {
          inferredStoreId = userStores[0];
          method = 'userId-single-store';
          classification = 'DETERMINÍSTICO_USER_SINGLE_STORE';
        }
        // PASSO 23 — USER MULTISTORE = AMBÍGUO
        else if (userStores.length > 1) {
          currentAnalysis.ambiguous++;
          currentAnalysis.blockers.push({
            documentId,
            productId: productId || null,
            userId: userId || null,
            type: 'AMBÍGUO'
          });
          return;
        }
        // PASSO 24 — ZERO STORES = SEM_EVIDÊNCIA
        else if (userStores.length === 0) {
          currentAnalysis.noEvidence++;
          currentAnalysis.blockers.push({
            documentId,
            productId: productId || null,
            userId: userId || null,
            type: 'SEM_EVIDÊNCIA'
          });
          return;
        }
      }

      // PASSO 25 — VALIDAR inferredStoreId
      if (
        typeof inferredStoreId !== 'string' ||
        inferredStoreId.trim() === '' ||
        !validStoreIds.has(inferredStoreId)
      ) {
        currentAnalysis.noEvidence++;
        currentAnalysis.blockers.push({
          documentId,
          productId: productId || null,
          userId: userId || null,
          type: 'SEM_EVIDÊNCIA'
        });
        return;
      }

      // PASSO 26 — VALIDAR user ↔ inferredStoreId
      const currentUserStores = userId ? userStoresMap.get(userId) || [] : [];

      if (
        userId &&
        currentUserStores.length > 0 &&
        !currentUserStores.includes(inferredStoreId)
      ) {
        currentAnalysis.userStoreConflict++;
        currentAnalysis.blockers.push({
          documentId,
          productId: productId || null,
          userId: userId || null,
          inferredStoreId,
          userStores: currentUserStores,
          type: 'USER_STORE_CONFLICT'
        });
        return;
      }

      // PASSO 27 — CRIAR CANDIDATO APROVADO
      const candidate = {
        documentId,
        productId: productId || null,
        userId: userId || null,
        inferredStoreId,
        method,
        classification
      };

      currentAnalysis.candidates.push(candidate);
      currentAnalysis.migrationCandidates++;

      // PASSO 28 — CONTADORES DETERMINÍSTICOS
      if (classification === 'DETERMINÍSTICO_PRODUCT') {
        currentAnalysis.deterministicProduct++;
      }
      if (classification === 'DETERMINÍSTICO_USER_SINGLE_STORE') {
        currentAnalysis.deterministicUserSingleStore++;
      }

      // PASSO 29 — DISTRIBUIÇÃO POR inferredStoreId
      currentAnalysis.inferredStoreDistribution[inferredStoreId] =
        (currentAnalysis.inferredStoreDistribution[inferredStoreId] || 0) + 1;
    }
  });

  // PASSO 30 — VALIDAR documentIds ÚNICOS
  const candidateIds = currentAnalysis.candidates.map(c => c.documentId);
  const uniqueCandidateIds = new Set(candidateIds);
  const uniqueCandidateDocumentIds = uniqueCandidateIds.size === candidateIds.length;

  // PASSO 31 — VALIDAR TODOS OS inferredStoreIds
  const allCandidateStoreIdsValid = currentAnalysis.candidates.every(
    candidate =>
      typeof candidate.inferredStoreId === 'string' &&
      candidate.inferredStoreId.trim() !== '' &&
      validStoreIds.has(candidate.inferredStoreId)
  );

  // PASSO 32 — ZERO BLOCKERS
  const zeroBlockers = currentAnalysis.blockers.length === 0;

  // PASSO 33 — IDEMPOTÊNCIA
  let resultState = null;
  if (
    currentAnalysis.migrationCandidates === 0 &&
    currentAnalysis.blockers.length === 0 &&
    currentAnalysis.totalDocuments > 0 &&
    currentAnalysis.alreadyValid === currentAnalysis.totalDocuments
  ) {
    resultState = 'NOTHING_TO_MIGRATE';
  }

  // PASSO 34 — BASELINE GUARD
  let baselineMatches = false;
  if (currentAnalysis.migrationCandidates > 0) {
    baselineMatches =
      currentAnalysis.totalDocuments === APPROVED_BASELINE.totalDocuments &&
      currentAnalysis.alreadyValid === APPROVED_BASELINE.alreadyValid &&
      currentAnalysis.migrationCandidates === APPROVED_BASELINE.migrationCandidates &&
      currentAnalysis.deterministicProduct === APPROVED_BASELINE.deterministicProduct &&
      currentAnalysis.deterministicUserSingleStore === APPROVED_BASELINE.deterministicUserSingleStore &&
      currentAnalysis.ambiguous === APPROVED_BASELINE.ambiguous &&
      currentAnalysis.noEvidence === APPROVED_BASELINE.noEvidence &&
      currentAnalysis.userStoreConflict === APPROVED_BASELINE.userStoreConflict &&
      currentAnalysis.unexpectedStoreIdState === APPROVED_BASELINE.unexpectedStoreIdState;
  }

  // PASSO 35 — BASELINE MUDOU
  if (currentAnalysis.migrationCandidates > 0 && baselineMatches === false) {
    resultState = 'BASELINE_CHANGED_REVIEW_REQUIRED';
  }

  // PASSO 36 — BLOQUEIO GLOBAL
  if (zeroBlockers === false || uniqueCandidateDocumentIds === false || allCandidateStoreIdsValid === false) {
    resultState = 'MIGRATION_BLOCKED';
  }

  // PASSO 37 — RESULTADO INTERMÉDIO
  if (resultState === null && currentAnalysis.migrationCandidates > 0 && zeroBlockers === true && baselineMatches === true && uniqueCandidateDocumentIds === true && allCandidateStoreIdsValid === true) {
    resultState = 'READY_FOR_PRECOMMIT';
  }

  log(`  ✓ Análise concluída`);
  log(`    Estado: ${resultState}`);
  log(`    Candidatos: ${currentAnalysis.migrationCandidates}`);
  log(`    Blockers: ${currentAnalysis.blockers.length}`);

  return {
    analysis: currentAnalysis,
    validation: {
      uniqueCandidateDocumentIds,
      allCandidateStoreIdsValid,
      zeroBlockers,
      baselineMatches
    },
    resultState
  };
}

// ============================================================
// SALVAR RELATÓRIO DE EXECUÇÃO (BLOCO 4/4)
// ============================================================

function saveExecutionReport(report) {
  try {
    fs.writeFileSync(
      MIGRATION_EXECUTION_REPORT_FILE,
      JSON.stringify(report, null, 2),
      'utf8'
    );
    log(`✓ Relatório salvo: ${MIGRATION_EXECUTION_REPORT_FILE}`);
  } catch (err) {
    logError(`Falha ao salvar relatório: ${err.message}`);
  }
}

// ============================================================
// VALIDAR PLANO DE DRY-RUN (LEGADO)
// ============================================================

function loadDryRunPlan() {
  try {
    if (!fs.existsSync(DRY_RUN_PLAN_FILE)) {
      throw new Error(`Ficheiro de plano não encontrado: ${DRY_RUN_PLAN_FILE}`);
    }

    const content = fs.readFileSync(DRY_RUN_PLAN_FILE, 'utf8');
    const plan = JSON.parse(content);

    log(`Plano de dry-run carregado: ${plan.candidates.length} candidatos`);

    // Validar plano com todos os critérios
    if (!plan.validation) {
      throw new Error('Plano inválido: campo "validation" ausente');
    }

    if (!plan.validation.safeToExecute) {
      throw new Error('Plano não foi aprovado para execução (safeToExecute = false)');
    }

    if (plan.result !== 'DRY_RUN_MIGRATION_APPROVED') {
      throw new Error(`Plano não está aprovado: resultado = "${plan.result}"`);
    }

    if (!plan.validation.allCandidateStoreIdsValid) {
      throw new Error('Plano contém storeIds inválidos (allCandidateStoreIdsValid = false)');
    }

    if (!plan.validation.uniqueCandidateDocumentIds) {
      throw new Error('Plano contém documentIds duplicados (uniqueCandidateDocumentIds = false)');
    }

    if (!plan.validation.zeroBlockers) {
      throw new Error(`Plano contém ${plan.blockers.length} blockers (zeroBlockers = false)`);
    }

    if (plan.blockers.length > 0) {
      throw new Error(`[SEGURANÇA] Plano contém ${plan.blockers.length} blockers, bloqueado`);
    }

    log(`✓ Plano validado: ${plan.candidates.length} documentos para migrar`);
    log(`✓ Validation completo: safeToExecute=true, zeroBlockers=true, storeIds válidos`);
    return plan;
  } catch (err) {
    logError('Falha ao carregar plano de dry-run:', err.message);
    throw err;
  }
}

// ============================================================
// PRECOMMIT — VALIDAR TODOS OS CANDIDATOS (BLOCO 3/4)
// ============================================================

async function precommitValidateCandidates(candidates, validStoreIds) {
  log('Iniciando precommit global (BLOCO 3/4)...');
  log(`  Relendo ${candidates.length} candidatos...`);

  const precommitCandidates = [];
  const failures = [];
  let precommitStateValid = true;

  for (const candidate of candidates) {
    const docRef = db.collection('priceHistory').doc(candidate.documentId);
    const docSnap = await docRef.get();

    // PASSO 41 — DOCUMENTO PRECISA EXISTIR
    if (!docSnap.exists) {
      failures.push({
        documentId: candidate.documentId,
        type: 'PRECOMMIT_STATE_CHANGED',
        reason: 'DOCUMENT_NOT_FOUND'
      });
      precommitStateValid = false;
      continue;
    }

    const currentData = docSnap.data();

    // PASSO 42 — storeId PRECISA CONTINUAR AUSENTE
    const hasStoreIdField = Object.prototype.hasOwnProperty.call(currentData, 'storeId');
    if (hasStoreIdField === true) {
      failures.push({
        documentId: candidate.documentId,
        type: 'PRECOMMIT_STATE_CHANGED',
        reason: 'STORE_ID_FIELD_NOW_EXISTS'
      });
      precommitStateValid = false;
      continue;
    }

    // PASSO 43 — inferredStoreId CONTINUA VÁLIDO
    if (
      typeof candidate.inferredStoreId !== 'string' ||
      candidate.inferredStoreId.trim() === '' ||
      !validStoreIds.has(candidate.inferredStoreId)
    ) {
      failures.push({
        documentId: candidate.documentId,
        type: 'PRECOMMIT_STATE_CHANGED',
        reason: 'INFERRED_STORE_ID_NO_LONGER_VALID'
      });
      precommitStateValid = false;
      continue;
    }

    // PASSO 44 — CAPTURAR updateTime
    if (!docSnap.updateTime) {
      failures.push({
        documentId: candidate.documentId,
        type: 'PRECOMMIT_STATE_CHANGED',
        reason: 'UPDATE_TIME_MISSING'
      });
      precommitStateValid = false;
      continue;
    }

    precommitCandidates.push({
      documentId: candidate.documentId,
      inferredStoreId: candidate.inferredStoreId,
      updateTime: docSnap.updateTime,
      method: candidate.method,
      classification: candidate.classification
    });
  }

  // PASSO 45 — VALIDAR IDs ÚNICOS NOVAMENTE NO PRECOMMIT
  const precommitIds = precommitCandidates.map(c => c.documentId);
  const uniquePrecommitIds = new Set(precommitIds);

  if (uniquePrecommitIds.size !== precommitIds.length) {
    failures.push({
      type: 'PRECOMMIT_STATE_CHANGED',
      reason: 'DUPLICATE_DOCUMENT_ID'
    });
    precommitStateValid = false;
  }

  log(`  ✓ Precommit validado: ${precommitCandidates.length} candidatos aprovados`);
  if (failures.length > 0) {
    log(`  ⚠ Precommit falhas: ${failures.length}`);
  }

  return {
    valid: precommitStateValid,
    candidates: precommitCandidates,
    failures
  };
}

// ============================================================
// PREPARAR SINGLE writeBatch (BLOCO 3/4)
// ============================================================

function buildMigrationBatch(precommitCandidates) {
  log('Preparando single writeBatch...');

  const batch = db.batch();

  for (const candidate of precommitCandidates) {
    const docRef = db.collection('priceHistory').doc(candidate.documentId);

    // PASSO 52 — PRECONDITION lastUpdateTime
    batch.update(
      docRef,
      { storeId: candidate.inferredStoreId },
      { lastUpdateTime: candidate.updateTime }
    );
  }

  log(`  ✓ WriteBatch preparado: ${precommitCandidates.length} operações`);
  log(`  ⚠ Batch NÃO foi executado neste bloco (BLOCO 3/4)`);

  return batch;
}

// ============================================================
// CONSTRUIR RELATÓRIO EXECUTIVO
// ============================================================

function buildExecutionReport(
  analysis,
  validation,
  precommitStateValid,
  finalResult,
  finalError,
  resultState
) {
  const safeAnalysis = analysis || {
    totalDocuments: 0,
    alreadyValid: 0,
    migrationCandidates: 0,
    deterministicProduct: 0,
    deterministicUserSingleStore: 0,
    ambiguous: 0,
    noEvidence: 0,
    userStoreConflict: 0,
    unexpectedStoreIdState: 0,
    blockers: [],
    inferredStoreDistribution: {}
  };

  const safeValidation = validation || {
    zeroBlockers: false,
    baselineMatches: false,
    allCandidateStoreIdsValid: false,
    uniqueCandidateDocumentIds: false
  };

  return {
    timestamp: new Date().toISOString(),
    projectId: PRODUCTION_PROJECT_ID,
    executeMigration: EXECUTE_MIGRATION,
    allowWrites: ALLOW_WRITES,

    summary: {
      totalDocuments: safeAnalysis.totalDocuments,
      alreadyValid: safeAnalysis.alreadyValid,
      migrationCandidates: safeAnalysis.migrationCandidates,
      deterministicProduct: safeAnalysis.deterministicProduct,
      deterministicUserSingleStore: safeAnalysis.deterministicUserSingleStore,
      ambiguous: safeAnalysis.ambiguous,
      noEvidence: safeAnalysis.noEvidence,
      userStoreConflict: safeAnalysis.userStoreConflict,
      unexpectedStoreIdState: safeAnalysis.unexpectedStoreIdState
    },

    inferredStoreDistribution: safeAnalysis.inferredStoreDistribution || {},

    validation: {
      zeroBlockers: safeValidation.zeroBlockers,
      baselineMatches: safeValidation.baselineMatches,
      allCandidateStoreIdsValid: safeValidation.allCandidateStoreIdsValid,
      uniqueCandidateDocumentIds: safeValidation.uniqueCandidateDocumentIds,
      precommitStateValid: precommitStateValid,
      executionAuthorized: EXECUTE_MIGRATION === true && ALLOW_WRITES === true
    },

    blockers: safeAnalysis.blockers || [],

    result: finalResult || resultState || 'UNKNOWN',

    error: finalError
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('PC-02B.3D.2 — EXECUTOR SEGURO: MIGRAÇÃO REAL DE priceHistory');
  console.log('BLOCO 4/4 — Autorização Final + Resultados + Relatório');
  console.log('===========================================================');
  console.log('');

  let finalResult = null;
  let finalError = null;
  let precommitStateValid = false;
  let currentAnalysis = null;
  let currentValidation = null;

  try {
    // PASSO 61 — Confirmar flags bloqueadas
    log(`Projeto: ${PRODUCTION_PROJECT_ID}`);
    log(`EXECUTE_MIGRATION: ${EXECUTE_MIGRATION}`);
    log(`ALLOW_WRITES: ${ALLOW_WRITES}`);
    console.log('');

    // Inicializar Firebase
    log('Inicializando Firestore...');
    await initFirebase();
    console.log('');

    // Carregar referências atuais
    log('Carregando estado atual das referências...');
    const references = await loadCurrentReferences();
    console.log('');

    // BLOCO 2/4 — Analisar priceHistory
    const analysisResult = await analyzeCurrentPriceHistory(references);
    const { analysis, validation, resultState } = analysisResult;
    currentAnalysis = analysis;
    currentValidation = validation;

    console.log('');
    log('Análise de priceHistory (BLOCO 2/4):');
    log(`  Total documentos: ${analysis.totalDocuments}`);
    log(`  Já válidos: ${analysis.alreadyValid}`);
    log(`  Candidatos à migração: ${analysis.migrationCandidates}`);
    log(`  Determinístico (productId): ${analysis.deterministicProduct}`);
    log(`  Determinístico (user-single): ${analysis.deterministicUserSingleStore}`);
    log(`  Bloqueadores: ${analysis.blockers.length}`);
    console.log('');

    // PASSO 71.4 — Se NOTHING_TO_MIGRATE, terminar
    if (resultState === 'NOTHING_TO_MIGRATE') {
      finalResult = 'NOTHING_TO_MIGRATE';
      console.log('');
      log('✓ Nenhuma migração necessária (todos os documentos já estão válidos)');
      console.log('');
    }
    // PASSO 71.5 — Se bloqueadores ou integridade inválida
    else if (resultState === 'MIGRATION_BLOCKED') {
      finalResult = 'MIGRATION_BLOCKED';
      console.log('');
      log('✗ Migração bloqueada por integridade inválida');
      console.log('');
    }
    // PASSO 71.6 — Se baseline mudou
    else if (resultState === 'BASELINE_CHANGED_REVIEW_REQUIRED') {
      finalResult = 'BASELINE_CHANGED_REVIEW_REQUIRED';
      console.log('');
      log('⚠ Baseline mudou desde aprovação — revisão necessária');
      console.log('');
    }
    // PASSO 71.7-9 — Executar precommit
    else if (resultState === 'READY_FOR_PRECOMMIT' && analysis.migrationCandidates > 0) {
      console.log('');
      log('Executando precommit global (BLOCO 3/4)...');
      console.log('');

      const precommitResult = await precommitValidateCandidates(
        analysis.candidates,
        references.validStoreIds
      );

      console.log('');
      log(`Precommit: ${precommitResult.valid ? 'aprovado' : 'falhou'}`);
      log(`Candidatos aprovados: ${precommitResult.candidates.length}`);
      log(`Falhas precommit: ${precommitResult.failures.length}`);
      console.log('');

      // PASSO 71.8 — Se precommit falha
      if (precommitResult.valid === false) {
        precommitStateValid = false;
        finalResult = 'PRECOMMIT_STATE_CHANGED';
        console.log('');
        log('⚠ Precommit falhou — estado mudou desde análise');
        console.log('');
      }
      // PASSO 71.9 — Calcular executionAuthorized
      else {
        precommitStateValid = true;
        const executionAuthorized = EXECUTE_MIGRATION === true && ALLOW_WRITES === true;

        // PASSO 71.10 — Se não autorizado
        if (executionAuthorized === false) {
          finalResult = 'MIGRATION_READY_BUT_NOT_AUTHORIZED';
          console.log('');
          log('⚠ Migração pronta mas NÃO autorizada');
          log(`   EXECUTE_MIGRATION=${EXECUTE_MIGRATION}, ALLOW_WRITES=${ALLOW_WRITES}`);
          console.log('');
        }
        // PASSO 71.11-14 — Caminho autorizado
        else {
          console.log('');
          log('Preparando migração real...');
          console.log('');

          // PASSO 71.12 — Construir batch
          const migrationBatch = buildMigrationBatch(precommitResult.candidates);

          try {
            // PASSO 71.13 — Executar único batch.commit()
            log('Executando batch.commit()...');
            // PASSO 71.13.1 — Autorização IMEDIATAMENTE ANTES DO COMMIT
            assertExecutionAuthorized();
            await migrationBatch.commit();

            finalResult = 'MIGRATION_COMPLETED';
            console.log('');
            log('✅ Migração concluída com sucesso!');
            log(`   ${precommitResult.candidates.length} documentos atualizados`);
            console.log('');
          } catch (commitErr) {
            // PASSO 71.15 — Falha na escrita
            finalResult = 'MIGRATION_FAILED';
            finalError = {
              message: commitErr.message
            };
            console.log('');
            logError('❌ Falha ao executar batch.commit()');
            logError(`   ${commitErr.message}`);
            console.log('');
          }
        }
      }
    }

    // PASSO 73 — Criar estrutura de relatório
    const report = buildExecutionReport(
      analysis,
      validation,
      precommitStateValid,
      finalResult,
      finalError,
      resultState
    );

    // PASSO 74 — Salvar relatório JSON
    saveExecutionReport(report);

    // PASSO 76 — Output do console
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESUMO FINAL DA MIGRAÇÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    log(`Projeto: ${PRODUCTION_PROJECT_ID}`);
    log(`EXECUTE_MIGRATION: ${EXECUTE_MIGRATION}`);
    log(`ALLOW_WRITES: ${ALLOW_WRITES}`);
    console.log('');
    log(`Total de documentos: ${analysis.totalDocuments}`);
    log(`  Já válidos: ${analysis.alreadyValid}`);
    log(`  Candidatos à migração: ${analysis.migrationCandidates}`);
    log(`    - Determinístico (product): ${analysis.deterministicProduct}`);
    log(`    - Determinístico (user-single): ${analysis.deterministicUserSingleStore}`);
    log(`  Bloqueadores: ${analysis.blockers.length}`);
    log(`    - Ambíguo: ${analysis.ambiguous}`);
    log(`    - Sem evidência: ${analysis.noEvidence}`);
    log(`    - Conflito user/store: ${analysis.userStoreConflict}`);
    log(`    - storeId inválido: ${analysis.unexpectedStoreIdState}`);
    console.log('');
    log(`Zero blockers: ${validation.zeroBlockers ? 'SIM' : 'NÃO'}`);
    log(`Baseline match: ${validation.baselineMatches ? 'SIM' : 'NÃO'}`);
    log(`Candidate storeIds valid: ${validation.allCandidateStoreIdsValid ? 'SIM' : 'NÃO'}`);
    log(`Candidate IDs unique: ${validation.uniqueCandidateDocumentIds ? 'SIM' : 'NÃO'}`);
    log(`Precommit state valid: ${precommitStateValid ? 'SIM' : 'NÃO'}`);
    log(`Execution authorized: ${report.validation.executionAuthorized ? 'SIM' : 'NÃO'}`);
    console.log('');
    log(`Resultado: ${report.result}`);
    log(`Relatório: ${MIGRATION_EXECUTION_REPORT_FILE}`);
    console.log('');
  } catch (err) {
    finalError = {
      message: err.message
    };
    finalResult = 'MIGRATION_FAILED';
    logError('Erro fatal:', err.message);

    // Gerar e salvar relatório mesmo em caso de erro
    const errorReport = buildExecutionReport(
      currentAnalysis,
      currentValidation,
      precommitStateValid,
      finalResult,
      finalError,
      null
    );
    saveExecutionReport(errorReport);
  }
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
