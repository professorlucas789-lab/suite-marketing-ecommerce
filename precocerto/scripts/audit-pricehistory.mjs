#!/usr/bin/env node

/**
 * PC-02B.3C.1A: Auditoria READ-ONLY de Integridade storeId em priceHistory
 *
 * Objetivo: Auditar se todos os documentos históricos já possuem `storeId` válido
 * antes de alterar queries do frontend para filtrar por `storeId` em vez de `userId`.
 *
 * Segurança:
 * - ESTRICTAMENTE READ-ONLY (apenas leitura de Firestore)
 * - Usa ADC nativa do Firebase Admin SDK
 * - Valida projectId === "precocerto-cc04a"
 * - Não cria, modifica ou elimina qualquer documento
 * - Analisa possibilidade de inferência segura de tenant
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
const REPORT_FILE = path.join(
  os.tmpdir(),
  'precocerto-pricehistory-audit.json'
);
const ALLOW_WRITES = false;

function log(...args) {
  console.log('[AUDIT-PRICEHISTORY]', ...args);
}

function logError(...args) {
  console.error('[AUDIT-PRICEHISTORY-ERROR]', ...args);
}

function assertReadOnly(operation) {
  const forbiddenOperations = ['set', 'update', 'delete', 'create', 'batch', 'transaction', 'bulkWrite'];
  if (!ALLOW_WRITES && forbiddenOperations.includes(operation)) {
    throw new Error(`[SECURITY] Operação de escrita '${operation}' bloqueada. Este é um auditor READ-ONLY.`);
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
// AUDITORIA: priceHistory
// ============================================================

async function auditPriceHistory(validStoreIds, productStoreMap, userStoresMap) {
  assertReadOnly('read');
  log('Auditoria: Analisando todos os documentos em /priceHistory...');

  const result = {
    totalDocuments: 0,
    withStoreIdValid: 0,
    withoutField: 0,
    withNull: 0,
    withEmpty: 0,
    withInvalidStoreId: 0,
    distinctStoreIds: new Set(),
    distinctUserIds: new Set(),
    distinctProductIds: new Set(),
    problematicDocuments: [],
    storeIdDistribution: {},
    userStoresDistribution: {},
    inferenceAnalysis: [],
    classificationCounts: {
      deterministicProduct: 0,
      deterministicUserSingleStore: 0,
      ambiguous: 0,
      noEvidence: 0
    }
  };

  try {
    // Ler TODOS os documentos em /priceHistory
    const snapshot = await db.collection('priceHistory').get();

    log(`Encontrados ${snapshot.size} documentos em /priceHistory`);
    result.totalDocuments = snapshot.size;

    for (const doc of snapshot.docs) {
      const docId = doc.id;
      const data = doc.data();
      const productId = data.productId;
      const userId = data.userId;

      // Análise de storeId
      const storeIdField = data.storeId;
      const hasField = 'storeId' in data;
      const isNull = storeIdField === null;
      const isEmpty = hasField && storeIdField !== null && storeIdField === '';
      const isValid = hasField && storeIdField !== null && storeIdField !== '' && typeof storeIdField === 'string';
      const storeIdExistsInStores = isValid && validStoreIds.has(storeIdField);

      // Rastrear valores distintos (SEMPRE, independentemente do estado de storeId)
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        result.distinctUserIds.add(userId);
      }
      if (productId && typeof productId === 'string' && productId.trim() !== '') {
        result.distinctProductIds.add(productId);
      }

      // Classificar
      if (isValid && storeIdExistsInStores) {
        result.withStoreIdValid++;
        result.distinctStoreIds.add(storeIdField);

        // Distribuição
        if (!result.storeIdDistribution[storeIdField]) {
          result.storeIdDistribution[storeIdField] = 0;
        }
        result.storeIdDistribution[storeIdField]++;
      } else {
        // Documento problemático
        let problemType = '';
        let classification = 'SEM_EVIDÊNCIA';

        if (!hasField) {
          result.withoutField++;
          problemType = 'AUSENTE';
        } else if (isNull) {
          result.withNull++;
          problemType = 'NULL';
        } else if (isEmpty) {
          result.withEmpty++;
          problemType = 'VAZIO';
        } else if (isValid && !storeIdExistsInStores) {
          result.withInvalidStoreId++;
          problemType = 'STORE_INVÁLIDA';
          result.distinctStoreIds.add(storeIdField);
        }

        // Determinar classificação baseada em inferência segura
        let inferredStoreId = null;

        if (productId && productStoreMap.has(productId)) {
          classification = 'DETERMINÍSTICO_PRODUCT';
          inferredStoreId = productStoreMap.get(productId);
        } else {
          const userStores = userId
            ? userStoresMap.get(userId) || []
            : [];

          if (userStores.length === 1) {
            classification = 'DETERMINÍSTICO_USER_SINGLE_STORE';
            inferredStoreId = userStores[0];
          } else if (userStores.length > 1) {
            classification = 'AMBÍGUO';
          } else {
            classification = 'SEM_EVIDÊNCIA';
          }
        }

        // Registar documentos problemáticos
        result.problematicDocuments.push({
          documentId: docId,
          productId: productId || null,
          userId: userId || null,
          storeId: storeIdField || null,
          inferredStoreId,
          problemType,
          classification,
          createdAt: data.createdAt ? data.createdAt.toDate?.().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate?.().toISOString() : null
        });

        // Registar análise de inferência
        if (classification === 'DETERMINÍSTICO_PRODUCT') {
          result.inferenceAnalysis.push({
            documentId: docId,
            method: 'productId',
            productId,
            inferredStoreId,
            couldInferStoreId: true
          });
        } else if (classification === 'DETERMINÍSTICO_USER_SINGLE_STORE') {
          result.inferenceAnalysis.push({
            documentId: docId,
            method: 'userId',
            userId,
            inferredStoreId,
            couldInferStoreId: true
          });
        }
      }
    }

    // Contar classificações
    result.problematicDocuments.forEach(doc => {
      if (doc.classification === 'DETERMINÍSTICO_PRODUCT') {
        result.classificationCounts.deterministicProduct++;
      } else if (doc.classification === 'DETERMINÍSTICO_USER_SINGLE_STORE') {
        result.classificationCounts.deterministicUserSingleStore++;
      } else if (doc.classification === 'AMBÍGUO') {
        result.classificationCounts.ambiguous++;
      } else if (doc.classification === 'SEM_EVIDÊNCIA') {
        result.classificationCounts.noEvidence++;
      }
    });

    // Registar distribuição de utilizadores por número de lojas
    result.problematicDocuments.forEach(doc => {
      if (doc.classification === 'DETERMINÍSTICO_USER_SINGLE_STORE') {
        const userLojas = userStoresMap.get(doc.userId);
        if (userLojas) {
          const count = userLojas.length;
          if (!result.userStoresDistribution[count]) {
            result.userStoresDistribution[count] = 0;
          }
          result.userStoresDistribution[count]++;
        }
      }
    });

    log(`  ✓ Documentos com storeId válido: ${result.withStoreIdValid}`);
    log(`  ✗ Documentos sem campo storeId: ${result.withoutField}`);
    log(`  ✗ Documentos com storeId null: ${result.withNull}`);
    log(`  ✗ Documentos com storeId vazio: ${result.withEmpty}`);
    log(`  ✗ Documentos com storeId inválida: ${result.withInvalidStoreId}`);
    log(`  Documentos problemáticos total: ${result.problematicDocuments.length}`);
    log(`  StoreIds distintas: ${result.distinctStoreIds.size}`);
    log(`  UserIds distintas: ${result.distinctUserIds.size}`);
    log(`  ProductIds distintas: ${result.distinctProductIds.size}`);
    log(`  Documentos com inferência DETERMINÍSTICA: ${result.inferenceAnalysis.length}`);

  } catch (err) {
    logError('Falha ao auditar priceHistory:', err.message);
    throw new Error(`Falha ao auditar priceHistory: ${err.message}`);
  }

  return result;
}

// ============================================================
// ANÁLISE DE READINESS
// ============================================================

function analyzeReadiness(auditResult) {
  log('Análise de Readiness para query por storeId...');

  const totalProblematic = auditResult.problematicDocuments.length;
  const totalDeterministic = auditResult.inferenceAnalysis.length;

  let readyForStoreIdQuery = false;
  let readyExplanation = '';

  if (totalProblematic === 0) {
    readyForStoreIdQuery = true;
    readyExplanation = '✅ priceHistory ESTÁ PRONTA: todos os 100% dos documentos possuem storeId válido.';
  } else {
    readyForStoreIdQuery = false;
    const percentageProblematic = ((totalProblematic / auditResult.totalDocuments) * 100).toFixed(2);
    const percentageDeterministic = ((totalDeterministic / totalProblematic) * 100).toFixed(2);
    readyExplanation = `⚠️ priceHistory NÃO ESTÁ PRONTA: ${totalProblematic} documentos (${percentageProblematic}%) problemáticos. Desses, apenas ${totalDeterministic} (${percentageDeterministic}%) podem ser corrigidos automaticamente.`;
  }

  log(readyExplanation);

  return {
    isReady: readyForStoreIdQuery,
    explanation: readyExplanation,
    problemDocumentsCount: totalProblematic,
    deterministicCount: totalDeterministic,
    percentageProblematic: ((totalProblematic / auditResult.totalDocuments) * 100).toFixed(2),
    percentageDeterministic: totalDeterministic > 0 ? ((totalDeterministic / totalProblematic) * 100).toFixed(2) : 0
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('PC-02B.3C.1A — AUDITORIA READ-ONLY DE priceHistory');
  console.log('=====================================================');
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

  // Executar auditoria
  const auditResult = await auditPriceHistory(validStoreIds, productStoreMap, userStoresMap);
  console.log('');

  // Analisar readiness
  const readiness = analyzeReadiness(auditResult);
  console.log('');

  // Criar sumário
  const summary = {
    timestamp: new Date().toISOString(),
    projectId: PRODUCTION_PROJECT_ID,
    mode: 'READ_ONLY_AUDIT',
    summary: {
      totalDocuments: auditResult.totalDocuments,
      validStoreId: auditResult.withStoreIdValid,
      problemDocuments: auditResult.problematicDocuments.length,
      problemBreakdown: {
        missingField: auditResult.withoutField,
        nullValue: auditResult.withNull,
        emptyValue: auditResult.withEmpty,
        invalidStoreId: auditResult.withInvalidStoreId
      }
    },
    readiness,
    distribution: {
      distinctStoreIds: auditResult.distinctStoreIds.size,
      storeIdBreakdown: Object.entries(auditResult.storeIdDistribution)
        .map(([storeId, count]) => ({ storeId, count }))
        .sort((a, b) => b.count - a.count),
      distinctUserIds: auditResult.distinctUserIds.size,
      distinctProductIds: auditResult.distinctProductIds.size
    },
    problematicDocuments: auditResult.problematicDocuments.slice(0, 1000), // Limitar output
    deterministicInference: auditResult.inferenceAnalysis.slice(0, 100)
  };

  // Escrever ficheiro de relatório
  try {
    fs.writeFileSync(REPORT_FILE, JSON.stringify(summary, null, 2), 'utf8');
    log(`Relatório completo salvo em: ${REPORT_FILE}`);
  } catch (err) {
    logError(`Falha ao escrever relatório: ${err.message}`);
    throw new Error(`Falha ao escrever relatório: ${err.message}`);
  }

  console.log('');
  console.log('RESUMO DA AUDITORIA:');
  console.log('===================');
  console.log(`  Total de documentos: ${auditResult.totalDocuments}`);
  console.log(`  Com storeId válido: ${auditResult.withStoreIdValid}`);
  console.log(`  Documentos problemáticos: ${auditResult.problematicDocuments.length}`);
  console.log('');

  console.log('INTEGRIDADE DE storeId:');
  console.log('=======================');
  console.log(`  Válido (storeId presente e existente): ${auditResult.withStoreIdValid}`);
  console.log(`  Ausente (sem campo storeId): ${auditResult.withoutField}`);
  console.log(`  Null (campo = null): ${auditResult.withNull}`);
  console.log(`  Vazio (campo = ""): ${auditResult.withEmpty}`);
  console.log(`  Inválido (store não existe): ${auditResult.withInvalidStoreId}`);
  console.log('');

  console.log('DISTRIBUIÇÃO POR LOJA:');
  console.log('======================');
  const topStores = Object.entries(auditResult.storeIdDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topStores.length > 0) {
    topStores.forEach(([storeId, count], idx) => {
      console.log(`  ${idx + 1}. ${storeId}: ${count} documentos`);
    });
  } else {
    console.log('  (nenhuma distribuição)');
  }
  console.log('');

  console.log('READINESS PARA QUERY POR storeId:');
  console.log('==================================');
  console.log(readiness.explanation);
  console.log(`  Percentagem problemática: ${readiness.percentageProblematic}%`);
  if (readiness.deterministicCount > 0) {
    console.log(`  Documentos corrigíveis automaticamente: ${readiness.deterministicCount} (${readiness.percentageDeterministic}%)`);
  }
  console.log('');

  console.log('RESULTADO FINAL:');
  console.log('================');
  console.log(`  ✓ Nenhum documento Firestore foi alterado durante a PC-02B.3C.1A.`);
  console.log(`  ✓ Nenhuma Firestore Rule foi alterada.`);
  console.log(`  ✓ Nenhum ficheiro de aplicação foi alterado.`);
  console.log(`  ✓ Relatório salvo: ${REPORT_FILE}`);
  console.log('');
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
