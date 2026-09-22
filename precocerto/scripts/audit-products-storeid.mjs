#!/usr/bin/env node

/**
 * PC-02B: Auditoria READ-ONLY de Produtos Legados sem storeId
 *
 * Objetivo: Identificar produtos legados ou inconsistentes antes de migração multi-loja.
 *
 * Segurança:
 * - ESTRICTAMENTE READ-ONLY (sem setDoc, updateDoc, deleteDoc, batch write, etc.)
 * - Protegido contra escritas com const ALLOW_WRITES = false
 * - Validação de Project ID obrigatória
 * - Apenas lê /products, /users, /stores
 *
 * Não executar contra produção sem autenticação administrativa autorizada.
 */

import {
  initializeApp,
  cert,
  applicationDefault
} from 'firebase-admin/app';
import {
  getFirestore
} from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// PROTEÇÃO CONTRA ESCRITAS
// ============================================================

const ALLOW_WRITES = false;

function assertReadOnly(operation) {
  if (!ALLOW_WRITES && (operation === 'set' || operation === 'update' || operation === 'delete' || operation === 'batch' || operation === 'transaction')) {
    throw new Error(`[SECURITY] Operação de escrita '${operation}' bloqueada. Este é um auditor READ-ONLY.`);
  }
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';

function log(...args) {
  console.log('[AUDIT]', ...args);
}

function logError(...args) {
  console.error('[AUDIT-ERROR]', ...args);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

let db = null;

async function initFirebase() {
  try {
    let credential = null;
    let authSource = null;

    // Estratégia 1: Tentar Application Default Credentials (ADC)
    log('Tentando Application Default Credentials (ADC)...');
    try {
      credential = applicationDefault();
      authSource = 'ADC (Application Default Credentials)';
      log('ADC carregado com sucesso');
    } catch (adcError) {
      log('ADC não disponível, tentando credencial explícita...');

      // Estratégia 2: Tentar credencial de produção (FIREBASE_SERVICE_ACCOUNT_PRODUCTION)
      const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT_PRODUCTION ||
                                  process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!serviceAccountJSON) {
        log('AUTENTICAÇÃO ADMINISTRATIVA INDISPONÍVEL');
        log('Sem FIREBASE_SERVICE_ACCOUNT_PRODUCTION ou ADC no ambiente');
        return null;
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountJSON);
      } catch (err) {
        log('Credencial de ambiente não é JSON válido');
        return null;
      }

      const projectIdFromAuth = serviceAccount.project_id;
      if (projectIdFromAuth !== PRODUCTION_PROJECT_ID) {
        log(`Credencial pertence ao projeto: ${projectIdFromAuth}`);
        log(`Mas auditor requer projeto: ${PRODUCTION_PROJECT_ID}`);
        log('NÃO EXECUTADA — CREDENCIAL DE PRODUÇÃO INCORRECTA');
        return null;
      }

      credential = cert(serviceAccount);
      authSource = 'Credencial JSON de produção (FIREBASE_SERVICE_ACCOUNT_PRODUCTION)';
      log(`Credencial carregada: ${authSource}`);
    }

    const app = initializeApp({
      credential,
      projectId: PRODUCTION_PROJECT_ID,
    });

    db = getFirestore(app);

    log(`Firestore inicializado para projeto: ${PRODUCTION_PROJECT_ID}`);
    log(`Autenticação via: ${authSource}`);

    return db;
  } catch (err) {
    logError('Falha ao inicializar Firebase:', err.message);
    return null;
  }
}

// ============================================================
// CACHING
// ============================================================

const storeCache = new Map();
const userCache = new Map();

async function getStore(storeId) {
  assertReadOnly('read');

  if (storeCache.has(storeId)) {
    return storeCache.get(storeId);
  }

  try {
    const docSnap = await db.collection('stores').doc(storeId).get();
    const exists = docSnap.exists();
    storeCache.set(storeId, { exists });
    return { exists };
  } catch {
    storeCache.set(storeId, { exists: false, error: true });
    return { exists: false, error: true };
  }
}

async function getUser(userId) {
  assertReadOnly('read');

  if (userCache.has(userId)) {
    return userCache.get(userId);
  }

  try {
    const docSnap = await db.collection('users').doc(userId).get();

    if (docSnap.exists()) {
      const data = docSnap.data() || {};
      userCache.set(userId, {
        exists: true,
        lojas: Array.isArray(data.lojas) ? data.lojas : [],
      });
      return userCache.get(userId);
    } else {
      userCache.set(userId, { exists: false, lojas: [] });
      return { exists: false, lojas: [] };
    }
  } catch {
    userCache.set(userId, { exists: false, lojas: [], error: true });
    return { exists: false, lojas: [], error: true };
  }
}

