#!/usr/bin/env node
/**
 * FASE A — Auditoria Firestore PreçoCerto
 * READ-ONLY: Mapeia estrutura e identifica discrepâncias
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Inicializar Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync('/root/.claude/uploads/4ad03096-0c86-5efa-8ab8-cc6931971a88/999e2660-precocerto-cc04a-firebase-adminsdk-fbsvc-73a25c01fb.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'precocerto-cc04a',
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const REPORT = {
  timestamp: new Date().toISOString(),
  projectId: 'precocerto-cc04a',
  status: 'in_progress',
  collections: {},
  analysis: {
    productFragmentation: {},
    categoryDuplication: {},
    estockConsistency: {},
    salesValidation: {},
  },
  issues: [],
  recommendations: [],
};

let totalDocuments = 0;

async function auditCollection(path, level = 0) {
  const indent = '  '.repeat(level);

  try {
    const colRef = db.collection(path);
    const snapshot = await colRef.limit(1000).get();
    const count = snapshot.size;

    console.log(`${indent}✓ ${path}: ${count} documentos`);

    REPORT.collections[path] = {
      documentCount: count,
      samples: [],
      structure: {},
    };

    totalDocuments += count;

    // Amostrar primeiros 3 documentos
    let sampleCount = 0;
    snapshot.forEach((doc) => {
      if (sampleCount < 3) {
        const data = doc.data();
        REPORT.collections[path].samples.push({
          id: doc.id,
          hasStoreId: !!data.storeId,
          storeId: data.storeId || null,
          keys: Object.keys(data).slice(0, 10),
        });
        sampleCount++;
      }
    });

    // Auditar sub-coleções (apenas nível 1)
    if (level < 1) {
      const firstDoc = snapshot.docs[0];
      if (firstDoc) {
        const subCollections = await firstDoc.ref.listCollections();
        for (const subCol of subCollections) {
          const subPath = `${path}/${firstDoc.id}/${subCol.id}`;
          await auditCollection(subPath, level + 1);
        }
      }
    }

    return count;
  } catch (error) {
    console.error(`${indent}✗ Erro em ${path}: ${error.message}`);
    REPORT.collections[path] = { error: error.message };
    return 0;
  }
}

async function analyzeProductFragmentation() {
  console.log('\n📊 Analisando Fragmentação de Produtos...');

  try {
    // Contar produtos em raiz
    const rootProducts = await db.collection('products').limit(500).get();
    const rootCount = rootProducts.size;
    console.log(`  ├─ products/ (raiz): ${rootCount}`);

    // Contar produtos por loja
    const lojas = await db.collection('lojas').get();
    let totalStoreProducts = 0;
    const storeBreakdown = {};

    for (const lojaDoc of lojas.docs) {
      const storeId = lojaDoc.id;
      const storeProducts = await db
        .collection('lojas')
        .doc(storeId)
        .collection('products')
        .limit(500)
        .get();

      const count = storeProducts.size;
      totalStoreProducts += count;
      storeBreakdown[storeId] = count;

      if (count > 0) {
        console.log(`  ├─ lojas/${storeId}/products/: ${count}`);
      }
    }

    console.log(`  └─ TOTAL lojas/**/products/: ${totalStoreProducts}`);

    // Validar storeId em produtos raiz
    let productsWithoutStoreId = 0;
    let productsWithoutStock = 0;

    for (const doc of rootProducts.docs) {
      const data = doc.data();
      if (!data.storeId) productsWithoutStoreId++;
      if (data.quantidadeDisponível === undefined && data.quantidadeDisponivel === undefined) {
        productsWithoutStock++;
      }
    }

    REPORT.analysis.productFragmentation = {
      rootProducts: rootCount,
      storeProducts: totalStoreProducts,
      storeBreakdown,
      productsWithoutStoreId,
      productsWithoutStock,
      fragmented: rootCount > 0 && totalStoreProducts > 0,
    };

    if (productsWithoutStoreId > 0) {
      REPORT.issues.push(
        `⚠️ ${productsWithoutStoreId}/${rootCount} produtos em 'products' SEM storeId (risco isolamento)`
      );
    }

    if (rootCount > 0 && totalStoreProducts > 0) {
      REPORT.issues.push(
        `🔴 CRÍTICO: Produtos fragmentados em 2 coleções (${rootCount} raiz + ${totalStoreProducts} por loja)`
      );
    }
  } catch (error) {
    console.error(`  ✗ Erro: ${error.message}`);
    REPORT.analysis.productFragmentation = { error: error.message };
  }
}

async function analyzeCategoryDuplication() {
  console.log('\n📊 Analisando Categorias...');

  try {
    // Contar categorias por loja
    let totalLocalCategories = 0;
    for (const lojaDoc of (await db.collection('lojas').get()).docs) {
      const cats = await db
        .collection('lojas')
        .doc(lojaDoc.id)
        .collection('categories')
        .limit(500)
        .get();
      totalLocalCategories += cats.size;
    }

    // Contar categorias globais
    let totalGlobalCategories = 0;
    for (const userDoc of (await db.collection('users').limit(100).get()).docs) {
      const cats = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('globalCategories')
        .limit(500)
        .get();
      totalGlobalCategories += cats.size;
    }

    console.log(`  ├─ Categorias locais (por loja): ${totalLocalCategories}`);
    console.log(`  ├─ Categorias globais (por usuário): ${totalGlobalCategories}`);

    REPORT.analysis.categoryDuplication = {
      localCategories: totalLocalCategories,
      globalCategories: totalGlobalCategories,
      duplicated: totalLocalCategories > 0 && totalGlobalCategories > 0,
    };

    if (totalLocalCategories > 0 && totalGlobalCategories > 0) {
      REPORT.issues.push(
        `🟠 Categorias em 2 estruturas (${totalLocalCategories} local + ${totalGlobalCategories} global)`
      );
    }
  } catch (error) {
    console.error(`  ✗ Erro: ${error.message}`);
  }
}

async function validateSalesConsistency() {
  console.log('\n📊 Validando Vendas vs Produtos...');

  try {
    const sales = await db.collection('sales').limit(100).get();
    console.log(`  ├─ Total vendas (amostra 100): ${sales.size}`);

    let orphanedSales = 0;
    let salesByStoreId = {};

    for (const saleDoc of sales.docs) {
      const saleData = saleDoc.data();
      const storeId = saleData.storeId || 'unknown';
      salesByStoreId[storeId] = (salesByStoreId[storeId] || 0) + 1;

      if (saleData.productId) {
        const productSnap = await db.collection('products').doc(saleData.productId).get();
        if (!productSnap.exists()) {
          orphanedSales++;
        }
      }
    }

    console.log(`  └─ Vendas orfanadas (sem produto): ${orphanedSales}/${sales.size}`);

    REPORT.analysis.salesValidation = {
      totalSales: sales.size,
      orphanedSales,
      byStore: salesByStoreId,
    };

    if (orphanedSales > 0) {
      REPORT.issues.push(
        `⚠️ ${orphanedSales} vendas referenciam produtos inexistentes`
      );
    }
  } catch (error) {
    console.error(`  ✗ Erro: ${error.message}`);
  }
}

async function main() {
  console.log('🔐 FASE A — AUDITORIA FIRESTORE PreçoCerto');
  console.log('='.repeat(70));
  console.log(`Projeto: precocerto-cc04a`);
  console.log(`Iniciado: ${new Date().toISOString()}\n`);

  // Auditar coleções principais
  const topLevelCollections = [
    'lojas',
    'products',
    'sales',
    'customers',
    'stockMovements',
    'priceHistory',
    'businessSettings',
    'users',
    'financialTransactions',
    'expiryAlerts',
    'categories',
  ];

  console.log('📋 MAPEANDO COLEÇÕES:\n');
  for (const collectionPath of topLevelCollections) {
    await auditCollection(collectionPath);
  }

  // Análises especializadas
  console.log('\n' + '='.repeat(70));
  await analyzeProductFragmentation();
  await analyzeCategoryDuplication();
  await validateSalesConsistency();

  // Gerar recomendações
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMENDAÇÕES:\n');

  if (REPORT.analysis.productFragmentation.fragmented) {
    REPORT.recommendations.push(
      'FASE B: Unificar estrutura de produtos (raiz + estoque por loja)'
    );
    console.log('  1. ✓ Unificar produtos em única estrutura');
  }

  if (REPORT.analysis.productFragmentation.productsWithoutStoreId > 0) {
    REPORT.recommendations.push('Preencher storeId em todos os produtos');
    console.log('  2. ✓ Preencher storeId faltantes');
  }

  if (REPORT.analysis.categoryDuplication.duplicated) {
    REPORT.recommendations.push('FASE D: Escolher única estrutura de categorias (local ou global)');
    console.log('  3. ✓ Unificar categorias (local ou global)');
  }

  if (REPORT.analysis.salesValidation.orphanedSales > 0) {
    REPORT.recommendations.push('Limpar vendas órfãs antes de migração');
    console.log('  4. ✓ Limpar vendas órfãs');
  }

  // Resumo final
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO FINAL:\n');
  console.log(`  Total de documentos auditados: ${totalDocuments}`);
  console.log(`  Coleções mapeadas: ${Object.keys(REPORT.collections).length}`);
  console.log(`  Problemas encontrados: ${REPORT.issues.length}`);

  if (REPORT.issues.length > 0) {
    console.log('\n⚠️  PROBLEMAS CRÍTICOS:');
    REPORT.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    console.log('\n✅ Nenhum problema crítico detectado');
  }

  REPORT.status = 'completed';
  REPORT.totalDocuments = totalDocuments;

  // Salvar relatório
  const reportPath = '/tmp/claude-0/-home-user/4ad03096-0c86-5efa-8ab8-cc6931971a88/scratchpad/FASE-A-RELATORIO-COMPLETO.json';
  fs.writeFileSync(reportPath, JSON.stringify(REPORT, null, 2));
  console.log(`\n📁 Relatório salvo: ${reportPath}`);

  console.log('\n✅ AUDITORIA CONCLUÍDA');
  console.log('='.repeat(70));

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ ERRO FATAL:', error);
  REPORT.status = 'failed';
  REPORT.error = error.message;
  process.exit(1);
});
