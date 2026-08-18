/**
 * Sales Stock Sync Service
 * Sincronização automática entre vendas e estoque
 * Fase 7: Sincronização de Vendas & Estoque
 */

import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Sale } from '../types/sales';
import { Product } from '../types';

/**
 * Reduzir estoque quando uma venda é registada
 */
export async function reduceStockOnSale(sale: Sale): Promise<void> {
  try {
    if (!sale.productId || !sale.storeId) {
      throw new Error('ProductId e StoreId são obrigatórios');
    }

    // Buscar produto atual para verificar stock disponível
    const productRef = doc(db, `lojas/${sale.storeId}/produtos/${sale.productId}`);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error(`Produto ${sale.productId} não encontrado`);
    }

    const currentProduct = productSnap.data() as Product;
    const currentStock = currentProduct.quantidadeDisponivel || 0;

    if (currentStock < sale.quantity) {
      throw new Error(
        `Stock insuficiente. Disponível: ${currentStock}, Solicitado: ${sale.quantity}`
      );
    }

    // Atualizar estoque do produto
    const newStock = currentStock - sale.quantity;
    const newQuantityVendida = (currentProduct.quantidadeVendida || 0) + sale.quantity;

    await updateDoc(productRef, {
      quantidadeDisponivel: newStock,
      quantidadeVendida: newQuantityVendida,
      dataAtualizacao: new Date().toISOString(),
    });

    console.log(
      `✅ [salesStockSyncService] Estoque reduzido para ${sale.productId}: ${currentStock} -> ${newStock}`
    );
  } catch (error) {
    console.error('❌ [salesStockSyncService] Erro ao reduzir estoque:', error);
    throw error;
  }
}

/**
 * Validar se há stock suficiente para uma venda
 */
export async function validateStockAvailability(
  storeId: string,
  productId: string,
  quantity: number
): Promise<{ available: boolean; currentStock: number; message: string }> {
  try {
    const productRef = doc(db, `lojas/${storeId}/produtos/${productId}`);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return {
        available: false,
        currentStock: 0,
        message: 'Produto não encontrado',
      };
    }

    const product = productSnap.data() as Product;
    const currentStock = product.quantidadeDisponível || 0;

    if (currentStock < quantity) {
      return {
        available: false,
        currentStock,
        message: `Stock insuficiente. Disponível: ${currentStock}, Solicitado: ${quantity}`,
      };
    }

    return {
      available: true,
      currentStock,
      message: 'Stock disponível',
    };
  } catch (error) {
    console.error('❌ [salesStockSyncService] Erro ao validar estoque:', error);
    return {
      available: false,
      currentStock: 0,
      message: 'Erro ao verificar estoque',
    };
  }
}

/**
 * Reverter venda (dev purposes ou devoluções)
 */
export async function reverseSaleStock(sale: Sale): Promise<void> {
  try {
    if (!sale.productId || !sale.storeId) {
      throw new Error('ProductId e StoreId são obrigatórios');
    }

    const productRef = doc(db, `lojas/${sale.storeId}/produtos/${sale.productId}`);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error(`Produto ${sale.productId} não encontrado`);
    }

    const currentProduct = productSnap.data() as Product;

    // Restaurar estoque
    const newStock = (currentProduct.quantidadeDisponível || 0) + sale.quantity;
    const newQuantityVendida = Math.max(0, (currentProduct.quantidadeVendida || 0) - sale.quantity);

    await updateDoc(productRef, {
      quantidadeDisponível: newStock,
      quantidadeVendida: newQuantityVendida,
      dataAtualizacao: new Date().toISOString(),
    });

    console.log(
      `✅ [salesStockSyncService] Estoque restaurado para ${sale.productId}: ${newStock}`
    );
  } catch (error) {
    console.error('❌ [salesStockSyncService] Erro ao restaurar estoque:', error);
    throw error;
  }
}

/**
 * Obter relatório de estoque por categoria
 */
export async function getStockByCategoryReport(
  storeId: string,
  categories?: string[]
): Promise<
  Array<{
    category: string;
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    lowStock: number;
    totalValue: number;
  }>
> {
  try {
    const productsRef = doc(db, `lojas/${storeId}`);
    const lojaSnap = await getDoc(productsRef);

    if (!lojaSnap.exists()) {
      return [];
    }

    const loja = lojaSnap.data();
    const productsList = (loja.produtos as Product[]) || [];

    const categoryMap = new Map<
      string,
      {
        category: string;
        totalProducts: number;
        inStock: number;
        outOfStock: number;
        lowStock: number;
        totalValue: number;
      }
    >();

    productsList.forEach((product) => {
      const category = product.categoria || 'Sem Categoria';

      if (categories && !categories.includes(category)) {
        return;
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          totalProducts: 0,
          inStock: 0,
          outOfStock: 0,
          lowStock: 0,
          totalValue: 0,
        });
      }

      const cat = categoryMap.get(category)!;
      cat.totalProducts++;

      const stock = product.quantidadeDisponível || 0;
      if (stock === 0) {
        cat.outOfStock++;
      } else if (stock < 10) {
        cat.lowStock++;
      } else {
        cat.inStock++;
      }

      cat.totalValue += (product.preco || 0) * stock;
    });

    return Array.from(categoryMap.values());
  } catch (error) {
    console.error('❌ [salesStockSyncService] Erro ao gerar relatório de estoque:', error);
    return [];
  }
}
