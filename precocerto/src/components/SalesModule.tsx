import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  Plus,
  Trash2,
  DollarSign,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  hasIVA?: boolean;
  ivaPercentage?: number;
}

interface SalesModuleProps {
  products: Product[];
  onSaleComplete?: (items: SaleItem[], total: number) => void;
}

export default function SalesModule({ products, onSaleComplete }: SalesModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Filter products based on search
  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Add product to sale
  const handleAddProduct = () => {
    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) {
      alert("Selecione um produto e quantidade válida");
      return;
    }

    const qty = parseFloat(quantity);
    const unitPrice = selectedProduct.precoVendaRecomendado || 0;
    const subtotal = qty * unitPrice;

    const newItem: SaleItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.nome,
      quantity: qty,
      unitPrice,
      subtotal,
      hasIVA: selectedProduct.temIVA || false,
      ivaPercentage: selectedProduct.ivaPercentage || 0
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedProduct(null);
    setQuantity("");
    setSearchTerm("");
  };

  // Remove item from sale
  const handleRemoveItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalIVA = saleItems.reduce((sum, item) => {
    if (item.hasIVA && item.ivaPercentage) {
      return sum + (item.subtotal * item.ivaPercentage) / 100;
    }
    return sum;
  }, 0);
  const total = subtotal + totalIVA;

  // Handle sale completion
  const handleCompleteSale = async () => {
    if (saleItems.length === 0) {
      alert("Adicione produtos à venda");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Save sale to Firebase
      if (onSaleComplete) {
        onSaleComplete(saleItems, total);
      }

      setSuccessMessage("Venda registada com sucesso!");
      setSaleItems([]);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Erro ao registar venda:", error);
      alert("Erro ao registar venda");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Módulo de Vendas</h1>
        </div>
        <p className="text-slate-400">Sistema rápido para registar vendas e emitir recibos</p>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg flex items-center gap-3 text-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Search and Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Product */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <label className="block text-sm font-semibold text-white mb-3">
              Buscar Produto
            </label>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Digite nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

                {/* Autocomplete Dropdown - Busca Inteligente */}
            {searchTerm && filteredProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
              >
                {filteredProducts.slice(0, 8).map((product) => (
                  <motion.button
                    key={product.id}
                    whileHover={{ backgroundColor: "rgb(51, 65, 85)" }}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchTerm("");
                    }}
                    className="w-full px-4 py-3 text-left border-b border-slate-700/50 hover:bg-slate-700 transition-colors flex justify-between items-center group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">{product.nome}</p>
                      <p className="text-xs text-slate-400">{product.categoria}</p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="font-bold text-emerald-400">
                        Kz {product.precoVendaRecomendado?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-slate-500">{product.quantidade || 0} stock</p>
                    </div>
                  </motion.button>
                ))}
                {filteredProducts.length > 8 && (
                  <div className="px-4 py-2 text-center text-xs text-slate-400 bg-slate-700/30">
                    +{filteredProducts.length - 8} mais produtos
                  </div>
                )}
              </motion.div>
            )}

            {searchTerm && filteredProducts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center text-red-300 text-sm"
              >
                ❌ Nenhum produto encontrado para "{searchTerm}"
              </motion.div>
            )}

            {/* Selected Product Details */}
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-white">{selectedProduct.nome}</p>
                    <p className="text-sm text-slate-400">{selectedProduct.categoria}</p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-1 hover:bg-slate-700/50 rounded"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Preço Unitário</p>
                    <p className="text-lg font-bold text-emerald-400">
                      ${selectedProduct.precoVendaRecomendado?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Stock Disponível</p>
                    <p className="text-lg font-bold text-white">
                      {selectedProduct.quantidade || 0}
                    </p>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Quantidade"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddProduct}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sale Items List */}
          {saleItems.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Itens da Venda</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {saleItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{item.productName}</p>
                      <p className="text-sm text-slate-400">
                        {item.quantity} x ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right mr-3">
                      <p className="font-semibold text-emerald-400">
                        ${item.subtotal.toFixed(2)}
                      </p>
                      {item.hasIVA && (
                        <p className="text-xs text-yellow-400">IVA: {item.ivaPercentage}%</p>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary and Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-emerald-400 mb-4">Resumo da Venda</h3>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Subtotal</span>
                  <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
                </div>

                {totalIVA > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">IVA</span>
                    <span className="font-semibold text-yellow-400">${totalIVA.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-emerald-500/20 pt-3 flex justify-between">
                  <span className="font-semibold text-white">Total</span>
                  <span className="text-2xl font-bold text-emerald-400">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-emerald-500/20">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{saleItems.length}</p>
                  <p className="text-xs text-slate-400">Produtos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {saleItems.reduce((sum, item) => sum + item.quantity, 0).toFixed(0)}
                  </p>
                  <p className="text-xs text-slate-400">Unidades</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCompleteSale}
              disabled={saleItems.length === 0 || isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Receipt className="w-5 h-5" />
              )}
              {isLoading ? "Processando..." : "Finalizar Venda"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSaleItems([])}
              className="w-full py-3 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              Limpar
            </motion.button>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">Dica Profissional</p>
                <p>Produtos com IVA aparecem destacados. Revise antes de finalizar.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
