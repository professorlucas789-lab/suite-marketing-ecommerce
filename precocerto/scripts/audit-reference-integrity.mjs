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

function log(...args) {
  console.log('[AUDIT-INTEGRITY]', ...args);
}

function logError(...args) {
  console.error('[AUDIT-INTEGRITY-ERROR]', ...args);
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

async function diagnoseStoreIdReferences() {
  log('Diagnóstico 3: Analisando referências storeId...');

  const result = {
    distinctStoreIds: new Set(),
    foundInStores: [],
    foundInLegacy: [],
    notFound: [],
    multipleMatches: []
  };

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

    // Verificar cada storeId em /stores
    const storesSnapshot = await db.collection('stores').get();
    const storesMap = new Set(storesSnapshot.docs.map(d => d.id));

    for (const storeId of result.distinctStoreIds) {
      if (storesMap.has(storeId)) {
        result.foundInStores.push(storeId);
      } else {
        result.notFound.push(storeId);
      }
    }

    log(`  - Encontrados em /stores: ${result.foundInStores.length}`);
    log(`  - NÃO encontrados: ${result.notFound.length}`);

    // Verificar coleções legadas (se existirem)
    const legacyCollections = ['lojas', 'businesses', 'businessesSettings', 'storesLegacy'];
    for (const legacyName of legacyCollections) {
      try {
        const legacySnapshot = await db.collection(legacyName).get();
        const legacyIds = new Set(legacySnapshot.docs.map(d => d.id));

        for (const orphanId of result.notFound) {
          if (legacyIds.has(orphanId)) {
            result.foundInLegacy.push({
              storeId: orphanId,
              collection: legacyName
            });
          }
        }
      } catch {
        // Coleção não existe, prosseguir
      }
    }

    if (result.foundInLegacy.length > 0) {
      log(`  - Encontrados em coleções legadas: ${result.foundInLegacy.length}`);
    }

  } catch (err) {
    logError('Falha ao analisar referências storeId:', err.message);
  }

  return result;
}

// ============================================================
// DIAGNÓSTICO 4: Referências userId
// ============================================================

async function diagnoseUserIdReferences() {
  log('Diagnóstico 4: Analisando referências userId...');

  const result = {
    distinctUserIds: new Set(),
    found: [],
    notFound: [],
    totalUsersInCollection: 0
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

    // Verificar se /users existe e contar
    const usersSnapshot = await db.collection('users').get();
    result.totalUsersInCollection = usersSnapshot.size;
    const usersMap = new Set(usersSnapshot.docs.map(d => d.id));

    log(`  - Documentos em /users: ${result.totalUsersInCollection}`);

    for (const userId of result.distinctUserIds) {
      if (usersMap.has(userId)) {
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

async function diagnoseProductPatterns() {
  log('Diagnóstico 5: Analisando padrões dos produtos problemáticos...');

  const problematicProducts = [];
  const storeIdDistribution = {};
  const userIdDistribution = {};
  let minCreatedAt = null;
  let maxCreatedAt = null;

  try {
    const productsSnapshot = await db.collection('products').get();

    for (const doc of productsSnapshot.docs) {
      const data = doc.data();
      const productId = doc.id;

      // Considerar problemático se não tem storeId válido ou userId válido
      const hasValidStore = data.storeId && typeof data.storeId === 'string' && data.storeId.trim() !== '';
      const hasValidUser = data.userId && typeof data.userId === 'string' && data.userId.trim() !== '';

      if (!hasValidStore || !hasValidUser) {
        problematicProducts.push({
          productId,
          storeId: data.storeId || null,
          userId: data.userId || null,
          createdAt: data.createdAt ? data.createdAt.toDate?.().toISOString() : null,
          updatedAt: data.updatedAt ? data.updatedAt.toDate?.().toISOString() : null
        });
      }

      // Distribuição (todos os produtos)
      if (hasValidStore) {
        storeIdDistribution[data.storeId] = (storeIdDistribution[data.storeId] || 0) + 1;
      }

      if (hasValidUser) {
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

    log(`Produtos problemáticos: ${problematicProducts.length}`);
    log(`StoreIds distintos (com produtos): ${Object.keys(storeIdDistribution).length}`);
    log(`UserIds distintos (com produtos): ${Object.keys(userIdDistribution).length}`);

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

  // Executar diagnósticos
  const collections = await diagnoseCollections();
  console.log('');

  const counts = await diagnoseCounts(collections);
  console.log('');

  const storeRefs = await diagnoseStoreIdReferences();
  console.log('');

  const userRefs = await diagnoseUserIdReferences();
  console.log('');

  const patterns = await diagnoseProductPatterns();
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
        problematicProducts: patterns.problematicProducts,
        storeIdDistribution: patterns.storeIdDistribution,
        userIdDistribution: patterns.userIdDistribution,
        temporalRange: patterns.temporalRange
      },
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
  console.log('RESULTADO DIAGNÓSTICO:');
  console.log('======================');
  console.log('');
  console.log(`Collections encontradas: ${collections.length}`);
  console.log(`StoreIds órfãos: ${storeRefs.notFound.length}`);
  console.log(`UserIds órfãos: ${userRefs.notFound.length}`);
  console.log(`Produtos problemáticos: ${patterns.problematicProducts.length}`);
  console.log('');
  console.log('✓ Nenhum documento Firestore foi alterado durante a PC-02B.1A.');
  console.log('');
}

main().catch(err => {
  logError('Erro fatal:', err.message);
  process.exit(1);
});
