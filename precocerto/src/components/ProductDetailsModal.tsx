import React, { useState, useEffect } from "react";
import { Product, PriceHistory } from "../types";
import { formatKz, getPriceHealth, evaluateAlternativePrice } from "../utils";
import { BUSINESS_MODULES } from "../utils/modules";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion } from "motion/react";
import { 
  X, 
  TrendingUp, 
  Coins, 
  Calculator, 
  Info,
  Layers,
  Archive,
  AlertTriangle,
  HeartPulse
} from "lucide-react";

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailsModal({ product, onClose }: ProductDetailsModalProps) {
  // Navigation tab for the modal
  const [activeModalTab, setActiveModalTab] = useState<"details" | "history">("details");

  // Real-time price history state
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!product.id) return;
    setHistoryLoading(true);
    
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const q = query(
      collection(db, "priceHistory"),
      where("productId", "==", product.id),
      where("userId", "==", uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData: PriceHistory[] = [];
      snapshot.forEach((docSnap) => {
        historyData.push({ id: docSnap.id, ...docSnap.data() } as PriceHistory);
      });
      // Sort descending by date
      historyData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setHistory(historyData);
      setHistoryLoading(false);
    }, (err) => {
      setHistoryLoading(false);
      handleFirestoreError(err, OperationType.GET, `priceHistory (productId: ${product.id})`);
    });
    return () => unsubscribe();
  }, [product.id]);

  // Simulator state (Section E)
  const [testPrice, setTestPrice] = useState<string>("");
  
  // Reverse calculator state (Section E)
  const [desiredProfit, setDesiredProfit] = useState<string>("");
  const [desiredPrice, setDesiredPrice] = useState<string>("");

  const q = product.quantidade && product.quantidade > 0 ? product.quantidade : 1;

  // Recalculating base and variables for robust display
  const baseUnitCost = ((product.custoCompra || 0) + 
    (product.custoTransporte || 0) + 
    (product.custoEmbalagem || 0) + 
    (product.outrosCustos || 0)) / q;

  const variablesAndFixedUnit = (product.comissaoVenda || 0) +
    (product.taxaBancaria || 0) +
    (product.taxaMarketplace || 0) +
    (product.custoPublicidade || 0) +
    (product.custoEntrega || 0) +
    (product.combustivel || 0) +
    (product.impostoTaxa || 0) +
    (product.perdasDesperdicios || 0) +
    (product.energia || 0) +
    (product.internet || 0) +
    (product.renda || 0) +
    (product.salario || 0) +
    (product.agua || 0) +
    (product.contabilidade || 0) +
    (product.seguranca || 0) +
    (product.outrosCustosFixos || 0);

  const custoTotalReal = baseUnitCost + variablesAndFixedUnit;
  const custoRealUnidade = product.custoRealUnidadeVenda !== undefined ? product.custoRealUnidadeVenda : custoTotalReal;

  // Real-time Simulation
  const parsedTestPrice = parseFloat(testPrice);
  const simulation = !isNaN(parsedTestPrice) && parsedTestPrice > 0
    ? evaluateAlternativePrice(custoRealUnidade, parsedTestPrice)
    : null;

  // Desired Profit calculator
  const parsedDesiredProfit = parseFloat(desiredProfit);
  const calculatedPriceA = !isNaN(parsedDesiredProfit) && parsedDesiredProfit >= 0
    ? custoRealUnidade + parsedDesiredProfit
    : null;

  // Desired Price calculator
  const parsedDesiredPrice = parseFloat(desiredPrice);
  const simulationB = !isNaN(parsedDesiredPrice) && parsedDesiredPrice > 0
    ? evaluateAlternativePrice(custoRealUnidade, parsedDesiredPrice)
    : null;

  // Active Health
  const currentHealth = getPriceHealth(product.lucroEstimado, product.margemReal);

  // Dynamic additional attributes resolver for Section D
  const getActiveModuleAttributes = () => {
    const list: { label: string; value: string | number }[] = [];
    
    // Direct maps based on types
    const fieldsMap: Record<string, string> = {
      marca: "Marca",
      modelo: "Modelo / Referência",
      cor: "Cor",
      tamanho: "Tamanho",
      colecao: "Coleção / Estação",
      genero: "Género",
      ean: "Código de Barras (EAN)",
      pesoLiquido: "Peso Líquido",
      gramagem: "Gramagem",
      especificacoes: "Especificações",
      numSerie: "Número de Série",
      prazoGarantia: "Garantia (Meses)",
      material: "Material",
      validadeCosmetico: "Data de Validade Cosmético",
      tipoConcentracao: "Concentração",
      volumeMl: "Volume (ml)",
      teorAlcoolico: "Teor Alcoólico",
      quantidadeMinima: "Quantidade Mínima (MOQ)",
      precoAtacado: "Preço de Atacado",
      precoRetalho: "Preço de Retalho",
      prazoEntrega: "Prazo de Entrega",
      localizacaoArmazem: "Armazém / Localização",
      condicaoConservacao: "Conservação / Armazenagem",
      prazoValidadeGeral: "Prazo de Validade Geral",
      restauranteReceita: "Nome da Receita",
      restauranteIngredientes: "Ingredientes Principais",
      restaurantePeso: "Peso do Prato (g)",
      restauranteRendimento: "Rendimento",
      ingredientesPrincipais: "Ingredientes",
      tempoPreparo: "Tempo de Preparo (min)"
    };

    Object.entries(fieldsMap).forEach(([key, label]) => {
      const val = (product as any)[key];
      if (val !== undefined && val !== null && val !== "") {
        list.push({ label, value: val });
      }
    });

    return list;
  };

  const extraAttributes = getActiveModuleAttributes();

  // Evolution indicators & Chart data points
  const currentPrice = product.venderEmbalagemInteira === false && product.precoRecomendadoUnidadeVenda !== undefined
    ? product.precoRecomendadoUnidadeVenda
    : product.precoVendaRecomendado;

  const chronologicalHistory = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const allPrices = chronologicalHistory.length > 0 
    ? [chronologicalHistory[0].previousPrice, ...chronologicalHistory.map(h => h.newPrice), currentPrice]
    : [currentPrice];

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const numChanges = history.length;
  const lastChangeDate = history.length > 0 ? new Date(history[0].createdAt).toLocaleDateString("pt-AO") : "—";
  const firstPrice = chronologicalHistory.length > 0 ? chronologicalHistory[0].previousPrice : currentPrice;
  const totalVariationKz = currentPrice - firstPrice;
  const totalVariationPct = firstPrice > 0 ? (totalVariationKz / firstPrice) * 100 : 0;

  const timelinePoints: { date: string; price: number; cost: number; margin: number }[] = [];

  // Insert first point if history is available
  if (chronologicalHistory.length > 0) {
    const first = chronologicalHistory[0];
    timelinePoints.push({
      date: "Inicial",
      price: first.previousPrice,
      cost: first.previousCost,
      margin: first.previousMargin
    });

    chronologicalHistory.forEach((h) => {
      timelinePoints.push({
        date: new Date(h.createdAt).toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit" }),
        price: h.newPrice,
        cost: h.newCost,
        margin: h.newMargin
      });
    });
  } else {
    // If no history, we have just the current point
    timelinePoints.push({
      date: "Atual",
      price: currentPrice,
      cost: custoRealUnidade,
      margin: product.margemReal
    });
  }

  const renderPriceCostChart = () => {
    if (timelinePoints.length < 2) {
      return (
        <div className="flex items-center justify-center h-40 bg-slate-50 dark:bg-slate-800/20 border border-slate-150 dark:border-slate-800 rounded-xl text-xs text-slate-400">
          Dados insuficientes para gerar o gráfico.
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 65;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Min and Max for Price & Cost
    const allVals = timelinePoints.flatMap(p => [p.price, p.cost]);
    const maxVal = Math.max(...allVals) * 1.15;
    const minVal = Math.max(0, Math.min(...allVals) * 0.85);
    const range = maxVal - minVal || 1;

    // Helper to map point index to X
    const getX = (index: number) => {
      return paddingLeft + (index / (timelinePoints.length - 1)) * chartWidth;
    };

    // Helper to map value to Y
    const getY = (val: number) => {
      return paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
    };

    // Create paths
    const pricePointsStr = timelinePoints.map((p, idx) => `${getX(idx)},${getY(p.price)}`).join(" ");
    const costPointsStr = timelinePoints.map((p, idx) => `${getX(idx)},${getY(p.cost)}`).join(" ");

    // For area chart
    const priceAreaStr = `${getX(0)},${paddingTop + chartHeight} ${pricePointsStr} ${getX(timelinePoints.length - 1)},${paddingTop + chartHeight}`;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = minVal + ratio * (maxVal - minVal);
            const y = paddingTop + chartHeight - ratio * chartHeight;
            return (
              <g key={i} className="opacity-20 dark:opacity-10 text-slate-400 dark:text-slate-500">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-mono fill-current font-medium">
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {timelinePoints.map((p, idx) => {
            const x = getX(idx);
            return (
              <text key={idx} x={x} y={height - 8} textAnchor="middle" className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500 font-bold">
                {p.date}
              </text>
            );
          })}

          {/* Area under Price */}
          <polygon points={priceAreaStr} fill="rgba(16, 185, 129, 0.08)" />

          {/* Cost Line */}
          <polyline points={costPointsStr} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Price Line */}
          <polyline points={pricePointsStr} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interaction Dots */}
          {timelinePoints.map((p, idx) => (
            <g key={idx}>
              <circle cx={getX(idx)} cy={getY(p.price)} r="4" fill="#10b981" className="stroke-white dark:stroke-slate-900 stroke-2" />
              <circle cx={getX(idx)} cy={getY(p.cost)} r="4" fill="#f59e0b" className="stroke-white dark:stroke-slate-900 stroke-2" />
            </g>
          ))}
        </svg>
        <div className="flex justify-center gap-4 text-[10px] mt-2 font-semibold font-sans">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block"></span>
            <span>Preço Recomendado</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-500">
            <span className="w-3 h-1 bg-amber-500 rounded-full inline-block font-sans"></span>
            <span>Custo Unitário</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMarginChart = () => {
    if (timelinePoints.length < 2) {
      return (
        <div className="flex items-center justify-center h-40 bg-slate-50 dark:bg-slate-800/20 border border-slate-150 dark:border-slate-800 rounded-xl text-xs text-slate-400">
          Dados insuficientes para gerar o gráfico.
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Margin is a percentage, let's bound it between 0 and 100 (or max margin + 10)
    const margins = timelinePoints.map(p => p.margin);
    const maxVal = Math.min(100, Math.max(50, Math.max(...margins) * 1.15));
    const minVal = Math.max(0, Math.min(...margins) * 0.85);
    const range = maxVal - minVal || 1;

    const getX = (index: number) => {
      return paddingLeft + (index / (timelinePoints.length - 1)) * chartWidth;
    };

    const getY = (val: number) => {
      return paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
    };

    const marginPointsStr = timelinePoints.map((p, idx) => `${getX(idx)},${getY(p.margin)}`).join(" ");
    const marginAreaStr = `${getX(0)},${paddingTop + chartHeight} ${marginPointsStr} ${getX(timelinePoints.length - 1)},${paddingTop + chartHeight}`;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const val = minVal + ratio * (maxVal - minVal);
            const y = paddingTop + chartHeight - ratio * chartHeight;
            return (
              <g key={i} className="opacity-20 dark:opacity-10 text-slate-400 dark:text-slate-500">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-mono fill-current font-medium">
                  {Math.round(val)}%
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {timelinePoints.map((p, idx) => {
            const x = getX(idx);
            return (
              <text key={idx} x={x} y={height - 8} textAnchor="middle" className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500 font-bold">
                {p.date}
              </text>
            );
          })}

          {/* Area under Margin */}
          <polygon points={marginAreaStr} fill="rgba(79, 70, 229, 0.08)" />

          {/* Margin Line */}
          <polyline points={marginPointsStr} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interaction Dots */}
          {timelinePoints.map((p, idx) => (
            <circle key={idx} cx={getX(idx)} cy={getY(p.margin)} r="4" fill="#4f46e5" className="stroke-white dark:stroke-slate-900 stroke-2" />
          ))}
        </svg>
        <div className="flex justify-center gap-4 text-[10px] mt-2 font-semibold font-sans">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-sans">
            <span className="w-3 h-1 bg-indigo-500 rounded-full inline-block"></span>
            <span>Margem Real %</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="product-details-modal-overlay" className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        id="product-details-modal-box"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto transition-colors"
      >
        {/* Close Button */}
        <button
          id="modal-close-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6 pr-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{product.nome}</h2>
            <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/20">
              {product.categoria || "Outros"}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full border font-bold ${currentHealth.bgClass}`}>
              Saúde do preço: {currentHealth.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-sans">
            Registado em {new Date(product.createdAt).toLocaleDateString("pt-AO")} às {new Date(product.createdAt).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6 gap-2">
          <button
            id="modal-tab-details"
            onClick={() => setActiveModalTab("details")}
            className={`py-2 px-4 font-bold text-xs flex items-center gap-2 border-b-2 -mb-px transition-all cursor-pointer ${
              activeModalTab === "details"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Detalhamento Geral</span>
          </button>
          <button
            id="modal-tab-history"
            onClick={() => setActiveModalTab("history")}
            className={`py-2 px-4 font-bold text-xs flex items-center gap-2 border-b-2 -mb-px transition-all cursor-pointer ${
              activeModalTab === "history"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Histórico & Evolução</span>
            {history.length > 0 && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {activeModalTab === "details" ? (
          /* Bento Grid Layout of Sections */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            
            {/* SECTION A: Informações Gerais */}
            <div className="bg-slate-50/55 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Layers size={15} className="text-indigo-500" />
                <span>A) Informações Gerais</span>
              </h3>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Nome do Produto</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold mt-1 block text-sm">{product.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Categoria</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">{product.categoria || "Sem categoria"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Fornecedor</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">{product.fornecedor || "Não especificado"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Módulo / Tipo de Negócio</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-1 block capitalize">{product.tipoProduto || "Geral / Padrão"}</span>
              </div>
            </div>
          </div>

          {/* SECTION B: Compra e Stock */}
          <div className="bg-slate-50/55 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Archive size={15} className="text-teal-500" />
              <span>B) Compra e Stock</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Unidade de Compra</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block capitalize">{product.unidadeCompra || "unidade"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Qtd Comprada</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block">{q}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Qtd Vendida</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-1 block">{product.quantidadeVendida !== undefined ? product.quantidadeVendida : 0}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Qtd Disponível</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-bold mt-1 block">{product.quantidadeDisponivel !== undefined ? product.quantidadeDisponivel : q}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Unidade de Venda</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block capitalize">{product.unidadeVenda || "unidade"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Unidades por Caixa</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block">{product.unidadesInternas || 1}</span>
              </div>
              <div className="col-span-2 sm:col-span-3 border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans mb-1">Total de Unidades Vendáveis</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-extrabold block text-sm">
                  {product.totalUnidadesVendaveis || q} {product.unidadeVenda || "unidades"}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION C: Precificação */}
          <div className="bg-slate-50/55 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Coins size={15} className="text-emerald-500" />
              <span>C) Precificação Operacional</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 text-xs font-mono">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Investimento Total Real</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block text-sm">
                  {formatKz(product.loteCustoTotal !== undefined ? product.loteCustoTotal : custoTotalReal * q)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Custo por Un. Venda</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block text-sm">
                  {formatKz(product.custoRealUnidadeVenda !== undefined ? product.custoRealUnidadeVenda : custoRealUnidade)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Preço Recomendado</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-extrabold mt-1 block text-sm">
                  {formatKz(product.venderEmbalagemInteira === false && product.precoRecomendadoUnidadeVenda !== undefined ? product.precoRecomendadoUnidadeVenda : product.precoVendaRecomendado)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Lucro por Unidade</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-bold mt-1 block text-sm">
                  +{formatKz(product.venderEmbalagemInteira === false && product.lucroUnidadeVenda !== undefined ? product.lucroUnidadeVenda : product.lucroEstimado)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Lucro Total Esperado</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-extrabold mt-1 block text-sm">
                  +{formatKz(product.lucroTotalEsperado !== undefined ? product.lucroTotalEsperado : product.lucroEstimado * q)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Receita Total Esperada</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block text-sm">
                  {formatKz(product.receitaTotalEsperada !== undefined ? product.receitaTotalEsperada : product.precoVendaRecomendado * q)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Margem Real</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block text-sm">
                  {product.margemReal.toFixed(1)}%
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">ROI Estimado</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block text-sm">
                  {(product.roi || 0).toFixed(1)}%
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Saúde do Preço</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border mt-1.5 ${currentHealth.bgClass}`}>
                  {currentHealth.label}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION D: Dados específicos do módulo ativo */}
          <div className="bg-slate-50/55 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <HeartPulse size={15} className="text-emerald-500" />
              <span>D) Dados Específicos do Módulo Ativo</span>
            </h3>

            {product.tipoProduto === "medicamento/farmácia" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs font-sans">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Nome Comercial</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block">{product.farmaciaNomeComercial || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Princípio Ativo</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold italic mt-1 block">{product.farmaciaPrincipioAtivo || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Dosagem</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-medium mt-1 block">{product.farmaciaDosagem || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Forma Farmacêutica</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block capitalize">{product.farmaciaFormaFarmaceutica || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Laboratório</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium mt-1 block">{product.farmaciaLaboratorio || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Lote</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-medium mt-1 block">{product.farmaciaLote || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Validade</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-bold mt-1 block">
                    {product.farmaciaDataValidade ? new Date(product.farmaciaDataValidade).toLocaleDateString("pt-AO") : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">Receita Médica</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                    product.farmaciaNecessitaReceita === "sim" 
                      ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30" 
                      : product.farmaciaNecessitaReceita === "não"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}>
                    {product.farmaciaNecessitaReceita || "Não informado"}
                  </span>
                </div>
              </div>
            ) : extraAttributes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs font-sans">
                {extraAttributes.map((attr, idx) => (
                  <div key={idx}>
                    <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase">{attr.label}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold mt-1 block">
                      {typeof attr.value === "string" && attr.value.includes("-") && attr.value.length === 10 && !isNaN(Date.parse(attr.value))
                        ? new Date(attr.value).toLocaleDateString("pt-AO")
                        : String(attr.value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhum atributo adicional preenchido para este módulo.</p>
            )}
          </div>

          {/* SECTION E: Simulação Rápida & Calculadora Reversa */}
          <div className="bg-indigo-50/20 dark:bg-indigo-950/5 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-100/40 dark:border-indigo-900/20 pb-2">
              <TrendingUp size={15} className="text-indigo-500" />
              <span>E) Simulação de Outro Preço & Calculadora Reversa</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Simulation Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Simular outro preço</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    Teste qualquer preço de venda unitário para prever instantaneamente o lucro, a margem de lucro e o ROI. Esta simulação não altera o produto gravado.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Preço de Venda a Testar (Kz):</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 dark:text-slate-500">Kz</span>
                    <input
                      id="simulator-test-price-modal"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Introduza o preço unitário..."
                      value={testPrice}
                      onChange={(e) => setTestPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {simulation ? (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/30 text-xs font-mono space-y-2 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">Lucro por Unidade:</span>
                      <span className={`font-bold ${simulation.lucro > 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                        +{formatKz(simulation.lucro)}
                      </span>
                    </div>
                    {q > 1 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-sans">Lucro Total Lote:</span>
                        <span className={`font-bold ${simulation.lucro > 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600"}`}>
                          +{formatKz(simulation.lucro * q)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">Margem Real:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{simulation.margemReal.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">ROI Estimado:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{simulation.roi.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-indigo-100/50 dark:border-indigo-900/20 pt-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-sans">Saúde do Preço:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${simulation.health.bgClass}`}>
                        {simulation.health.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Introduza um valor numérico para iniciar a simulação interativa.</p>
                )}
              </div>

              {/* Reverse Calculator Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calculator size={14} className="text-indigo-500" />
                    <span>Calculadora Reversa</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    Calcule o preço de venda necessário a partir do lucro desejado.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {q > 1 ? "Lucro Unitário Desejado (Kz):" : "Lucro Desejado (Kz):"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 dark:text-slate-500">Kz</span>
                      <input
                        id="calc-profit-input-modal"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 1000.00"
                        value={desiredProfit}
                        onChange={(e) => setDesiredProfit(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {calculatedPriceA !== null && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[11px] font-mono space-y-1 transition-colors">
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-sans font-bold">Preço de Venda Unitário Necessário:</div>
                      <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{formatKz(calculatedPriceA)}</div>
                      {q > 1 && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 pt-1 border-t border-emerald-100/50 dark:border-emerald-900/20">
                          Preço do Lote: <span className="font-bold">{formatKz(calculatedPriceA * q)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
        ) : (
          /* "history" tab content */
          <div className="space-y-6 pb-6 animate-fade-in">
            {/* Indicadores de Evolução */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Preço Atual</span>
                <span className="text-slate-850 dark:text-slate-100 font-extrabold mt-1 block text-sm">
                  {formatKz(currentPrice)}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Menor Preço Histórico</span>
                <span className="text-emerald-600 dark:text-emerald-450 font-extrabold mt-1 block text-sm">
                  {formatKz(minPrice)}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Maior Preço Histórico</span>
                <span className="text-rose-600 dark:text-rose-400 font-extrabold mt-1 block text-sm">
                  {formatKz(maxPrice)}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Última Alteração</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block text-xs font-sans">
                  {lastChangeDate}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Nº Alterações</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold mt-1 block text-sm">
                  {numChanges}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[9px] uppercase font-sans">Evolução Total</span>
                <span className={`font-extrabold mt-1 block text-sm ${totalVariationKz > 0 ? "text-emerald-600 dark:text-emerald-450" : totalVariationKz < 0 ? "text-rose-600" : "text-slate-500"}`}>
                  {totalVariationKz > 0 ? "+" : ""}{formatKz(totalVariationKz)} ({totalVariationKz > 0 ? "+" : ""}{totalVariationPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Gráficos de Evolução */}
            {timelinePoints.length >= 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 dark:bg-slate-850/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider font-sans">Histórico de Preço & Custo (Kz)</h4>
                  {renderPriceCostChart()}
                </div>
                <div className="bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider font-sans font-sans">Histórico de Margem Real (%)</h4>
                  {renderMarginChart()}
                </div>
              </div>
            )}

            {/* Linha do Tempo */}
            <div className="space-y-4 font-sans">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Linha do Tempo de Alterações</h4>
              
              {historyLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Carregando histórico...</div>
              ) : history.length === 0 ? (
                <div className="p-8 bg-slate-50/50 dark:bg-slate-800/5 rounded-xl border border-slate-100 dark:border-slate-800 text-center text-slate-400">
                  <span className="text-2xl block mb-2">⏳</span>
                  <p className="text-xs font-medium">Este produto ainda não possui histórico de alterações.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
                  {history.map((item, idx) => {
                    const priceDiff = item.newPrice - item.previousPrice;
                    const priceDiffPct = item.previousPrice > 0 ? (priceDiff / item.previousPrice) * 100 : 0;
                    
                    return (
                      <div key={item.id || idx} className="relative">
                        {/* Bullet */}
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        </div>
                        
                        {/* Card */}
                        <div className="bg-slate-50/50 dark:bg-slate-800/5 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3">
                          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800/40 pb-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {new Date(item.createdAt).toLocaleDateString("pt-AO")} às {new Date(item.createdAt).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold uppercase border border-indigo-100 dark:border-indigo-900/30">
                              Motivo: {item.changeReason || "Sem motivo informado"}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Preço Recomendado</span>
                              <span className="text-slate-800 dark:text-slate-200 font-medium block mt-0.5">
                                {formatKz(item.previousPrice)} → <span className="font-bold text-slate-900 dark:text-slate-100">{formatKz(item.newPrice)}</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Variação Preço</span>
                              <span className={`font-bold block mt-0.5 ${priceDiff > 0 ? "text-rose-600" : priceDiff < 0 ? "text-emerald-600 dark:text-emerald-450" : "text-slate-500"}`}>
                                {priceDiff > 0 ? "+" : ""}{formatKz(priceDiff)} ({priceDiff > 0 ? "+" : ""}{priceDiffPct.toFixed(1)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Margem Real</span>
                              <span className="text-slate-800 dark:text-slate-200 block mt-0.5 font-medium">
                                {item.previousMargin.toFixed(1)}% → <span className="font-bold text-slate-900 dark:text-slate-100">{item.newMargin.toFixed(1)}%</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">ROI Estimado</span>
                              <span className="text-slate-800 dark:text-slate-200 block mt-0.5 font-medium">
                                {item.previousROI.toFixed(1)}% → <span className="font-bold text-slate-900 dark:text-slate-100">{item.newROI.toFixed(1)}%</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Custo Unitário</span>
                              <span className="text-slate-800 dark:text-slate-200 block mt-0.5 font-medium">
                                {formatKz(item.previousCost)} → <span className="font-bold text-slate-900 dark:text-slate-100">{formatKz(item.newCost)}</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block font-semibold text-[10px] uppercase font-sans">Lucro Unitário</span>
                              <span className="text-slate-800 dark:text-slate-200 block mt-0.5 font-medium">
                                {formatKz(item.previousProfit)} → <span className="font-bold text-slate-900 dark:text-slate-100">{formatKz(item.newProfit)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            id="close-details-modal-btn"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </motion.div>
    </div>
  );
}
