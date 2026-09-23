#!/usr/bin/env node

/**
 * PC-02B.1A: Diagnóstico de Integridade Referencial dos Dados Legados
 *
 * Objetivo: Investigar a origem das referências quebradas (storeId órfãos, userId não encontrados)
 * antes de qualquer migração.
 *
 * Segurança:
 * - ESTRICTAMENTE READ-ONLY (apenas leitura de Firestore)
 * - Usa ADC nativa do Firebase Admin SDK
 * - Valida projectId === "precocerto-cc04a"
 * - Não cria, modifica ou elimina qualquer documento
 * - Não consulta Firebase Authentication
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
  'precocerto-reference-integrity.json'
);
const ALLOW_WRITES = false;

function log(...args) {
  console.log('[AUDIT-INTEGRITY]', ...args);
}

function logError(...args) {
  console.error('[AUDIT-INTEGRITY-ERROR]', ...args);
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
    return null;
  }
}

// ============================================================
// DIAGNÓSTICO 1: Coleções de Topo
// ============================================================

async function diagnoseCollections() {
  assertReadOnly('read');
  log('Diagnóstico 1: Listando coleções top-level...');

  try {
    const collections = await db.listCollections();
    const collectionNames = collections.map(c => c.id);

    log(`Encontradas ${collectionNames.length} coleções:`);
    collectionNames.forEach(name => log(`  - ${name}`));

    return collectionNames;
  } catch (err) {
    logError('Falha ao listar coleções:', err.message);
    return [];
  }
}

// ============================================================
// DIAGNÓSTICO 2: Contagens
// ============================================================

async function diagnoseCounts(collectionNames) {
  assertReadOnly('read');
  log('Diagnóstico 2: Contando documentos por coleção...');

  const counts = {};

  for (const collName of collectionNames) {
    try {
      const snapshot = await db.collection(collName).count().get();
      counts[collName] = snapshot.data().count;
      log(`  ${collName}: ${counts[collName]} documentos`);
    } catch (err) {
      counts[collName] = 'ERROR';
      logError(`  ${collName}: erro ao contar (${err.message})`);
    }
  }

  // Validar coleções obrigatórias
  const requiredCollections = ['products', 'users', 'stores'];
  const missing = requiredCollections.filter(c => !collectionNames.includes(c));

  if (missing.length > 0) {
    log(`Aviso: Coleções obrigatórias não encontradas: ${missing.join(', ')}`);
  }

  return counts;
}

// ============================================================
// DIAGNÓSTICO 3: Referências storeId
// ============================================================

async function diagnoseStoreIdReferences(validStoreIds, collectionNames) {
  assertReadOnly('read');
  log('Diagnóstico 3: Analisando referências storeId...');

  const result = {
    distinctStoreIds: new Set(),
    foundInStores: [],
    foundInLegacy: [],
    notFound: [],
    multipleMatches: []
  };

  let legacyCandidateCollections = [];

  try {
    const productsSnapshot = await db.collection('products').get();

    // Extrair storeIds distintos
    productsSnapshot.forEach(doc => {
      const storeId = doc.data().storeId;
      if (storeId && typeof storeId === 'string' && storeId.trim() !== '') {
        result.distinctStoreIds.add(storeId);
      }
    });

    log(`Encontrados ${result.distinctStoreIds.size} storeId distintos`);

    // Usar o conjunto pré-carregado validStoreIds para análise
    const orphanCandidates = [];
    for (const storeId of result.distinctStoreIds) {
      if (validStoreIds.has(storeId)) {
        result.foundInStores.push(storeId);
      } else {
        orphanCandidates.push(storeId);
      }
    }

    log(`  - Encontrados em /stores: ${result.foundInStores.length}`);
    log(`  - Candidatos órfãos para pesquisa: ${orphanCandidates.length}`);

    // Descobrir dinamicamente coleções legacy
    const excluded = new Set(['products', 'users', 'stores']);

    legacyCandidateCollections = collectionNames.filter((name) => {
      const normalized = name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

      if (excluded.has(name)) return false;

      return (
        normalized.includes('store') ||
        normalized.includes('loja') ||
        normalized.includes('business') ||
        normalized.includes('negocio')
      );
    });

    if (legacyCandidateCollections.length > 0) {
      log(`  - Coleções legacy candidatas encontradas: ${legacyCandidateCollections.length}`);
      legacyCandidateCollections.forEach(name => log(`    • ${name}`));
    }

    // Pesquisar cada candidato órfão em coleções legacy
    for (const storeId of orphanCandidates) {
      const matches = [];

      for (const collectionName of legacyCandidateCollections) {
        try {
          const snap = await db
            .collection(collectionName)
            .doc(storeId)
            .get();

          if (snap.exists) {
            matches.push(collectionName);
          }
        } catch (err) {
          logError(
            `Falha ao consultar ${collectionName}/${storeId}:`,
            err.message
          );

          throw new Error(
            `Falha de leitura Firestore em ${collectionName}/${storeId}: ${err.message}`
          );
        }
      }

      // Classificar resultado (só ocorre se TODAS as consultas tiverem sucesso)
      if (matches.length === 0) {
        result.notFound.push(storeId);
      } else if (matches.length === 1) {
        result.foundInLegacy.push({
          storeId,
          collection: matches[0]
        });
      } else {
        result.multipleMatches.push({
          storeId,
          collections: matches
        });
      }
    }

    log(`  - NÃO encontrados em lugar algum: ${result.notFound.length}`);
    if (result.foundInLegacy.length > 0) {
      log(`  - Encontrados em coleções legacy (match único): ${result.foundInLegacy.length}`);
    }
    if (result.multipleMatches.length > 0) {
      log(`  - Encontrados em múltiplas coleções legacy: ${result.multipleMatches.length}`);
    }

  } catch (err) {
    logError('Falha ao analisar referências storeId:', err.message);
  }

  return {
    ...result,
    legacyCandidateCollections
  };
}

// ============================================================
// DIAGNÓSTICO 4: Referências userId
// ============================================================

async function diagnoseUserIdReferences(validUserIds, totalUsersInCollection) {
  assertReadOnly('read');
  log('Diagnóstico 4: Analisando referências userId...');

  const result = {
    distinctUserIds: new Set(),
    found: [],
    notFound: [],
    totalUsersInCollection: totalUsersInCollection
  };

  try {
    const productsSnapshot = await db.collection('products').get();

    // Extrair userIds distintos
    productsSnapshot.forEach(doc => {
      const userId = doc.data().userId;
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        result.distinctUserIds.add(userId);
      }
    });

    log(`Encontrados ${result.distinctUserIds.size} userId distintos`);
    log(`  - Documentos em /users: ${result.totalUsersInCollection}`);

    // Usar o conjunto pré-carregado validUserIds para análise
    for (const userId of result.distinctUserIds) {
      if (validUserIds.has(userId)) {
        result.found.push(userId);
      } else {
        result.notFound.push(userId);
      }
    }

    log(`  - Encontrados em /users: ${result.found.length}`);
    log(`  - NÃO encontrados: ${result.notFound.length}`);

  } catch (err) {
    logError('Falha ao analisar referências userId:', err.message);
  }

  return result;
}

// ============================================================
// DIAGNÓSTICO 5: Padrões dos Produtos
// ============================================================

async function diagnoseProductPatterns(validStoreIds, validUserIds) {
  assertReadOnly('read');
  log('Diagnóstico 5: Analisando padrões dos produtos problemáticos...');

  const problematicProducts = [];
  const storeIdDistribution = {};
  const userIdDistribution = {};
  let minCreatedAt = null;
  let maxCreatedAt = null;
  let noStoreIdCount = 0;
  let noUserIdCount = 0;
  let bothProblematicCount = 0;
  let storeRefExists = 0;
  let storeRefMissing = 0;
  let userRefExists = 0;
  let userRefMissing = 0;

  try {
    log(`  Referências válidas: ${validStoreIds.size} stores, ${validUserIds.size} users`);

    // Processar produtos
    const productsSnapshot = await db.collection('products').get();

    for (const doc of productsSnapshot.docs) {
      const data = doc.data();
      const productId = doc.id;

      // Validar presença de valores
      const hasStoreIdValue = data.storeId && typeof data.storeId === 'string' && data.storeId.trim() !== '';
      const hasUserIdValue = data.userId && typeof data.userId === 'string' && data.userId.trim() !== '';

      // Validar existência em collections
      const storeIdExists = hasStoreIdValue && validStoreIds.has(data.storeId);
      const userIdExists = hasUserIdValue && validUserIds.has(data.userId);

      // Contar referências
      if (hasStoreIdValue) {
        if (storeIdExists) storeRefExists++;
        else storeRefMissing++;
      }
      if (hasUserIdValue) {
        if (userIdExists) userRefExists++;
        else userRefMissing++;
      }

      // Categorizar produto problemático
      const isProblematic = !storeIdExists || !userIdExists;

      if (isProblematic) {
        if (!storeIdExists && !userIdExists) {
          bothProblematicCount++;
        } else if (!storeIdExists) {
          noStoreIdCount++;
        } else if (!userIdExists) {
          noUserIdCount++;
        }

        // Registar detalhes do produto problemático
        problematicProducts.push({
          productId,
          storeId: data.storeId || null,
          storeIdExists: storeIdExists,
          userId: data.userId || null,
          userIdExists: userIdExists,
          problemType: !storeIdExists && !userIdExists ? 'NO_STORE_NO_USER' : !storeIdExists ? 'NO_STORE' : 'NO_USER',
          createdAt: data.createdAt ? data.createdAt.toDate?.().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate?.().toISOString() : null
        });
      }

      // Distribuição (todos os produtos com referência válida)
      if (storeIdExists) {
        storeIdDistribution[data.storeId] = (storeIdDistribution[data.storeId] || 0) + 1;
      }

      if (userIdExists) {
        userIdDistribution[data.userId] = (userIdDistribution[data.userId] || 0) + 1;
      }

      // Análise temporal
      if (data.createdAt) {
        const createdTime = data.createdAt.toDate?.().getTime?.();
        if (createdTime) {
          if (minCreatedAt === null || createdTime < minCreatedAt) minCreatedAt = createdTime;
          if (maxCreatedAt === null || createdTime > maxCreatedAt) maxCreatedAt = createdTime;
        }
      }
    }

    log(`Integridade referencial:`);
    log(`  - Referências de store: ${storeRefExists} encontradas, ${storeRefMissing} órfãs`);
    log(`  - Referências de user: ${userRefExists} encontradas, ${userRefMissing} órfãs`);
    log(`Produtos problemáticos: ${problematicProducts.length}`);
    log(`  - Sem store válido: ${noStoreIdCount}`);
    log(`  - Sem user válido: ${noUserIdCount}`);
    log(`  - Sem store E user: ${bothProblematicCount}`);
    log(`StoreIds distintos (válidos): ${Object.keys(storeIdDistribution).length}`);
    log(`UserIds distintos (válidos): ${Object.keys(userIdDistribution).length}`);

    if (minCreatedAt && maxCreatedAt) {
      const minDate = new Date(minCreatedAt).toISOString();
      const maxDate = new Date(maxCreatedAt).toISOString();
      log(`  - Intervalo temporal: ${minDate} a ${maxDate}`);
    }

  } catch (err) {
    logError('Falha ao analisar padrões:', err.message);
  }

  return {
    problematicProducts,
    storeIdDistribution,
    userIdDistribution,
    categorization: {
      noStoreId: noStoreIdCount,
      noUserId: noUserIdCount,
      bothProblematic: bothProblematicCount,
      total: problematicProducts.length
    },
    referentialIntegrity: {
      storeReferences: {
        found: storeRefExists,
        missing: storeRefMissing
      },
      userReferences: {
        found: userRefExists,
        missing: userRefMissing
      }
    },
    temporalRange: { minCreatedAt, maxCreatedAt }
  };
}

// ============================================================
// DIAGNÓSTICO 6: Distribuição (Top 10)
// ============================================================

function generateDistribution(storeIdDist, userIdDist) {
  log('Diagnóstico 6: Gerando resumo de distribuição...');

  // Top 10 storeIds
  const topStores = Object.entries(storeIdDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  // Top 10 userIds
  const topUsers = Object.entries(userIdDist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  log(`  Top 10 storeIds:`);
  topStores.forEach((item, idx) => {
    log(`    ${idx + 1}. ${item.id}: ${item.count} produtos`);
  });

  log(`  Top 10 userIds:`);
  topUsers.forEach((item, idx) => {
    log(`    ${idx + 1}. ${item.id}: ${item.count} produtos`);
  });

  return { topStores, topUsers };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('PC-02B.1A — DIAGNÓSTICO DE INTEGRIDADE REFERENCIAL');
  console.log('=====================================================');
  console.log('');

  const db_init = await initFirebase();

  if (!db_init) {
    log('AUTENTICAÇÃO ADMINISTRATIVA INDISPONÍVEL');
    console.log('');
    process.exit(0);
  }

  // Carregamento centralizado de referências (evita leituras redundantes)
  log('Pré-carregando referências válidas...');
  let validStoreIds = new Set();
  let validUserIds = new Set();
  let totalUsersInCollection = 0;

  try {
    const storesSnapshot = await db.collection('stores').get();
    validStoreIds = new Set(storesSnapshot.docs.map(d => d.id));
    log(`  - Stores carregados: ${validStoreIds.size}`);

    const usersSnapshot = await db.collection('users').get();
    validUserIds = new Set(usersSnapshot.docs.map(d => d.id));
    totalUsersInCollection = usersSnapshot.size;
    log(`  - Users carregados: ${validUserIds.size}`);
  } catch (err) {
    logError('Falha ao pré-carregar referências:', err.message);
    process.exit(1);
  }
  console.log('');

  // Executar diagnósticos
  const collections = await diagnoseCollections();
  console.log('');

  const counts = await diagnoseCounts(collections);
  console.log('');

  const storeRefs = await diagnoseStoreIdReferences(validStoreIds, collections);
  console.log('');

  const userRefs = await diagnoseUserIdReferences(validUserIds, totalUsersInCollection);
  console.log('');

  const patterns = await diagnoseProductPatterns(validStoreIds, validUserIds);
  console.log('');

  // Criar findings estruturais
  const structuralFindings = [];

  const addFinding = (value) => {
    if (!structuralFindings.includes(value)) {
      structuralFindings.push(value);
    }
  };

  if (validStoreIds.size === 0) {
    addFinding('STORES_COLLECTION_EMPTY');
  }

  if (totalUsersInCollection === 0) {
    addFinding('USERS_COLLECTION_EMPTY');
  }

  if (storeRefs.legacyCandidateCollections.length > 0) {
    addFinding('LEGACY_STORE_COLLECTION_DETECTED');
  }

  if (
    storeRefs.notFound.length > 0 ||
    userRefs.notFound.length > 0 ||
    patterns.problematicProducts.length > 0
  ) {
    addFinding('PRODUCT_REFERENCES_ORPHANED');
  }

  if (storeRefs.foundInLegacy.length > 0) {
    addFinding('POSSIBLE_COLLECTION_RENAME');
  }

  if (
    patterns.referentialIntegrity.storeReferences.missing > 0 ||
    patterns.referentialIntegrity.userReferences.missing > 0
  ) {
    addFinding('DATA_MODEL_MISMATCH');
  }

  if (structuralFindings.length === 0) {
    addFinding('INCONCLUSIVE');
  }
  console.log('');

  const distribution = generateDistribution(
    patterns.storeIdDistribution,
    patterns.userIdDistribution
  );
  console.log('');

  // Gerar relatório JSON
  const report = {
    timestamp: new Date().toISOString(),
    projectId: PRODUCTION_PROJECT_ID,
    mode: 'READ_ONLY_DIAGNOSTIC',
    diagnosis: {
      collections: {
        found: collections,
        counts
      },
      storeIdReferences: {
        distinctCount: storeRefs.distinctStoreIds.size,
        foundInStores: storeRefs.foundInStores.length,
        foundInLegacy: storeRefs.foundInLegacy,
        notFound: storeRefs.notFound,
        multipleMatches: storeRefs.multipleMatches,
        legacyCandidateCollections: storeRefs.legacyCandidateCollections,
        orphanStoreIds: Array.from(storeRefs.notFound)
      },
      userIdReferences: {
        distinctCount: userRefs.distinctUserIds.size,
        found: userRefs.found.length,
        notFound: userRefs.notFound.length,
        totalInUsersCollection: userRefs.totalUsersInCollection,
        orphanUserIds: userRefs.notFound.slice(0, 100) // Limitar output
      },
      patterns: {
        problematicProductsCount: patterns.problematicProducts.length,
        categorization: patterns.categorization,
        referentialIntegrity: patterns.referentialIntegrity,
        problematicProducts: patterns.problematicProducts,
        storeIdDistribution: patterns.storeIdDistribution,
        userIdDistribution: patterns.userIdDistribution,
        temporalRange: patterns.temporalRange
      },
      structuralFindings,
      distribution: {
        topStores: distribution.topStores,
        topUsers: distribution.topUsers
      }
    }
  };

  // Escrever ficheiro de relatório
  try {
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[INFO] Relatório completo salvo em: ${REPORT_FILE}`);
  } catch (err) {
    logError(`Falha ao escrever relatório: ${err.message}`);
  }

  console.log('');
  console.log('COLEÇÕES LEGACY CANDIDATAS:');
  console.log('===========================');
  if (storeRefs.legacyCandidateCollections.length > 0) {
    storeRefs.legacyCandidateCollections.forEach(name => {
      console.log(`  • ${name}`);
    });
  } else {
    console.log('  (nenhuma detectada)');
  }
  console.log('');

  console.log('FINDINGS ESTRUTURAIS:');
  console.log('====================');
  if (structuralFindings.length > 0) {
    structuralFindings.forEach(finding => {
      console.log(`  ⚠️  ${finding}`);
    });
  } else {
    console.log('  (nenhum)');
  }
  console.log('');

  console.log('REFERÊNCIAS DE STORE:');
  console.log('====================');
  console.log(`  DISTINCT_STORE_IDS: ${storeRefs.distinctStoreIds.size}`);
  console.log(`  FOUND_IN_STORES: ${storeRefs.foundInStores.length}`);
  console.log(`  FOUND_IN_LEGACY_STORE_COLLECTION: ${storeRefs.foundInLegacy.length}`);
  console.log(`  NOT_FOUND_ANYWHERE: ${storeRefs.notFound.length}`);
  console.log(`  MULTIPLE_POSSIBLE_MATCHES: ${storeRefs.multipleMatches.length}`);
  console.log('');

  console.log('REFERÊNCIAS DE USER:');
  console.log('====================');
  console.log(`  DISTINCT_USER_IDS: ${userRefs.distinctUserIds.size}`);
  console.log(`  FOUND_IN_USERS: ${userRefs.found.length}`);
  console.log(`  NOT_FOUND_IN_USERS: ${userRefs.notFound.length}`);
  console.log('');

  console.log('PRODUTOS PROBLEMÁTICOS:');
  console.log('=======================');
  console.log(`  Total: ${patterns.problematicProducts.length}`);
  console.log(`  Sem store válido: ${patterns.categorization.noStoreId}`);
  console.log(`  Sem user válido: ${patterns.categorization.noUserId}`);
  console.log(`  Sem store E user: ${patterns.categorization.bothProblematic}`);
  console.log('');

  console.log('RESULTADO FINAL:');
  console.log('================');
  console.log(`  Collections encontradas: ${collections.length}`);
  console.log(`  Arquivo de relatório: ${REPORT_FILE}`);
  console.log('');
  console.log('✓ Nenhum documento Firestore foi alterado durante a PC-02B.1A.');
  console.log('');
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
