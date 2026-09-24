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
const DRY_RUN_PLAN_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-migration-dry-run.json'
);
const MIGRATION_LOG_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-migration-execution.log'
);
const BATCH_SIZE = 10; // documentos por transação

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

    return db;
  } catch (err) {
    logError('Falha ao inicializar Firebase:', err.message);
    throw new Error(`Falha ao inicializar Firebase: ${err.message}`);
  }
}

// ============================================================
// VALIDAR PLANO DE DRY-RUN
// ============================================================

function loadDryRunPlan() {
  try {
    if (!fs.existsSync(DRY_RUN_PLAN_FILE)) {
      throw new Error(`Ficheiro de plano não encontrado: ${DRY_RUN_PLAN_FILE}`);
    }

    const content = fs.readFileSync(DRY_RUN_PLAN_FILE, 'utf8');
    const plan = JSON.parse(content);

    log(`Plano de dry-run carregado: ${plan.candidates.length} candidatos`);

    // Validar plano
    if (!plan.validation.safeToExecute) {
      throw new Error('Plano não foi aprovado para execução (safeToExecute = false)');
    }

    if (plan.result !== 'DRY_RUN_MIGRATION_APPROVED') {
      throw new Error(`Plano não está aprovado: ${plan.result}`);
    }

    if (plan.blockers.length > 0) {
      throw new Error(`Plano contém ${plan.blockers.length} blockers`);
    }

    log(`✓ Plano validado: ${plan.candidates.length} documentos para migrar`);
    return plan;
  } catch (err) {
    logError('Falha ao carregar plano de dry-run:', err.message);
    throw err;
  }
}

// ============================================================
// EXECUTAR MIGRAÇÃO EM LOTES
// ============================================================

async function executeMigration(plan) {
  log('Iniciando migração REAL de storeId em priceHistory...');

  const candidates = plan.candidates;
  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  // Processar em lotes
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batchCandidates = candidates.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    try {
      log(`Processando lote ${batchNumber}/${Math.ceil(candidates.length / BATCH_SIZE)}...`);

      // Iniciar transação para o lote
      const results = await db.runTransaction(async (transaction) => {
        const batchResults = [];

        for (const candidate of batchCandidates) {
          const docRef = db.collection('priceHistory').doc(candidate.documentId);
          const docSnap = await transaction.get(docRef);

          // Validar que documento existe
          if (!docSnap.exists) {
            batchResults.push({
              documentId: candidate.documentId,
              success: false,
              error: 'Documento não encontrado'
            });
            continue;
          }

          const docData = docSnap.data();

          // Validar que storeId não existe ou está vazio (não sobrescrever)
          if (docData.storeId && docData.storeId.trim() !== '') {
            batchResults.push({
              documentId: candidate.documentId,
              success: false,
              error: 'storeId já existe (não sobrescrever)'
            });
            continue;
          }

          // Executar update
          transaction.update(docRef, {
            storeId: candidate.inferredStoreId
          });

          batchResults.push({
            documentId: candidate.documentId,
            success: true,
            inferredStoreId: candidate.inferredStoreId,
            method: candidate.method
          });
        }

        return batchResults;
      });

      // Registar resultados do lote
      results.forEach(result => {
        if (result.success) {
          successCount++;
          log(`  ✓ ${result.documentId}: ${result.method} → ${result.inferredStoreId}`);
        } else {
          failureCount++;
          failures.push(result);
          logError(`  ✗ ${result.documentId}: ${result.error}`);
        }
      });

    } catch (err) {
      logError(`Falha ao processar lote ${batchNumber}:`, err.message);
      // Marcar todos os documentos do lote como falhados
      batchCandidates.forEach(candidate => {
        failureCount++;
        failures.push({
          documentId: candidate.documentId,
          success: false,
          error: `Falha na transação: ${err.message}`
        });
      });
    }
  }

  log(`Migração concluída: ${successCount} sucesso, ${failureCount} falha`);

  return {
    successCount,
    failureCount,
    totalCandidates: candidates.length,
    failures,
    success: failureCount === 0
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('PC-02B.3D.2 — EXECUTOR SEGURO: MIGRAÇÃO REAL DE priceHistory');
  console.log('===========================================================');
  console.log('');

  // Carregar e validar plano de dry-run
  const plan = loadDryRunPlan();
  console.log('');

  // Inicializar Firebase
  await initFirebase();
  console.log('');

  // Executar migração
  const result = await executeMigration(plan);
  console.log('');

  // Resumo final
  console.log('RESUMO DA MIGRAÇÃO:');
  console.log('===================');
  console.log(`  Total de candidatos: ${result.totalCandidates}`);
  console.log(`  Sucesso: ${result.successCount}`);
  console.log(`  Falhas: ${result.failureCount}`);
  console.log('');

  if (result.failures.length > 0) {
    console.log('FALHAS DETECTADAS:');
    console.log('==================');
    result.failures.forEach(f => {
      console.log(`  ${f.documentId}: ${f.error}`);
    });
    console.log('');
  }

  console.log('RESULTADO FINAL:');
  console.log('================');
  console.log(`  Migração ${result.success ? '✅ SUCESSO' : '❌ COM FALHAS'}`);
  console.log(`  Ficheiro de log: ${MIGRATION_LOG_FILE}`);
  console.log('');

  if (!result.success) {
    process.exit(1);
  }
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