// ============================================================
// AUDITORIA
// ============================================================

async function auditProducts() {
  if (!db) {
    log('Database não inicializado. Abortando.');
    return null;
  }

  log('Iniciando auditoria de produtos...');

  const report = {
    projectId: PRODUCTION_PROJECT_ID,
    mode: 'READ_ONLY_AUDIT',
    timestamp: new Date().toISOString(),
    summary: {
      totalProducts: 0,
      storeId: {
        VALID_STORE_ID: 0,
        MISSING_STORE_ID: 0,
        NULL_STORE_ID: 0,
        EMPTY_STORE_ID: 0,
        ORPHAN_STORE_ID: 0,
        INVALID_STORE_ID_TYPE: 0,
      },
      userId: {
        VALID_USER: 0,
        MISSING_USER_ID: 0,
        NULL_USER_ID: 0,
        EMPTY_USER_ID: 0,
        INVALID_USER_ID_TYPE: 0,
        USER_NOT_FOUND: 0,
      },
      candidates: {
        UNIQUE_CANDIDATE: 0,
        AMBIGUOUS: 0,
        NO_CANDIDATE: 0,
        USER_NOT_FOUND: 0,
        INVALID_USER_ID: 0,
      },
      consistency: 'PASS',
    },
    problematicProducts: [],
  };

  try {
    const productsSnapshot = await db.collection('products').get();

    report.summary.totalProducts = productsSnapshot.size;

    log(`Encontrados ${productsSnapshot.size} produtos. Processando...`);

    for (const productDoc of productsSnapshot.docs) {
      const productId = productDoc.id;
      const productData = productDoc.data() || {};

      // Categorizar storeId
      let storeIdStatus = null;
      let storeIdValue = productData.storeId;

      if (storeIdValue === undefined) {
        storeIdStatus = 'MISSING_STORE_ID';
        report.summary.storeId.MISSING_STORE_ID++;
      } else if (storeIdValue === null) {
        storeIdStatus = 'NULL_STORE_ID';
        report.summary.storeId.NULL_STORE_ID++;
      } else if (typeof storeIdValue !== 'string') {
        storeIdStatus = 'INVALID_STORE_ID_TYPE';
        report.summary.storeId.INVALID_STORE_ID_TYPE++;
      } else if (storeIdValue.trim() === '') {
        storeIdStatus = 'EMPTY_STORE_ID';
        report.summary.storeId.EMPTY_STORE_ID++;
      } else {
        // storeIdValue é string válida. Verificar se store existe.
        const storeCheck = await getStore(storeIdValue);

        if (storeCheck.exists) {
          storeIdStatus = 'VALID_STORE_ID';
          report.summary.storeId.VALID_STORE_ID++;
        } else {
          storeIdStatus = 'ORPHAN_STORE_ID';
          report.summary.storeId.ORPHAN_STORE_ID++;
        }
      }

      // Categorizar userId
      let userIdStatus = null;
      let userIdValue = productData.userId;

      if (userIdValue === undefined) {
        userIdStatus = 'MISSING_USER_ID';
        report.summary.userId.MISSING_USER_ID++;
      } else if (userIdValue === null) {
        userIdStatus = 'NULL_USER_ID';
        report.summary.userId.NULL_USER_ID++;
      } else if (typeof userIdValue !== 'string') {
        userIdStatus = 'INVALID_USER_ID_TYPE';
        report.summary.userId.INVALID_USER_ID_TYPE++;
      } else if (userIdValue.trim() === '') {
        userIdStatus = 'EMPTY_USER_ID';
        report.summary.userId.EMPTY_USER_ID++;
      } else {
        // userIdValue é string válida. Verificar se user existe.
        const userCheck = await getUser(userIdValue);

        if (userCheck.exists) {
          userIdStatus = 'VALID_USER';
          report.summary.userId.VALID_USER++;
        } else {
          userIdStatus = 'USER_NOT_FOUND';
          report.summary.userId.USER_NOT_FOUND++;
        }
      }

      // Analisar candidatos SOMENTE para produtos sem storeId válido
      let candidateStatus = null;
      let candidateStoreId = null;

      if (
        storeIdStatus === 'MISSING_STORE_ID' ||
        storeIdStatus === 'NULL_STORE_ID' ||
        storeIdStatus === 'EMPTY_STORE_ID'
      ) {
        // Tentar encontrar candidato a partir de userId
        if (userIdStatus === 'VALID_USER') {
          const userCheck = await getUser(userIdValue);

          if (Array.isArray(userCheck.lojas) && userCheck.lojas.length > 0) {
            // Filtrar lojas válidas
            const validStores = [];

            for (const storeId of userCheck.lojas) {
              if (typeof storeId === 'string' && storeId.trim() !== '') {
                const storeCheck = await getStore(storeId);

                if (storeCheck.exists) {
                  validStores.push(storeId);
                }
              }
            }

            if (validStores.length === 1) {
              candidateStatus = 'UNIQUE_CANDIDATE';
              candidateStoreId = validStores[0];
              report.summary.candidates.UNIQUE_CANDIDATE++;
            } else if (validStores.length > 1) {
              candidateStatus = 'AMBIGUOUS';
              report.summary.candidates.AMBIGUOUS++;
            } else {
              candidateStatus = 'NO_CANDIDATE';
              report.summary.candidates.NO_CANDIDATE++;
            }
          } else {
            candidateStatus = 'NO_CANDIDATE';
            report.summary.candidates.NO_CANDIDATE++;
          }
        } else if (userIdStatus === 'USER_NOT_FOUND') {
          candidateStatus = 'USER_NOT_FOUND';
          report.summary.candidates.USER_NOT_FOUND++;
        } else {
          candidateStatus = 'INVALID_USER_ID';
          report.summary.candidates.INVALID_USER_ID++;
        }
      }

      // Registrar produto problemático se storeIdStatus !== VALID_STORE_ID
      if (storeIdStatus !== 'VALID_STORE_ID') {
        const entry = {
          productId,
          storeIdStatus,
          userIdStatus,
          candidateStatus,
          candidateStoreId,
        };

        report.problematicProducts.push(entry);
      }
    }

    // Validar consistência de contagens
    const totalStoreId =
      report.summary.storeId.VALID_STORE_ID +
      report.summary.storeId.MISSING_STORE_ID +
      report.summary.storeId.NULL_STORE_ID +
      report.summary.storeId.EMPTY_STORE_ID +
      report.summary.storeId.ORPHAN_STORE_ID +
      report.summary.storeId.INVALID_STORE_ID_TYPE;

    const totalUserId =
      report.summary.userId.VALID_USER +
      report.summary.userId.MISSING_USER_ID +
      report.summary.userId.NULL_USER_ID +
      report.summary.userId.EMPTY_USER_ID +
      report.summary.userId.INVALID_USER_ID_TYPE +
      report.summary.userId.USER_NOT_FOUND;

    if (totalStoreId !== report.summary.totalProducts) {
      report.summary.consistency = 'FAIL';
      logError(
        `Inconsistência storeId: ${totalStoreId} !== ${report.summary.totalProducts}`
      );
    }

    if (totalUserId !== report.summary.totalProducts) {
      report.summary.consistency = 'FAIL';
      logError(
        `Inconsistência userId: ${totalUserId} !== ${report.summary.totalProducts}`
      );
    }

    return report;
  } catch (err) {
    logError('Erro durante auditoria:', err.message);
    report.summary.consistency = 'FAIL';
    return report;
  }
}

