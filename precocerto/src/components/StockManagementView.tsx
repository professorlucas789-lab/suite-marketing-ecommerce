import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardList,
  Package,
  PackageCheck,
  PackageX,
  Save,
  Warehouse,
} from "lucide-react";
import type { Product } from "../types";
import type { StockAdjustmentType } from "../types/stock";
import { useStore } from "../contexts/StoreContext";
import { getOperationalUnitRules, getStoreOperationalUnitLabel } from "../utils/businessUnitMapping";
import {
  buildStockSummary,
  getProductAvailableStock,
  getProductMinimumStock,
  getProductStockValue,
} from "../utils/stockUtils";
import { formatKz } from "../utils";
import { adjustProductStock, transferProductStock } from "../services/stockMovementService";

interface StockManagementViewProps {
  products: Product[];
  userId: string;
  userName?: string;
  onNotification?: (message: string, type: "success" | "error") => void;
}

const movementLabels: Record<StockAdjustmentType, string> = {
  in: "Entrada",
  out: "Saída",
  correction: "Correção",
};

export default function StockManagementView({
  products,
  userId,
  userName,
  onNotification,
}: StockManagementViewProps) {
  const { currentStore, userStores } = useStore();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [destinationStoreId, setDestinationStoreId] = useState("");
  const [transferProductId, setTransferProductId] = useState(products[0]?.id || "");
  const [transferQuantity, setTransferQuantity] = useState("1");
  const [transferReason, setTransferReason] = useState("");
  const [loading, setLoading] = useState(false);

  const unitRules = getOperationalUnitRules(currentStore?.unitType);
  const summary = useMemo(() => buildStockSummary(products), [products]);
  const destinationStores = useMemo(
    () => userStores.filter((store) => store.id !== currentStore?.storeId && store.ativo !== false),
    [currentStore?.storeId, userStores]
  );

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const transferProduct = products.find((product) => product.id === transferProductId);
  const destinationStore = destinationStores.find((store) => store.id === destinationStoreId);

  useEffect(() => {
    const firstProductId = products[0]?.id || "";
    if (!selectedProductId && firstProductId) setSelectedProductId(firstProductId);
    if (!transferProductId && firstProductId) setTransferProductId(firstProductId);
  }, [products, selectedProductId, transferProductId]);

  const handleAdjustStock = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentStore || !selectedProduct?.id) return;
    setLoading(true);

    try {
      await adjustProductStock({
        productId: selectedProduct.id,
        storeId: currentStore.storeId,
        storeName: currentStore.storeName,
        adjustmentType,
        quantity: Number(quantity),
        reason,
        userId,
        userName,
      });
      setReason("");
      onNotification?.(`Stock atualizado: ${selectedProduct.nome}`, "success");
    } catch (error) {
      onNotification?.(error instanceof Error ? error.message : "Erro ao atualizar stock.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferStock = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentStore || !transferProduct?.id || !destinationStore) return;
    setLoading(true);

    try {
      await transferProductStock({
        productId: transferProduct.id,
        sourceStoreId: currentStore.storeId,
        sourceStoreName: currentStore.storeName,
        destinationStoreId: destinationStore.id,
        destinationStoreName: destinationStore.nome,
        quantity: Number(transferQuantity),
        reason: transferReason,
        userId,
        userName,
      });
      setTransferReason("");
      onNotification?.(`Transferência criada para ${destinationStore.nome}`, "success");
    } catch (error) {
      onNotification?.(error instanceof Error ? error.message : "Erro ao transferir stock.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!currentStore) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-500">
        Selecione uma unidade para gerir stock.
      </div>
    );
  }

  if (!unitRules.canManageStock) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-6">
        <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">Stock indisponível nesta unidade</h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          {currentStore.storeName} está configurada como {getOperationalUnitRules(currentStore.unitType).summary}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Stock</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentStore.storeName} · {getStoreOperationalUnitLabel({
                tipo: currentStore.storeType,
                unitType: currentStore.unitType,
              })}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Warehouse size={14} />
            {unitRules.summary}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Produtos", value: summary.totalProducts, icon: Package },
          { label: "Unidades", value: summary.totalUnits, icon: PackageCheck },
          { label: "Valor em stock", value: formatKz(summary.totalStockValue), icon: ClipboardList },
          { label: "Stock baixo", value: summary.lowStockProducts, icon: PackageX },
          { label: "Sem stock", value: summary.outOfStockProducts, icon: PackageX },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                <Icon size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form onSubmit={handleAdjustStock} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Ajuste de Stock</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Registe entradas, saídas internas ou correções de inventário.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Produto</label>
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nome} · {getProductAvailableStock(product)} disponível
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Movimento</label>
              <select
                value={adjustmentType}
                onChange={(event) => setAdjustmentType(event.target.value as StockAdjustmentType)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {Object.entries(movementLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                {adjustmentType === "correction" ? "Novo stock" : "Quantidade"}
              </label>
              <input
                type="number"
                min={adjustmentType === "correction" ? "0" : "0.01"}
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Motivo</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              required
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Ex: Entrada de fornecedor, inventário físico, perda interna."
            />
          </div>

          <button
            type="submit"
            disabled={loading || products.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            <Save size={16} />
            {loading ? "A guardar..." : "Guardar movimento"}
          </button>
        </form>

        <form onSubmit={handleTransferStock} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Transferência entre Unidades</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Baixa a unidade atual e cria o lote recebido na unidade destino.</p>
          </div>

          {!unitRules.canTransferStock && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
              Esta unidade pode gerir stock, mas não está autorizada a transferir para outras unidades.
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Produto</label>
            <select
              value={transferProductId}
              onChange={(event) => setTransferProductId(event.target.value)}
              disabled={!unitRules.canTransferStock}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.nome} · {getProductAvailableStock(product)} disponível
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Destino</label>
              <select
                value={destinationStoreId}
                onChange={(event) => setDestinationStoreId(event.target.value)}
                disabled={!unitRules.canTransferStock}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Selecionar unidade</option>
                {destinationStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.nome} · {getStoreOperationalUnitLabel(store)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Quantidade</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={transferQuantity}
                onChange={(event) => setTransferQuantity(event.target.value)}
                disabled={!unitRules.canTransferStock}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Motivo</label>
            <textarea
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
              rows={3}
              required
              disabled={!unitRules.canTransferStock}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Ex: Reposição do posto de venda, transferência do armazém."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !unitRules.canTransferStock || !destinationStoreId || products.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <ArrowRightLeft size={16} />
            {loading ? "A transferir..." : "Transferir stock"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Inventário da Unidade</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Produtos atualmente vinculados à unidade selecionada.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left">Produto</th>
                <th className="px-5 py-3 text-left">Categoria</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3 text-right">Mínimo</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((product) => {
                const stock = getProductAvailableStock(product);
                const minStock = getProductMinimumStock(product);
                const status =
                  stock <= 0 ? "Sem stock" : stock <= minStock ? "Baixo" : "Disponível";
                const statusClass =
                  stock <= 0
                    ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300"
                    : stock <= minStock
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300";

                return (
                  <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{product.nome}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{product.categoria || "Sem categoria"}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{stock}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{minStock}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatKz(getProductStockValue(product))}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>
                        <CheckCircle2 size={12} />
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhum produto com stock nesta unidade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
