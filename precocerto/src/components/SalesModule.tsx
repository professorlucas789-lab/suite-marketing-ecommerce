import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Menu,
  Users,
} from "lucide-react";
import DocumentTypeSelector, {
  DocumentType,
} from "./DocumentTypeSelector";
import DocumentItemsTab from "./DocumentItemsTab";
import DocumentSettingsPanel from "./DocumentSettingsPanel";
import { useStore } from "../contexts/StoreContext";
import { useSalesTransaction } from "../hooks/useSalesTransaction";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  hasIVA?: boolean;
  ivaPercentage?: number;
}

interface ClientData {
  id: string;
  nome: string;
  nif?: string;
  local?: string;
}

interface SalesModuleProps {
  products: Product[];
  onSaleComplete?: (items: SaleItem[], total: number) => void;
}

interface DocumentSettings {
  emissionType: "fatura" | "recibo";
  requiresCustomer: boolean;
  requiresNIF: boolean;
  autoNumbering: boolean;
  documentPrefix: string;
  observationRequired: boolean;
}

export default function SalesModule({ products, onSaleComplete }: SalesModuleProps) {
  // Context
  const { currentStore, currentUser } = useStore();
  const { recordTransaction, isLoading: isSaving, error: saveError, successMessage: saveMessage } = useSalesTransaction();

  // State: Main sales data
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [quantity, setQuantity] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // State: Client selection
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // State: Document & UI
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>("fatura-recibo");
  const [settings, setSettings] = useState<DocumentSettings>({
    emissionType: "recibo",
    requiresCustomer: false,
    requiresNIF: false,
    autoNumbering: true,
    documentPrefix: "REC",
    observationRequired: false,
  });

  const [activeMenu, setActiveMenu] = useState<"alterar" | "itens" | "definicoes" | null>(
    null
  );

  // Show save message when transaction completes
  useEffect(() => {
    if (saveMessage) {
      setSuccessMessage(saveMessage);
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  }, [saveMessage]);

  // Mock clients data - In production, this would come from Firebase
  const mockClients: ClientData[] = [
    {
      id: "1",
      nome: "Empresa ABC",
      nif: "1234567890",
      local: "Luanda, Angola",
    },
    {
      id: "2",
      nome: "João Silva",
      nif: "0987654321",
      local: "Benguela, Angola",
    },
    {
      id: "3",
      nome: "Maria Santos",
      nif: "1357924680",
      local: "Huambo, Angola",
    },
  ];

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
      productId: selectedProduct.id || "",
      productName: selectedProduct.nome,
      quantity: qty,
      unitPrice,
      subtotal,
      hasIVA: selectedProduct.temIVA || false,
      ivaPercentage: selectedProduct.ivaPercentage || 0,
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedProduct(null);
    setQuantity("");
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

    if (settings.requiresCustomer && !selectedClient) {
      alert("Selecione um cliente para finalizar a venda");
      return;
    }

    if (settings.requiresNIF && !selectedClient?.nif) {
      alert("NIF do cliente é obrigatório");
      return;
    }

    if (!currentStore) {
      alert("Loja não configurada");
      return;
    }

    if (!currentUser) {
      alert("Utilizador não autenticado");
      return;
    }

    try {
      // Record transaction to Firebase
      const result = await recordTransaction({
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || "Unknown",
        customerName: selectedClient?.nome,
        customerNif: selectedClient?.nif,
        customerId: selectedClient?.id,
        paymentMethod: "cash", // TODO: Add payment method selection
        documentType: selectedDocument === "fatura-recibo" ? "receipt" : "internal_receipt",
        items: saleItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      if (result) {
        // Call original callback
        if (onSaleComplete) {
          onSaleComplete(saleItems, total);
        }

        // Clear form
        setSaleItems([]);
        setSelectedClient(null);
        setSelectedProduct(null);
        setQuantity("");
      } else {
        alert("Erro ao registar venda: " + (saveError || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro ao registar venda:", error);
      alert("Erro ao registar venda");
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
        <p className="text-slate-400">ERP - Sistema profissional para registar vendas e emitir documentos</p>
      </div>

      {/* Messages */}
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
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400"
          >
            <AlertCircle className="w-5 h-5" />
            {saveError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Menu Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <DocumentTypeSelector
          selectedDocument={selectedDocument}
          onDocumentChange={setSelectedDocument}
        />
        <button
          onClick={() =>
            setActiveMenu(activeMenu === "itens" ? null : "itens")
          }
          className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Itens</span>
          <span className="sm:hidden">({saleItems.length})</span>
        </button>
        <button
          onClick={() =>
            setActiveMenu(activeMenu === "definicoes" ? null : "definicoes")
          }
          className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Definições</span>
        </button>

        {/* Total Display (Right side) */}
        <div className="ml-auto flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
          <span className="text-xs text-slate-400">Total:</span>
          <span className="text-lg font-bold text-emerald-400">
            Kz {total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Expandable Menus */}
      <AnimatePresence>
        {activeMenu === "itens" && (
          <DocumentItemsTab
            items={saleItems}
            onRemoveItem={handleRemoveItem}
            isExpanded={true}
            onToggleExpand={() => setActiveMenu(null)}
          />
        )}
        {activeMenu === "definicoes" && (
          <DocumentSettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            isExpanded={true}
            onToggleExpand={() => setActiveMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ==================== LEFT COLUMN: CLIENT ==================== */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Cliente
            </h2>

            {/* Client Selector Dropdown */}
            <div className="relative mb-4">
              <button
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <span className={selectedClient ? "text-white" : "text-slate-400"}>
                  {selectedClient ? selectedClient.nome : "Selecione cliente..."}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showClientDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showClientDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-40 max-h-48 overflow-y-auto"
                  >
                    {mockClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowClientDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/50 transition-colors ${
                          selectedClient?.id === client.id
                            ? "bg-emerald-500/20 border-l-2 border-emerald-500"
                            : ""
                        }`}
                      >
                        <p className="font-medium text-white">{client.nome}</p>
                        <p className="text-xs text-slate-400">{client.nif}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Client Details (Auto-loaded) */}
            {selectedClient && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
              >
                <div>
                  <p className="text-xs text-slate-400 mb-1">Nome</p>
                  <p className="font-medium text-white">{selectedClient.nome}</p>
                </div>
                {selectedClient.nif && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">NIF</p>
                    <p className="font-medium text-white">{selectedClient.nif}</p>
                  </div>
                )}
                {selectedClient.local && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Localização</p>
                    <p className="font-medium text-white">{selectedClient.local}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ==================== MIDDLE COLUMN: PRODUCTS ==================== */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Produtos</h2>

            {/* Product Selector */}
            <div className="relative mb-4">
              <button
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <span className={selectedProduct ? "text-white" : "text-slate-400"}>
                  {selectedProduct ? selectedProduct.nome : "Selecione produto..."}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Product Dropdown */}
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-40 max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full px-4 py-3 text-left border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/50 transition-colors flex justify-between items-center group ${
                      selectedProduct?.id === product.id
                        ? "bg-emerald-500/20 border-l-2 border-emerald-500"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                        {product.nome}
                      </p>
                      <p className="text-xs text-slate-400">{product.categoria}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-bold text-emerald-400 text-sm">
                        Kz {product.precoVendaRecomendado?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product.quantidade || 0} stock
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div>
                  <p className="text-xs text-slate-400 mb-2">Quantidade</p>
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
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </motion.button>
                  </div>
                </div>

                {/* Product Info Card */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Preço Unit.</p>
                      <p className="font-bold text-emerald-400">
                        Kz {selectedProduct.precoVendaRecomendado?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Stock</p>
                      <p className="font-bold text-white">
                        {selectedProduct.quantidade || 0}
                      </p>
                    </div>
                  </div>
                  {selectedProduct.temIVA && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                      <p className="text-xs text-yellow-400 font-medium">
                        ⚠️ IVA {selectedProduct.ivaPercentage}%
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN: SUMMARY (ESSENTIALS ONLY) ==================== */}
        <div className="md:sticky md:top-6 space-y-4">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-emerald-400 mb-6">Resumo Essencial</h3>

            <div className="space-y-4 mb-6">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Subtotal</span>
                <span className="font-semibold text-white text-lg">
                  Kz {subtotal.toFixed(2)}
                </span>
              </div>

              {/* IVA (only if > 0) */}
              {totalIVA > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">IVA</span>
                  <span className="font-semibold text-yellow-400 text-lg">
                    Kz {totalIVA.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total (Highlighted) */}
              <div className="border-t border-emerald-500/20 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-3xl font-bold text-emerald-400">
                    Kz {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Item Count */}
            {saleItems.length > 0 && (
              <div className="py-3 px-3 bg-slate-700/50 rounded text-center">
                <p className="text-xs text-slate-400 mb-1">Itens</p>
                <p className="text-xl font-bold text-white">{saleItems.length}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCompleteSale}
            disabled={saleItems.length === 0 || isSaving}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Receipt className="w-5 h-5" />
            )}
            {isSaving ? "Processando..." : "Finalizar Venda"}
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
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <p className="font-semibold mb-1">Dica</p>
              <p>Produtos com IVA aparecem marcados com ⚠️</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