// ============================================================
// CLASSIFICAÇÃO DE RISCO
// ============================================================

function classifyRisk(report) {
  const {
    summary: { storeId, candidates },
  } = report;

  const orphanCount = storeId.ORPHAN_STORE_ID || 0;
  const missingCount =
    (storeId.MISSING_STORE_ID || 0) +
    (storeId.NULL_STORE_ID || 0) +
    (storeId.EMPTY_STORE_ID || 0);

  const ambiguousCount = candidates.AMBIGUOUS || 0;
  const noCandidateCount = candidates.NO_CANDIDATE || 0;
  const userNotFoundCount = candidates.USER_NOT_FOUND || 0;

  const uniqueCandidatesRatio =
    missingCount > 0
      ? (candidates.UNIQUE_CANDIDATE || 0) / missingCount
      : 1;

  if (
    orphanCount === 0 &&
    missingCount <= 10 &&
    uniqueCandidatesRatio >= 0.9 &&
    ambiguousCount <= 2
  ) {
    return { level: 'BAIXO', reason: 'Maioria dos legados tem candidato único' };
  }

  if (
    orphanCount <= 5 &&
    ambiguousCount <= 10 &&
    (userNotFoundCount || 0) <= 5
  ) {
    return {
      level: 'MÉDIO',
      reason: 'Existem ambíguas/orfãs mas migração parcial é viável',
    };
  }

  return {
    level: 'ALTO',
    reason:
      'Quantidade relevante de orfãs, ambíguas ou documentos não encontrados',
  };
}

// ============================================================
// PRINCIPAL
// ============================================================

