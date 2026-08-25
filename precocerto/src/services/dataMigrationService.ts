/**
 * Data Migration Service
 * Serviço para migração de dados legados para novo sistema de categorias globais
 * NOVO (Fase 15): Migração de dados Phase 14
 *
 * Funções:
 * 1. Migrar categorias locais para categorias globais
 * 2. Atualizar produtos para usar categorias globais
 * 3. Validar integridade dos dados
 * 4. Gerar relatório de migração
 */

import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { CategoryMarginConfig } from '../types/category';
import { Product } from '../types';

interface MigrationStats {
  totalStores: number;
  totalCategoriesMigrated: number;
  totalProductsUpdated: number;
  failedMigrations: string[];
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Migrar todas as categorias locais de um utilizador para escopo global
 *
 * Passos:
 * 1. Obter todas as lojas do utilizador
 * 2. Para cada loja, obter categorias locais
 * 3. Criar cópia global de cada categoria
 * 4. Atualizar produtos para referenciar categorias globais
 * 5. Manter categorias locais como fallback (compatibilidade)
 */
export async function migrateUserCategoriesToGlobal(userId: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalStores: 0,
    totalCategoriesMigrated: 0,
    totalProductsUpdated: 0,
    failedMigrations: [],
    startTime: new Date(),
    status: 'in_progress',
  };

  try {
    console.log(`🔄 Iniciando migração de categorias para utilizador: ${userId}`);

    // 1. Obter todas as lojas do utilizador
    const storesQuery = query(
      collection(db, 'lojas'),
      where('ownerId', '==', userId)
    );
    const storesSnapshot = await getDocs(storesQuery);
    stats.totalStores = storesSnapshot.docs.length;
    console.log(`📦 Encontradas ${stats.totalStores} lojas do utilizador`);

    // 2. Para cada loja, migrar categorias
    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id;
      console.log(`\n🏪 Processando loja: ${storeId}`);

      try {
        // Obter categorias locais da loja
        const categoriesQuery = query(
          collection(db, 'lojas', storeId, 'categories'),
          where('storeId', '==', storeId)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);

        // 3. Criar cópia global de cada categoria
        const batch = writeBatch(db);
        const localCategoryMap = new Map<string, string>(); // old ID -> new ID

        for (const categoryDoc of categoriesSnapshot.docs) {
          const localCategory = categoryDoc.data() as CategoryMarginConfig;
          const globalCategoryId = doc(collection(db, 'users', userId, 'globalCategories')).id;
          const now = new Date().toISOString();

          const globalCategory: CategoryMarginConfig = {
            id: globalCategoryId,
            storeId: 'global', // Marcar como global
            name: localCategory.name,
            businessType: localCategory.businessType,
            description: localCategory.description,
            color: localCategory.color,
            icon: localCategory.icon,
            marginRules: localCategory.marginRules,
            priceStrategy: localCategory.priceStrategy,
            regulatoryConstraints: localCategory.regulatoryConstraints,
            historicalData: localCategory.historicalData,
            createdAt: now,
            updatedAt: now,
          };

          batch.set(
            doc(db, 'users', userId, 'globalCategories', globalCategoryId),
            globalCategory
          );

          localCategoryMap.set(localCategory.id, globalCategoryId);
          stats.totalCategoriesMigrated++;
          console.log(`  ✅ Categoria migrada: ${localCategory.name}`);
        }

        // Executar batch de criação de categorias globais
        await batch.commit();

        // 4. Atualizar produtos para referenciar categorias globais
        const productsQuery = query(
          collection(db, 'lojas', storeId, 'produtos'),
          where('storeId', '==', storeId)
        );
        const productsSnapshot = await getDocs(productsQuery);

        const productBatch = writeBatch(db);
        let productsInBatch = 0;

        for (const productDoc of productsSnapshot.docs) {
          const product = productDoc.data() as Product;

          // Se produto tem categoryId local, atualizar para global
          if (product.categoryId && localCategoryMap.has(product.categoryId)) {
            const newCategoryId = localCategoryMap.get(product.categoryId);

            productBatch.update(
              doc(db, 'lojas', storeId, 'produtos', productDoc.id),
              {
                categoryId: newCategoryId,
                updatedAt: new Date().toISOString(),
                migratedToGlobalCategories: true,
              }
            );

            stats.totalProductsUpdated++;
            productsInBatch++;

            // Executar batch a cada 500 operações (limite do Firestore)
            if (productsInBatch >= 500) {
              await productBatch.commit();
              productsInBatch = 0;
            }
          }
        }

        // Executar batch final se houver operações pendentes
        if (productsInBatch > 0) {
          await productBatch.commit();
        }

        console.log(`  ✅ ${stats.totalProductsUpdated} produtos atualizados`);
      } catch (storeError) {
        const errorMsg = storeError instanceof Error ? storeError.message : 'Erro desconhecido';
        stats.failedMigrations.push(`Loja ${storeId}: ${errorMsg}`);
        console.error(`  ❌ Erro ao processar loja ${storeId}:`, storeError);
      }
    }

