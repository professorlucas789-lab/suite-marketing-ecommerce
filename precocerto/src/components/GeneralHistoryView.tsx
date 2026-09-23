import React, { useState, useEffect } from "react";
import { PriceHistory, Product, BusinessSettings } from "../types";
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { formatKz } from "../utils";
import { motion } from "motion/react";
import { 
  History, 
  Search, 
  Calendar, 
  Tag, 
  X, 
  TrendingUp, 
  ArrowUpDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle 
} from "lucide-react";

interface GeneralHistoryViewProps {
  products: Product[];
  settings: BusinessSettings | null;
  userId: string;
}

export default function GeneralHistoryView({ products, settings, userId }: GeneralHistoryViewProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");

  const [syncing, setSyncing] = useState<boolean>(false);

  const handleSyncInitialHistory = async () => {
    if (products.length === 0 || !userId) return;
    setSyncing(true);
    try {
      const productsWithoutHistory = products.filter(
        p => !history.some(h => h.productId === p.id)
      );

      if (productsWithoutHistory.length === 0) {
        setSyncing(false);
        return;
      }

      const promises = productsWithoutHistory.map((product) => {
        const initialPrice = product.venderEmbalagemInteira === false && product.precoRecomendadoUnidadeVenda !== undefined
          ? product.precoRecomendadoUnidadeVenda
          : product.precoVendaRecomendado;

        const initialCost = product.custoRealUnidadeVenda !== undefined
          ? product.custoRealUnidadeVenda
          : (product.custoCompra + (product.custoTransporte || 0) + (product.custoEmbalagem || 0) + (product.outrosCustos || 0)) / (product.quantidade || 1);

        const initialMargin = product.margemReal || 0;
        const initialROI = product.roi || 0;
        const initialProfit = product.venderEmbalagemInteira === false && product.lucroUnidadeVenda !== undefined
          ? product.lucroUnidadeVenda
          : product.lucroEstimado;

        return addDoc(collection(db, "priceHistory"), {
          productId: product.id,
          productName: product.nome,
          productCategory: product.categoria || "Outros",
          userId: userId,
          previousPrice: 0,
          newPrice: Math.round((initialPrice || 0) * 100) / 100,
          previousCost: 0,
          newCost: Math.round((initialCost || 0) * 100) / 100,
          previousMargin: 0,
          newMargin: Math.round((initialMargin || 0) * 100) / 100,
          previousROI: 0,
          newROI: Math.round((initialROI || 0) * 100) / 100,
          previousProfit: 0,
          newProfit: Math.round((initialProfit || 0) * 100) / 100,
          changeReason: "Histórico Inicial Importado",
          createdAt: product.createdAt || new Date().toISOString()
        });
      });

      await Promise.all(promises);
    } catch (err) {
      console.error("Error syncing history: ", err);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch full history for user in real-time
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const q = query(
      collection(db, "priceHistory"),
      where("userId", "==", userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyList: PriceHistory[] = [];
      snapshot.forEach((docSnap) => {
        historyList.push({ id: docSnap.id, ...docSnap.data() } as PriceHistory);
      });
      setHistory(historyList);
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, "priceHistory");
    });
    return () => unsubscribe();
  }, [userId]);

  // Extract unique change reasons for filtering dropdown
  const uniqueReasons = Array.from(new Set(history.map(h => h.changeReason).filter(Boolean)));

  // Filter & Sort logic
  const filteredHistory = history.filter((item) => {
    // 1. Product Filter
    if (selectedProductId && item.productId !== selectedProductId) {
      return false;
    }

    // 2. Reason Filter
    if (selectedReason && item.changeReason !== selectedReason) {
      return false;
    }

    // 3. Period Filter
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime < startDateTime) return false;
    }
    if (endDate) {
      // Add 23h 59m 59s to end date to include the whole day
      const endDateTime = new Date(endDate + "T23:59:59").getTime();
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime > endDateTime) return false;
    }

    return true;
  });

  // Sort
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === "recent" ? timeB - timeA : timeA - timeB;
  });

  // Calculate high level summaries
  const totalAlterations = sortedHistory.length;
  
  const positiveChanges = sortedHistory.filter(h => h.newPrice > h.previousPrice).length;
  const negativeChanges = sortedHistory.filter(h => h.newPrice < h.previousPrice).length;

  const averageVariation = sortedHistory.length > 0
    ? sortedHistory.reduce((acc, curr) => acc + (curr.newPrice - curr.previousPrice), 0) / sortedHistory.length
    : 0;

  const productsWithoutHistory = !loading && products.length > 0
    ? products.filter(p => !history.some(h => h.productId === p.id))
    : [];

  const clearFilters = () => {
    setSelectedProductId("");
    setSelectedReason("");
    setStartDate("");
    setEndDate("");
    setSortOrder("recent");
  };

  return (
    <div id="general-history-container" className="space-y-6">
      
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-indigo-50/50 to-indigo-100/10 dark:from-slate-800/20 dark:to-slate-900/10 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="text-indigo-600 dark:text-indigo-400" size={22} />
            <span>Histórico de Alterações de Preços</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe a evolução, motivos e impactos das mudanças de precificação efetuadas em todo o seu inventário.
          </p>
        </div>
        
        {totalAlterations > 0 && (
          <button
            id="clear-filters-btn"
            onClick={clearFilters}
            className="self-start md:self-auto px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X size={14} />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      {/* Sync history warning banner if products without history detected */}
      {productsWithoutHistory.length > 0 && (
        <motion.div
          id="sync-history-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-pulse" size={20} />
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Sincronização de Histórico Pendente</h4>
              <p className="text-xs text-indigo-700/90 dark:text-indigo-300/90 leading-relaxed">
                Identificamos que <span className="font-bold">{productsWithoutHistory.length}</span> dos seus produtos cadastrados ainda não possuem registo inicial de precificação no histórico. Gostaria de gerar os registos iniciais automaticamente?
              </p>
            </div>
          </div>
          <button
            id="sync-initial-history-btn"
            onClick={handleSyncInitialHistory}
            disabled={syncing}
            className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-950/50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/15 cursor-pointer transition-all flex items-center gap-2"
          >
            {syncing ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <History size={14} />
                <span>Gerar Histórico Inicial</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <History size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Total de Alterações</span>
            <span className="text-lg font-extrabold text-slate-850 dark:text-slate-100 font-mono">{totalAlterations}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Ajustes Positivos</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-450 font-mono">{positiveChanges}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <ArrowDownRight size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Ajustes Negativos</span>
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">{negativeChanges}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider font-sans">Variação Média</span>
            <span className={`text-lg font-extrabold font-mono ${averageVariation > 0 ? "text-emerald-600 dark:text-emerald-400" : averageVariation < 0 ? "text-rose-600" : "text-slate-500"}`}>
              {averageVariation > 0 ? "+" : ""}{formatKz(averageVariation)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
          <Search size={14} />
          <span>Filtros Dinâmicos</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Product Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Filtrar por Produto</label>
            <select
              id="filter-product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-colors"
            >
              <option value="">Todos os Produtos</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Reason Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Filtrar por Motivo</label>
            <select
              id="filter-reason-select"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-colors"
            >
              <option value="">Todos os Motivos</option>
              {uniqueReasons.map((reason, idx) => (
                <option key={idx} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Period: Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase flex items-center gap-1">
              <Calendar size={11} />
              <span>Início do Período</span>
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-colors"
            />
          </div>

          {/* Period: End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase flex items-center gap-1">
              <Calendar size={11} />
              <span>Fim do Período</span>
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-colors"
            />
          </div>

          {/* Order Direction */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase flex items-center gap-1">
              <ArrowUpDown size={11} />
              <span>Ordenação</span>
            </label>
            <select
              id="filter-sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-colors"
            >
              <option value="recent">Mais Recentes Primeiro</option>
              <option value="oldest">Mais Antigos Primeiro</option>
            </select>
          </div>

        </div>
      </div>

      {/* History Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Carregando histórico...</div>
        ) : sortedHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <span className="text-3xl block">⏳</span>
            <p className="text-xs font-semibold">Nenhum registo de histórico encontrado para os filtros selecionados.</p>
            <p className="text-[10px] text-slate-450">Tente ajustar ou limpar os filtros para visualizar mais registos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Data & Hora</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Anterior</th>
                  <th className="py-3.5 px-4">Novo Preço</th>
                  <th className="py-3.5 px-4">Variação</th>
                  <th className="py-3.5 px-4">Margem Real</th>
                  <th className="py-3.5 px-4">ROI</th>
                  <th className="py-3.5 px-5">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs font-mono">
                {sortedHistory.map((item, idx) => {
                  const priceDiff = item.newPrice - item.previousPrice;
                  const priceDiffPct = item.previousPrice > 0 ? (priceDiff / item.previousPrice) * 100 : 0;
                  
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-5 text-slate-500 font-sans whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("pt-AO")} {new Date(item.createdAt).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 font-sans">
                        {item.productName || "Produto Desconhecido"}
                        <span className="block text-[9px] font-normal text-slate-400 mt-0.5">{item.productCategory || "Geral"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatKz(item.previousPrice)}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                        {formatKz(item.newPrice)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-bold inline-flex items-center px-1.5 py-0.5 rounded text-[9px] ${
                          priceDiff > 0 
                            ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/10" 
                            : priceDiff < 0 
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/10"
                            : "bg-slate-50 dark:bg-slate-850 text-slate-500"
                        }`}>
                          {priceDiff > 0 ? "+" : ""}{priceDiffPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-350">
                        {item.previousMargin.toFixed(1)}% → <span className="font-bold text-slate-900 dark:text-slate-100">{item.newMargin.toFixed(1)}%</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-350">
                        {item.previousROI.toFixed(1)}% → <span className="font-bold text-slate-900 dark:text-slate-100">{item.newROI.toFixed(1)}%</span>
                      </td>
                      <td className="py-3.5 px-5 font-sans whitespace-normal break-words max-w-[160px]">
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 px-2 py-0.5 rounded-md">
                          {item.changeReason || "Sem motivo informado"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