async function main() {
  console.log('');
  console.log('PC-02B — AUDITORIA PRODUCTS');
  console.log('============================');
  console.log('');

  log(`Project alvo: ${PRODUCTION_PROJECT_ID}`);
  log('Modo: READ-ONLY AUDIT');
  log('');

  const db_init = await initFirebase();

  if (!db_init) {
    console.log('');
    console.log('RESULTADO:');
    console.log('=========');
    console.log('Execução: NÃO EXECUTADA — AUTENTICAÇÃO ADMINISTRATIVA INDISPONÍVEL');
    console.log('');
    console.log('Para executar a auditoria real contra produção:');
    console.log('1. Disponibilize autenticação administrativa de produção já autorizada');
    console.log('   - Via Application Default Credentials (ADC), OU');
    console.log('   - Via FIREBASE_SERVICE_ACCOUNT_PRODUCTION com credencial admin existente');
    console.log('2. Verifique que o project_id na credencial é exatamente: precocerto-cc04a');
    console.log('3. Re-execute o script');
    console.log('');
    process.exit(0);
  }

  const report = await auditProducts();

  if (!report) {
    console.log('Auditoria falhou.');
    process.exit(1);
  }

  const risk = classifyRisk(report);

  // Relatório de terminal
  console.log('RESULTADO AUDITORIA:');
  console.log('====================');
  console.log('');
  console.log(`Project alvo: ${report.projectId}`);
  console.log(`Modo: ${report.mode}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('');

  console.log('TOTAL_PRODUCTS:', report.summary.totalProducts);
  console.log('');

  console.log('STORE_ID:');
  console.log(
    `  VALID_STORE_ID: ${report.summary.storeId.VALID_STORE_ID}`
  );
  console.log(
    `  MISSING_STORE_ID: ${report.summary.storeId.MISSING_STORE_ID}`
  );
  console.log(`  NULL_STORE_ID: ${report.summary.storeId.NULL_STORE_ID}`);
  console.log(`  EMPTY_STORE_ID: ${report.summary.storeId.EMPTY_STORE_ID}`);
  console.log(`  ORPHAN_STORE_ID: ${report.summary.storeId.ORPHAN_STORE_ID}`);
  console.log(
    `  INVALID_STORE_ID_TYPE: ${report.summary.storeId.INVALID_STORE_ID_TYPE}`
  );
  console.log('');

  console.log('USER_ID:');
  console.log(`  VALID_USER: ${report.summary.userId.VALID_USER}`);
  console.log(`  MISSING_USER_ID: ${report.summary.userId.MISSING_USER_ID}`);
  console.log(`  NULL_USER_ID: ${report.summary.userId.NULL_USER_ID}`);
  console.log(`  EMPTY_USER_ID: ${report.summary.userId.EMPTY_USER_ID}`);
  console.log(
    `  INVALID_USER_ID_TYPE: ${report.summary.userId.INVALID_USER_ID_TYPE}`
  );
  console.log(`  USER_NOT_FOUND: ${report.summary.userId.USER_NOT_FOUND}`);
  console.log('');

  console.log('CANDIDATOS:');
  console.log(
    `  UNIQUE_CANDIDATE: ${report.summary.candidates.UNIQUE_CANDIDATE}`
  );
  console.log(`  AMBIGUOUS: ${report.summary.candidates.AMBIGUOUS}`);
  console.log(`  NO_CANDIDATE: ${report.summary.candidates.NO_CANDIDATE}`);
  console.log(
    `  USER_NOT_FOUND: ${report.summary.candidates.USER_NOT_FOUND}`
  );
  console.log(`  INVALID_USER_ID: ${report.summary.candidates.INVALID_USER_ID}`);
  console.log('');

  console.log('CONSISTÊNCIA:', report.summary.consistency);
  console.log('');

  console.log('RISCO:', risk.level);
  console.log(`  Razão: ${risk.reason}`);
  console.log('');

  console.log('SEGURANÇA:');
  console.log('  Nenhum documento Firestore foi alterado durante a PC-02B.');
  console.log('  precocerto/firestore.rules permaneceu inalterado.');
  console.log('');

  // Salvar JSON
  const reportFile = '/tmp/audit-products-legados.json';

  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`Relatório JSON salvo em: ${reportFile}`);
  } catch (err) {
    logError(`Falha ao salvar JSON: ${err.message}`);
  }

  console.log('');
  console.log('PRÓXIMO PASSO:');
  console.log('==============');

  if (risk.level === 'BAIXO' || risk.level === 'MÉDIO') {
    console.log('PC-02B.1 — Migração determinística dos produtos com candidato único');
  } else {
    console.log('PC-02B.1 — Resolver produtos ambíguos antes da migração');
  }

  console.log('');
  console.log('Não execute a próxima etapa automaticamente.');
  console.log('Revise os resultados e tome decisões conscientes.');
  console.log('');
}

main().catch((err) => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