    stats.endTime = new Date();
    stats.status = 'completed';

    console.log(`\n✅ Migração concluída!`);
    console.log(`📊 Resumo:
      - Lojas processadas: ${stats.totalStores}
      - Categorias migradas: ${stats.totalCategoriesMigrated}
      - Produtos atualizados: ${stats.totalProductsUpdated}
      - Erros: ${stats.failedMigrations.length}`);

    return stats;
  } catch (error) {
    stats.endTime = new Date();
    stats.status = 'failed';
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    stats.failedMigrations.push(`Erro geral: ${errorMsg}`);
    console.error('❌ Erro fatal durante migração:', error);
    throw error;
  }
}

/**
 * Validar integridade dos dados após migração
 * Verifica se todos os produtos referenciam categorias válidas
 */
export async function validateMigrationIntegrity(userId: string): Promise<{
  isValid: boolean;
  orphanedProducts: string[];
  inconsistencies: string[];
}> {
  const result = {
    isValid: true,
    orphanedProducts: [] as string[],
    inconsistencies: [] as string[],
  };

  try {
    console.log(`🔍 Validando integridade de dados para: ${userId}`);

    // Obter todas as categorias globais do utilizador
    const globalCategoriesQuery = query(
      collection(db, 'users', userId, 'globalCategories')
    );
    const globalCategoriesSnapshot = await getDocs(globalCategoriesQuery);
    const validCategoryIds = new Set(globalCategoriesSnapshot.docs.map(doc => doc.id));

    console.log(`  ✅ ${validCategoryIds.size} categorias globais válidas`);

    // Obter todas as lojas do utilizador
    const storesQuery = query(
      collection(db, 'lojas'),
      where('ownerId', '==', userId)
    );
    const storesSnapshot = await getDocs(storesQuery);

    // Para cada loja, verificar produtos
    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id;

      const productsQuery = query(
        collection(db, 'lojas', storeId, 'produtos'),
        where('storeId', '==', storeId)
      );
      const productsSnapshot = await getDocs(productsQuery);

      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data() as Product;

        // Verificar se produto tem categoryId e se é válido
        if (product.categoryId && !validCategoryIds.has(product.categoryId)) {
          result.orphanedProducts.push(`${storeId}/${productDoc.id}: categoria inválida`);
          result.isValid = false;
        }

        // Verificar inconsistências
        if (!product.migratedToGlobalCategories && product.categoryId) {
          result.inconsistencies.push(
            `${storeId}/${productDoc.id}: não marcado como migrado`
          );
        }
      }
    }

    if (result.isValid) {
      console.log(`✅ Validação OK - Sem problemas detectados`);
    } else {
      console.warn(`⚠️ Validação encontrou problemas:
        - Produtos órfãos: ${result.orphanedProducts.length}
        - Inconsistências: ${result.inconsistencies.length}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    throw error;
  }
}

/**
 * Gerar relatório detalhado da migração
 * Para auditoria e troubleshooting
 */
export function generateMigrationReport(stats: MigrationStats): string {
  const duration = stats.endTime
    ? Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000)
    : 0;

  let report = `
╔════════════════════════════════════════════════════════════════╗
║               RELATÓRIO DE MIGRAÇÃO DE CATEGORIAS              ║
╚════════════════════════════════════════════════════════════════╝

📊 RESUMO EXECUTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Status: ${stats.status.toUpperCase()}
  Data Início: ${stats.startTime.toLocaleString('pt-PT')}
  Data Fim: ${stats.endTime ? stats.endTime.toLocaleString('pt-PT') : 'N/A'}
  Duração: ${duration}s

📈 ESTATÍSTICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ Lojas Processadas:        ${stats.totalStores}
  ✅ Categorias Migradas:      ${stats.totalCategoriesMigrated}
  ✅ Produtos Atualizados:     ${stats.totalProductsUpdated}
  ❌ Erros/Falhas:             ${stats.failedMigrations.length}

`;

  if (stats.failedMigrations.length > 0) {
    report += `⚠️ ERROS ENCONTRADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    stats.failedMigrations.forEach((error, index) => {
      report += `  ${index + 1}. ${error}\n`;
    });
  }

  report += `
✅ PRÓXIMOS PASSOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Validar integridade dos dados (validateMigrationIntegrity)
  2. Testar categorias globais em produção
  3. Atualizar Firestore Security Rules
  4. Monitorar logs para erros
  5. Fazer backup de categorias locais (segurança)

╔════════════════════════════════════════════════════════════════╗
║                      FIM DO RELATÓRIO                         ║
╚════════════════════════════════════════════════════════════════╝
`;

  return report;
}
