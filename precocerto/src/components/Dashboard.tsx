import React, { useState, useMemo, useRef, useEffect } from "react";
import { Product, BusinessSettings } from "../types";
import { formatKz, getPriceHealth, formatCurrency, formatDate } from "../utils";
import { businessModuleRegistry } from "../modules/business-types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Coins, 
  ArrowRight, 
  PlusCircle,
  HelpCircle,
  PiggyBank,
  Activity,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Search,
  MoreVertical,
  Briefcase,
  AlertTriangle,
  FolderOpen,
  ArrowUpRight,
  ShieldAlert
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import * as XLSX from "xlsx";
import HealthCheckPanel from "./HealthCheckPanel"; // NOVO (Fase 13 - Health Check)
import { useCriticalExpiryAlerts } from "../hooks/useExpiryAlerts"; // NOVO (Fase 13)
import { useLowStockAlerts } from "../hooks/useLowStockAlerts"; // NOVO (Fase 13)
import type { OperationalUnitRules } from "../utils/businessUnitMapping";

interface DashboardProps {
  products?: Product[];
  settings: BusinessSettings | null;
  onNavigate: (tab: "add-product" | "products" | "reports" | "vendas") => void;
  unitRules?: OperationalUnitRules;
}

// Sparkline component using beautiful cubic bezier curves and smooth linear gradients
function Sparkline({ color }: { color: "blue" | "green" | "orange" | "purple" }) {
  const paths = {
    blue: "M0 22 C15 15, 30 25, 45 10 C60 2, 75 18, 90 8 C95 5, 100 7, 105 5",
    green: "M0 25 C15 22, 30 12, 45 17 C60 22, 75 5, 90 2 C95 1, 100 3, 105 1",
    orange: "M0 10 C15 18, 30 5, 45 22 C60 18, 75 28, 90 25 C95 24, 100 26, 105 25",
    purple: "M0 20 C15 25, 30 5, 45 15 C60 25, 75 8, 90 12 C95 14, 100 11, 105 10"
  };

  const colors = {
    blue: { stroke: "#3b82f6", stopStart: "rgba(59, 130, 246, 0.15)", stopEnd: "rgba(59, 130, 246, 0)" },
    green: { stroke: "#10b981", stopStart: "rgba(16, 185, 129, 0.15)", stopEnd: "rgba(16, 185, 129, 0)" },
    orange: { stroke: "#f59e0b", stopStart: "rgba(245, 158, 11, 0.15)", stopEnd: "rgba(245, 158, 11, 0)" },
    purple: { stroke: "#8b5cf6", stopStart: "rgba(139, 92, 246, 0.15)", stopEnd: "rgba(139, 92, 246, 0)" }
  };

  const config = colors[color];
  const activePath = paths[color];
  const fillPath = `${activePath} L105 30 L0 30 Z`;
  const gradientId = `spark-grad-${color}`;

  return (
    <svg viewBox="0 0 105 30" className="w-16 h-8 overflow-visible select-none shrink-0" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={config.stopStart} />
          <stop offset="100%" stopColor={config.stopEnd} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path d={activePath} fill="none" stroke={config.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Dashboard({ products = [], settings, onNavigate, unitRules }: DashboardProps) {
  // Filters & State
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  
  // Recent Table State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // NOVO (Fase 13): Expiry & Stock Alerts
  const { criticalAlerts, warningAlerts, loading: expiryLoading } = useCriticalExpiryAlerts("default");
  const expiryAlerts = [...criticalAlerts, ...warningAlerts];
  const { lowStockProducts } = useLowStockAlerts({ products, defaultMinQuantity: 5 });

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format Helper
  const format = (value: number) => {
    return formatCurrency(value, settings?.currency || "Kz", settings?.numberFormat || "1.234,56");
  };

  const businessType = settings?.businessType || "farmacia";
  const currentModule = businessModuleRegistry.getModuleById(businessType);
  const canAddProducts = unitRules?.canManageProducts ?? true;
  const canRegisterSales = unitRules?.canSell ?? true;

  // Dynamic Excel Export of filtered products
  const handleExportProductsExcel = () => {
    const headers = [
      "Produto",
      "Categoria",
      "Fornecedor",
      "Qtd Comprada",
      "Stock Disponível",
      "Qtd Vendida",
      "Custo Compra Unitário",
      "Preço Recomendado",
      "Lucro Unitário",
      "Lucro Total Esperado",
      "Margem Real (%)",
      "ROI (%)"
    ];
    
    const rows = products.map((p) => [
      p.nome,
      p.categoria || "Sem Categoria",
      p.fornecedor || "Não informado",
      p.quantidade || 1,
      p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
      p.quantidadeVendida || 0,
      p.custoCompra || 0,
      p.precoVendaRecomendado || 0,
      p.lucroEstimado || 0,
      p.lucroTotalEsperado || 0,
      p.margemReal || 0,
      p.roi || 0
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      ["RELATÓRIO RESUMIDO DE PRODUTOS - PREÇOCERTO"],
      [`Exportado em: ${new Date().toLocaleString()}`],
      [],
      headers,
      ...rows
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "PrecoCerto_Produtos_Dashboard.xlsx");
  };

  // 1. Filter products by time-period
  const filteredProducts = useMemo(() => {
    if (period === "all") return products;
    const now = new Date();
    return products.filter((p) => {
      const pDate = new Date(p.createdAt);
      if (period === "month") {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      } else if (period === "year") {
        return pDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [products, period]);

  // 2. Filter products for the table (by search query and category)
  const tableProducts = useMemo(() => {
    return filteredProducts.filter((p) => {
      const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.fornecedor && p.fornecedor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (p.id && p.id.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory ? p.categoria === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [filteredProducts, searchQuery, selectedCategory]);

  // Pagination calculations
  const totalPages = Math.ceil(tableProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [tableProducts, currentPage, itemsPerPage]);

  // Reset page on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Extract all categories in this subset
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    filteredProducts.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [filteredProducts]);

  // Main Metrics calculations
  const totalProductsCount = filteredProducts.length;

  const totalUnidadesCompradas = filteredProducts.reduce((acc, p) => acc + (p.totalUnidadesVendaveis !== undefined ? p.totalUnidadesVendaveis : (p.quantidade && p.quantidade > 0 ? p.quantidade : 1)), 0);
  const totalUnidadesDisponiveis = filteredProducts.reduce((acc, p) => acc + (p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : (p.totalUnidadesVendaveis !== undefined ? p.totalUnidadesVendaveis : (p.quantidade && p.quantidade > 0 ? p.quantidade : 1))), 0);
  const totalUnidadesVendidas = filteredProducts.reduce((acc, p) => acc + (p.quantidadeVendida || 0), 0);

  // Total real cost including variables and ratated fixed
  const totalRealCost = filteredProducts.reduce((acc, p) => {
    if (p.loteCustoTotal !== undefined) {
      return acc + p.loteCustoTotal;
    }
    const q = p.quantidade && p.quantidade > 0 ? p.quantidade : 1;
    const baseCostTotal = (p.custoCompra || 0) + (p.custoTransporte || 0) + (p.custoEmbalagem || 0) + (p.outrosCustos || 0);
    
    const unitVariables = (p.comissaoVenda || 0) +
      (p.taxaBancaria || 0) +
      (p.taxaMarketplace || 0) +
      (p.custoPublicidade || 0) +
      (p.custoEntrega || 0) +
      (p.combustivel || 0) +
      (p.impostoTaxa || 0) +
      (p.perdasDesperdicios || 0);

    const unitFixed = (p.energia || 0) +
      (p.internet || 0) +
      (p.renda || 0) +
      (p.salario || 0) +
      (p.agua || 0) +
      (p.contabilidade || 0) +
      (p.seguranca || 0) +
      (p.outrosCustosFixos || 0);

    const productTotalInvestment = baseCostTotal + (unitVariables + unitFixed) * q;
    return acc + productTotalInvestment;
  }, 0);

  const totalRecommendedSale = filteredProducts.reduce((acc, p) => {
    if (p.receitaTotalEsperada !== undefined) {
      return acc + p.receitaTotalEsperada;
    }
    const q = p.quantidade && p.quantidade > 0 ? p.quantidade : 1;
    return acc + ((p.precoVendaRecomendado || 0) * q);
  }, 0);

  const totalEstimatedProfit = filteredProducts.reduce((acc, p) => {
    if (p.lucroTotalEsperado !== undefined) {
      return acc + p.lucroTotalEsperado;
    }
    const q = p.quantidade && p.quantidade > 0 ? p.quantidade : 1;
    return acc + ((p.lucroEstimado || 0) * q);
  }, 0);
  
  // Average Margin %
  const averageMargin = totalProductsCount > 0 
    ? filteredProducts.reduce((acc, p) => acc + (p.margemReal || 0), 0) / totalProductsCount 
    : 0;

  // Average General ROI
  const averageRoi = totalProductsCount > 0 && totalRealCost > 0
    ? (totalEstimatedProfit / totalRealCost) * 100
    : 0;

  // Top Products indicators
  const maxProfitProduct = filteredProducts.reduce((best, p) => {
    return !best || (p.lucroEstimado || 0) > (best.lucroEstimado || 0) ? p : best;
  }, null as Product | null);

  const minMarginProduct = filteredProducts.reduce((worst, p) => {
    return !worst || (p.margemReal || 0) < (worst.margemReal || 0) ? p : worst;
  }, null as Product | null);

  const bestRoiProduct = filteredProducts.reduce((best, p) => {
    return !best || (p.roi || 0) > (best.roi || 0) ? p : best;
  }, null as Product | null);

  // Profitability alerts
  const lowMarginProductsCount = filteredProducts.filter(
    (p) => (p.margemReal || 0) < 15 && (p.lucroEstimado || 0) > 0
  ).length;

  const unprofitableProductsCount = filteredProducts.filter(
    (p) => (p.lucroEstimado || 0) <= 0
  ).length;

  // Category distributions
  const categoryCounts = filteredProducts.reduce((acc: { [key: string]: number }, p) => {
    const cat = p.categoria || "Sem Categoria";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categories = Object.keys(categoryCounts).map(name => ({
    name,
    count: categoryCounts[name],
    percentage: Math.round((categoryCounts[name] / totalProductsCount) * 100)
  })).sort((a, b) => b.count - a.count).slice(0, 4);

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } }
  };

  // If no products exist at all, render a beautiful first-time empty state
  if (products.length === 0) {
    return (
      <div id="dashboard-empty-state" className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center transition-colors"
        >
          <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 border border-emerald-100 dark:border-emerald-900/30">
            <PiggyBank size={32} className="stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Comece a calcular o seu lucro</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
            Ainda não tem produtos cadastrados. Adicione o seu primeiro produto para visualizar estatísticas financeiras, custos agregados e preços recomendados de venda.
          </p>
          {canAddProducts ? (
            <button
              id="dashboard-add-first-product"
              onClick={() => onNavigate("add-product")}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all cursor-pointer"
            >
              <PlusCircle size={18} />
              <span>Cadastrar Primeiro Produto</span>
            </button>
          ) : (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300">
              Esta unidade não está configurada para cadastro direto de produtos.
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      id="dashboard-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Upper Navigation / Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Dashboard Geral</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Visão consolidada de lucros, custos operacionais e margem de rentabilidade.</p>
        </div>
        
        {/* Top bar controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Calendar Filter Dropdown */}
          <div className="relative w-full sm:w-auto" ref={periodDropdownRef}>
            <button
              id="period-filter-button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-between gap-2 cursor-pointer w-full"
            >
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                <span>
                  {period === "all" ? "Todos os Lotes" : period === "month" ? "Este Mês" : "Este Ano"}
                </span>
              </div>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            <AnimatePresence>
              {isPeriodDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl p-1.5 w-full sm:w-44"
                >
                  <button
                    onClick={() => { setPeriod("all"); setIsPeriodDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${period === "all" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    Todos os Lotes
                  </button>
                  <button
                    onClick={() => { setPeriod("month"); setIsPeriodDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${period === "month" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    Este Mês
                  </button>
                  <button
                    onClick={() => { setPeriod("year"); setIsPeriodDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${period === "year" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    Este Ano
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            id="quick-excel-export-btn"
            onClick={handleExportProductsExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-slate-300 border border-transparent rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            title="Exportar todos os produtos para Excel"
          >
            <Download size={13} />
            <span>Exportar Excel</span>
          </button>
          
          <button
            id="quick-pdf-export-btn"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-slate-300 border border-transparent rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            title="Exportar o resumo do dashboard em PDF"
          >
            <LucideIcons.FileText size={13} />
            <span>Gerar PDF</span>
          </button>

          {canAddProducts && (
            <button
              id="dashboard-add-product-shortcut"
              onClick={() => onNavigate("add-product")}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer w-full sm:w-auto"
            >
              <PlusCircle size={14} />
              <span>Cadastrar Produto</span>
            </button>
          )}

          {/* NOVO (Fase 13): Quick Sales Recorder Button */}
          {canRegisterSales && (
            <button
              id="dashboard-quick-sale-btn"
              onClick={() => onNavigate("vendas")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer w-full sm:w-auto"
              title="Registar venda rápida"
            >
              <LucideIcons.ShoppingCart size={14} />
              <span>Registar Venda</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Main Stats (Matching SilverLogix style exactly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products (Blue theme) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between transition-colors relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total de Produtos</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{totalProductsCount}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Package size={18} className="stroke-[2]" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-5 pt-2 border-t border-slate-50 dark:border-slate-800/40">
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-lg">
              <ArrowUpRight size={10} className="stroke-[2.5]" />
              <span>Estável</span>
            </div>
            <Sparkline color="blue" />
          </div>
        </motion.div>

        {/* Card 2: Investimento Real (Orange/Amber theme) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between transition-colors relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Investimento Real</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight truncate max-w-[180px]" title={format(totalRealCost)}>
                {format(totalRealCost)}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Coins size={18} className="stroke-[2]" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-5 pt-2 border-t border-slate-50 dark:border-slate-800/40">
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-lg">
              <ArrowUpRight size={10} className="stroke-[2.5]" />
              <span>Custo total</span>
            </div>
            <Sparkline color="orange" />
          </div>
        </motion.div>

        {/* Card 3: Receita Esperada (Purple theme) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between transition-colors relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Faturação Prevista</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight truncate max-w-[180px]" title={format(totalRecommendedSale)}>
                {format(totalRecommendedSale)}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <TrendingUp size={18} className="stroke-[2]" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-5 pt-2 border-t border-slate-50 dark:border-slate-800/40">
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-lg">
              <ArrowUpRight size={10} className="stroke-[2.5]" />
              <span>Faturação</span>
            </div>
            <Sparkline color="purple" />
          </div>
        </motion.div>

        {/* Card 4: Lucro Estimado (Green theme) */}
        <motion.div 
          variants={itemVariants}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100/60 dark:border-emerald-950/30 bg-emerald-50/5 dark:bg-emerald-950/5 shadow-xs flex flex-col justify-between transition-colors relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-emerald-800/60 dark:text-emerald-400/60 uppercase tracking-wider block">Lucro Esperado</span>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight truncate max-w-[180px]" title={format(totalEstimatedProfit)}>
                {format(totalEstimatedProfit)}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 rounded-xl">
              <PiggyBank size={18} className="stroke-[2]" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-5 pt-2 border-t border-emerald-100/30 dark:border-emerald-950/10">
            <div className="text-[9px] text-emerald-600/90 dark:text-emerald-400/80 font-bold">
              Margem {averageMargin.toFixed(0)}% • ROI {averageRoi.toFixed(0)}%
            </div>
            <Sparkline color="green" />
          </div>
        </motion.div>
      </div>

      {/* NOVO (Fase 13): Health Check Panel - Expiry & Stock Alerts */}
      <motion.div
        variants={itemVariants}
      >
        <HealthCheckPanel
          expiryAlerts={expiryAlerts}
          products={products}
          onNavigateToProduct={(productId) => {
            // Navigate to product details
            console.log("Navigate to product:", productId);
          }}
        />
      </motion.div>

      {/* Main Row: Recent Products Table (Left) + Sub-Analytics Bento (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Recent Products Table - Visual Translation of SilverLogix deliveries list */}
        <div className="xl:col-span-2 space-y-6">
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs overflow-hidden"
          >
            {/* Table Header Section */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Activity size={15} className="text-blue-500" />
                  <span>Produtos Recentes</span>
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Visão detalhada e estado de rentabilidade dos últimos lotes precificados.</p>
              </div>

              {/* Action row in header */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search field */}
                <div className="relative w-full sm:w-48">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search size={12} className="text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Pesquisar produto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7.5 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700 dark:text-slate-300 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Filter button with popover */}
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    id="table-category-filter-btn"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className={`p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${selectedCategory ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-400'}`}
                    title="Filtrar por Categoria"
                  >
                    <Filter size={13} />
                    {selectedCategory && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500"></span>}
                  </button>

                  <AnimatePresence>
                    {isCategoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-xl p-1.5 w-44 max-h-60 overflow-y-auto"
                      >
                        <button
                          onClick={() => { setSelectedCategory(null); setIsCategoryDropdownOpen(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedCategory === null ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          Todas as Categorias
                        </button>
                        {availableCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setIsCategoryDropdownOpen(false); }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors truncate ${selectedCategory === cat ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Table area */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800/60">
                    <th className="p-3.5 pl-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="p-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="p-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Categoria</th>
                    <th className="p-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">P. Venda</th>
                    <th className="p-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Margem / ROI</th>
                    <th className="p-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rentabilidade</th>
                    <th className="p-3.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="p-3.5 pr-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((p, index) => {
                      // Custom formatted ID prefix
                      const displayId = `PRD-${(p.id || `x${index}`).slice(0, 5).toUpperCase()}`;
                      const formattedPrice = formatCurrency(
                        p.venderEmbalagemInteira === false && p.precoRecomendadoUnidadeVenda !== undefined
                          ? p.precoRecomendadoUnidadeVenda
                          : p.precoVendaRecomendado || 0,
                        settings?.currency || "Kz",
                        settings?.numberFormat || "1.234,56"
                      );

                      // Health status details
                      const margin = p.margemReal || 0;
                      const profit = p.lucroEstimado || 0;
                      
                      let statusText = "SAUDÁVEL";
                      let badgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400";
                      let dotColor = "bg-emerald-500";

                      if (profit <= 0) {
                        statusText = "PREJUÍZO";
                        badgeClass = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400";
                        dotColor = "bg-rose-500";
                      } else if (margin < 20) {
                        statusText = "ALERTA";
                        badgeClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
                        dotColor = "bg-amber-500";
                      } else if ((p.custoCompra || 0) === 0) {
                        statusText = "SEM CUSTO";
                        badgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400";
                        dotColor = "bg-blue-500";
                      }

                      return (
                        <tr key={p.id || index} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-colors">
                          {/* ID code (colored like link blue in the original layout) */}
                          <td className="p-3.5 pl-5 text-xs font-bold text-blue-600 dark:text-blue-400">
                            {displayId}
                          </td>
                          {/* Product Name */}
                          <td className="p-3.5 text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[150px] truncate">
                            {p.nome}
                          </td>
                          {/* Category with folder/pin style icon */}
                          <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <FolderOpen size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{p.categoria || "Geral"}</span>
                            </div>
                          </td>
                          {/* Sale Price */}
                          <td className="p-3.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formattedPrice}
                          </td>
                          {/* Margins */}
                          <td className="p-3.5 text-xs font-mono">
                            <div className="text-slate-700 dark:text-slate-300 font-bold">
                              {margin.toFixed(1)}%
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {(p.roi || 0).toFixed(0)}% ROI
                            </div>
                          </td>
                          {/* Rentability status badge with dot */}
                          <td className="p-3.5 text-xs">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0`}></span>
                              <span>{statusText}</span>
                            </span>
                          </td>
                          {/* Registration Date */}
                          <td className="p-3.5 text-[11px] text-slate-400">
                            {formatDate(p.createdAt)}
                          </td>
                          {/* Action drop dots */}
                          <td className="p-3.5 pr-5 text-xs text-right relative">
                            <button
                              onClick={() => onNavigate("products")}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                              title="Gerenciar na lista"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-slate-400 italic">
                        Nenhum produto correspondente aos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {tableProducts.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Mostrando <span className="text-slate-600 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-slate-600 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, tableProducts.length)}</span> de <span className="text-slate-600 dark:text-slate-300">{tableProducts.length}</span> produtos
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-7 w-7 text-xs font-bold rounded-lg transition-colors cursor-pointer ${currentPage === pageNum ? 'bg-blue-600 text-white dark:bg-blue-500' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Side: Visual Bento sidebar (ratios, categories & alert cards) */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Progress Composição Card */}
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs transition-colors space-y-4"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Distribuição Financeira</h4>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">Custo Total vs Faturação</h2>
            </div>

            {/* Micro horizontal comparison bar */}
            <div className="space-y-3.5 pt-1">
              <div className="w-full h-7 rounded-xl overflow-hidden flex text-[10px] text-white font-bold select-none">
                <div 
                  className="bg-amber-500 flex items-center justify-center transition-all duration-500"
                  style={{ width: `${totalRecommendedSale > 0 ? (totalRealCost / totalRecommendedSale) * 100 : 50}%` }}
                  title="Custo Total Real"
                >
                  {totalRecommendedSale > 0 ? `${((totalRealCost / totalRecommendedSale) * 100).toFixed(0)}%` : "Custo"}
                </div>
                <div 
                  className="bg-emerald-500 flex items-center justify-center transition-all duration-500"
                  style={{ width: `${totalRecommendedSale > 0 ? (totalEstimatedProfit / totalRecommendedSale) * 100 : 50}%` }}
                  title="Lucro Estimado"
                >
                  {totalRecommendedSale > 0 ? `${((totalEstimatedProfit / totalRecommendedSale) * 100).toFixed(0)}%` : "Lucro"}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Investimento Real</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{format(totalRealCost)}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Lucro Estimado</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{format(totalEstimatedProfit)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Categories card with elegant bar list */}
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs transition-colors space-y-4"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Principais Categorias</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Categorias com maior volume de lotes.</p>
            </div>

            {categories.length > 0 ? (
              <div className="space-y-3.5 pt-1">
                {categories.map((cat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="truncate max-w-[150px]">{cat.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px]">{cat.count} {cat.count === 1 ? "lote" : "lotes"} ({cat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          i === 0 ? "bg-blue-500" :
                          i === 1 ? "bg-purple-500" :
                          i === 2 ? "bg-amber-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Sem categorias cadastradas.</p>
            )}
          </motion.div>

          {/* Quick Stats Alerts block */}
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs transition-colors space-y-4"
          >
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Saúde Geral dos Preços</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Itens necessitando de revisão comercial.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/15 rounded-xl border border-amber-100/60 dark:border-amber-900/30">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{lowMarginProductsCount}</span>
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1">Margem Baixa</p>
                <p className="text-[8px] text-slate-400 mt-0.5">&lt; 15% margem</p>
              </div>
              
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/15 rounded-xl border border-rose-100/60 dark:border-rose-900/30">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{unprofitableProductsCount}</span>
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1">Com Prejuízo</p>
                <p className="text-[8px] text-slate-400 mt-0.5">lucro negativo</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* KPI Section: Performance Highlights (Best Profit, Best ROI, Least Margin) */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 transition-colors"
      >
        {/* Max Profit */}
        <div className="flex gap-4 items-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-850 pb-4 md:pb-0 md:pr-6">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <PiggyBank size={20} />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Maior Lucro</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate" title={maxProfitProduct ? maxProfitProduct.nome : "Nenhum"}>
              {maxProfitProduct ? maxProfitProduct.nome : "Nenhum Lote"}
            </span>
            <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {maxProfitProduct ? format(maxProfitProduct.lucroEstimado || 0) : "0 Kz"}
            </span>
          </div>
        </div>

        {/* Best ROI */}
        <div className="flex gap-4 items-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-850 pb-4 md:pb-0 md:pr-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Melhor ROI</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate" title={bestRoiProduct ? bestRoiProduct.nome : "Nenhum"}>
              {bestRoiProduct ? bestRoiProduct.nome : "Nenhum Lote"}
            </span>
            <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 block mt-0.5">
              {bestRoiProduct ? `${(bestRoiProduct.roi || 0).toFixed(1)}% ROI` : "0% ROI"}
            </span>
          </div>
        </div>

        {/* Least Margin */}
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Menor Margem</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate" title={minMarginProduct ? minMarginProduct.nome : "Nenhum"}>
              {minMarginProduct ? minMarginProduct.nome : "Nenhum Lote"}
            </span>
            <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 block mt-0.5">
              {minMarginProduct ? `${(minMarginProduct.margemReal || 0).toFixed(1)}% Margem` : "0% Margem"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Módulo Inteligente Insights Card (Fase 11 - Modularizada por Configuração) */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-xs transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              {(() => {
                const IconComponent = (LucideIcons as any)[currentModule.icon] || LucideIcons.Info;
                return <IconComponent size={20} />;
              })()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100">Indicadores do Módulo: {currentModule.name}</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{currentModule.description}</p>
            </div>
          </div>
          <div className="text-[10px] px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg font-mono font-bold">
            Módulo Ativo
          </div>
        </div>

        {/* Dynamic metrics based on module configuration dashboardCards */}
        {currentModule.dashboardCards && currentModule.dashboardCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentModule.dashboardCards.map((card) => {
              const val = card.getValue(products, format);
              return (
                <div 
                  key={card.id} 
                  className={`p-4 rounded-xl border ${card.bgGradient || 'bg-slate-50/50 dark:bg-slate-800/20'} ${card.borderColor || 'border-slate-100 dark:border-slate-800'}`}
                >
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <span className={`text-lg font-black mt-1.5 block ${card.textColor || 'text-slate-850 dark:text-slate-100'}`}>
                    {val}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">{card.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Regras de Cálculo</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1 leading-relaxed">
                {currentModule.calculationRules.name}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                {currentModule.calculationRules.description}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Políticas de Validação</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1 leading-relaxed">
                {currentModule.validationRules.name}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                {currentModule.validationRules.description}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tipo de Operação</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1 leading-relaxed">
                Configuração Padrão
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Utilize a aba Configurações para alterar o segmento do seu negócio.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Seção de Alertas Dinâmicos baseados no Módulo Ativo */}
      {(() => {
        const activeAlerts = (currentModule.alerts || []).filter(alert => alert.check(products));
        if (activeAlerts.length === 0) return null;

        return (
          <motion.div 
            variants={itemVariants}
            className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3"
          >
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={16} className="animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Alertas Importantes do Segmento</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeAlerts.map(alert => {
                const affectedCount = alert.getAffectedCount ? alert.getAffectedCount(products) : null;
                const styleMap: Record<string, string> = {
                  danger: "bg-rose-50/60 dark:bg-rose-950/20 text-rose-850 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
                  warning: "bg-amber-50/60 dark:bg-amber-950/20 text-amber-850 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
                  info: "bg-blue-50/60 dark:bg-blue-950/20 text-blue-850 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
                  success: "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
                };
                const styleClasses = styleMap[alert.type] || styleMap.warning;
                return (
                  <div key={alert.id} className={`p-3.5 rounded-xl border ${styleClasses} flex gap-2.5 items-start`}>
                    <div className="mt-0.5 text-sm font-bold select-none">
                      {alert.type === 'danger' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold flex items-center gap-1.5">
                        {alert.title}
                        {affectedCount !== null && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white dark:bg-slate-900 border border-current">
                            {affectedCount} {affectedCount === 1 ? 'item' : 'itens'}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] opacity-90 mt-1 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Quick advice box */}
      <motion.div 
        variants={itemVariants}
        className="bg-indigo-50 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/30 p-5 rounded-2xl flex items-start gap-3.5 transition-colors"
      >
        <span className="text-xl mt-0.5 select-none">💡</span>
        <div>
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">Dica de Precificação</h4>
          <p className="text-xs text-indigo-700/90 dark:text-indigo-300/80 mt-1 leading-relaxed">
            Certifique-se de preencher corretamente os custos de <strong>energia</strong>, <strong>internet</strong>, <strong>renda</strong> e <strong>salários</strong>. Negligenciar esses custos "invisíveis" é a principal causa de margens reais negativas ou prejuízos inesperados em vendas de produtos em Angola.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
