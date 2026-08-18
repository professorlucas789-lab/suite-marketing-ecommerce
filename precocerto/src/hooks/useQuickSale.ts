/**
 * useQuickSale Hook
 * Hook para registar vendas rápidas de produtos
 * NOVO (Fase 13): Rastreamento de vendas
 */

import { useState } from 'react';
import { Product } from '../types';
import { Sale } from '../types/sales';

interface UseQuickSaleProps {
  products: Product[];
}

export function useQuickSale({ products }: UseQuickSaleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [recording, setRecording] = useState(false);

  const handleRecordSale = async (
    onSave: (sale: Sale, productId: string) => Promise<void>
  ) => {
    if (!selectedProduct || quantity === '' || parseFloat(quantity) <= 0) {
      alert('Selecione um produto e quantidade válida');
      return;
    }

    try {
      setRecording(true);

      const qty = parseFloat(quantity);
      const unitCost = selectedProduct.custoCompra || 0;
      const totalCost = unitCost * qty;

      // Usar preço customizado se fornecido, caso contrário usar preço recomendado
      const unitPrice = customPrice
        ? parseFloat(customPrice)
        : selectedProduct.precoVendaRecomendado || 0;

      const totalPrice = unitPrice * qty;
      const totalProfit = totalPrice - totalCost;
      const profitMargin =
        totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;

      const now = new Date();
      const sale: Sale = {
        id: `sale-${selectedProduct.id}-${Date.now()}`,
        storeId: selectedProduct.storeId || '',
        productId: selectedProduct.id!,
        productName: selectedProduct.nome,
        quantity: qty,
        unitPrice,
        totalPrice,
        unitCost,
        totalCost,
        profitPerUnit: unitPrice - unitCost,
        totalProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        timestamp: now.toISOString(),
        userId: selectedProduct.userId || 'unknown',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await onSave(sale, selectedProduct.id!);

      // Reset form
      setSelectedProduct(null);
      setQuantity('1');
      setCustomPrice('');
      setIsModalOpen(false);

      alert(`✅ Venda registada: ${qty} x ${selectedProduct.nome}`);
    } catch (error) {
      console.error('Erro ao registar venda:', error);
      alert('Erro ao registar venda');
    } finally {
      setRecording(false);
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
    selectedProduct,
    setSelectedProduct,
    quantity,
    setQuantity,
    customPrice,
    setCustomPrice,
    recording,
    handleRecordSale,
    suggestedPrice: selectedProduct?.precoVendaRecomendado || 0,
  };
}
