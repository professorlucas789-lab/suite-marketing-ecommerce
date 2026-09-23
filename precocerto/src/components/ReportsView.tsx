import React, { useState, useEffect, useMemo } from "react";
import { Product, BusinessSettings, PriceHistory } from "../types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { formatKz, getPriceHealth, formatDate } from "../utils";
import { motion } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { exportSheetsToXlsx } from "../utils/excelExport";
import {
  FileText,
  Filter,
  Download,
  Printer,
  ChevronDown,
  RefreshCw,
  Search,
  Grid,
  TrendingUp,
  Package,
  Activity,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface ReportsViewProps {
  products: Product[];
  settings: BusinessSettings | null;
  userId: string;
}

type ReportType =
  | "geral"
  | "precificacao"
  | "stock"
  | "rentabilidade"
  | "medicamentos"
  | "historico";

export default function ReportsView({ products, settings, userId }: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("geral");
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);

  // Filter States (Applied)
  const [periodType, setPeriodType] = useState<string>("todos");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("todos");
  const [selectedProductType, setSelectedProductType] = useState<string>("todos");
  const [selectedPriceHealth, setSelectedPriceHealth] = useState<string>("todos");
  
  const [lowMargin, setLowMargin] = useState<boolean>(false);
  const [withLoss, setWithLoss] = useState<boolean>(false);
  const [nearExpiration, setNearExpiration] = useState<boolean>(false);
  const [expired, setExpired] = useState<boolean>(false);
  const [withPrescription, setWithPrescription] = useState<boolean>(false);
  const [inStock, setInStock] = useState<boolean>(false);
  const [outOfStock, setOutOfStock] = useState<boolean>(false);

  // Draft Filter States (Edited in UI, applied when clicking "Gerar Relatório")
  const [draftPeriodType, setDraftPeriodType] = useState<string>("todos");
  const [draftStartDate, setDraftStartDate] = useState<string>("");
  const [draftEndDate, setDraftEndDate] = useState<string>("");
  const [draftSelectedCategory, setDraftSelectedCategory] = useState<string>("todos");
  const [draftSelectedSupplier, setDraftSelectedSupplier] = useState<string>("todos");
  const [draftSelectedProductType, setDraftSelectedProductType] = useState<string>("todos");
  const [draftSelectedPriceHealth, setDraftSelectedPriceHealth] = useState<string>("todos");
  
  const [draftLowMargin, setDraftLowMargin] = useState<boolean>(false);
  const [draftWithLoss, setDraftWithLoss] = useState<boolean>(false);
  const [draftNearExpiration, setDraftNearExpiration] = useState<boolean>(false);
  const [draftExpired, setDraftExpired] = useState<boolean>(false);
  const [draftWithPrescription, setDraftWithPrescription] = useState<boolean>(false);
  const [draftInStock, setDraftInStock] = useState<boolean>(false);
  const [draftOutOfStock, setDraftOutOfStock] = useState<boolean>(false);

  // For visual feedback
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const businessType = settings?.businessType || "farmacia";

  // If businessType shifts from farmacia, reset active report to general if active was medicamentos
  useEffect(() => {
    if (businessType !== "farmacia" && activeReport === "medicamentos") {
      setActiveReport("geral");
    }
  }, [businessType, activeReport]);

  // Fetch price history in real-time
  useEffect(() => {
    if (!userId) return;
    setHistoryLoading(true);
    const q = query(
      collection(db, "priceHistory"),
      where("userId", "==", userId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const historyList: PriceHistory[] = [];
        snapshot.forEach((docSnap) => {
          historyList.push({ id: docSnap.id, ...docSnap.data() } as PriceHistory);
        });
        setHistory(historyList);
        setHistoryLoading(false);
      },
      (err) => {
        setHistoryLoading(false);
        handleFirestoreError(err, OperationType.GET, "priceHistory");
      }
    );
    return () => unsubscribe();
  }, [userId]);

  // Extract unique categories and suppliers from existing products for filtering options
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats);
  }, [products]);

  const uniqueSuppliers = useMemo(() => {
    const sups = new Set<string>();
    products.forEach((p) => {
      if (p.fornecedor) sups.add(p.fornecedor);
    });
    return Array.from(sups);
  }, [products]);

  // Safe checks for dates and metrics
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayTime = new Date().getTime();

  // Filter products reactively
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Period Filter (createdAt of product)
      if (periodType !== "todos" && item.createdAt) {
        const itemDate = new Date(item.createdAt);
        const itemTime = itemDate.getTime();
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        if (periodType === "hoje" && itemTime < startOfToday) {
          return false;
        } else if (periodType === "semana") {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        } else if (periodType === "mes") {
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        } else if (periodType === "ano") {
          const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
          if (itemTime < startOfYear) return false;
        } else if (periodType === "personalizado") {
          if (startDate) {
            const startDateTime = new Date(startDate + "T00:00:00").getTime();
            if (itemTime < startDateTime) return false;
          }
          if (endDate) {
            const endDateTime = new Date(endDate + "T23:59:59").getTime();
            if (itemTime > endDateTime) return false;
          }
        }
      }

      // 2. Category
      if (selectedCategory !== "todos" && item.categoria !== selectedCategory) {
        return false;
      }

      // 3. Supplier
      if (selectedSupplier !== "todos" && item.fornecedor !== selectedSupplier) {
        return false;
      }

      // 4. Product Type
      if (selectedProductType !== "todos" && (item.tipoProduto || "produto comum") !== selectedProductType) {
        return false;
      }

      // Resolve price health
      const lucro = item.lucroEstimado || 0;
      const margem = item.margemReal || 0;
      const health = getPriceHealth(lucro, margem);

      // 5. Price Health Status
      if (selectedPriceHealth !== "todos" && health.status !== selectedPriceHealth) {
        return false;
      }

      // 6. Margem Baixa (margemReal < margemDesejada or health.status is "baixo" or "prejuizo")
      if (lowMargin) {
        const desired = item.margemDesejada || 0;
        if (margem >= desired && health.status !== "baixo" && health.status !== "prejuizo") {
          return false;
        }
      }

      // 7. Com Prejuízo (lucro <= 0)
      if (withLoss && lucro > 0) {
        return false;
      }

      // Expiration properties helper
      const hasExpiry = !!item.farmaciaDataValidade;
      let daysToExpiry = 99999;
      if (hasExpiry) {
        const expiryDate = new Date(item.farmaciaDataValidade!);
        daysToExpiry = Math.ceil((expiryDate.getTime() - todayTime) / (1000 * 3600 * 24));
      }

      // 8. Próximos da Validade (has expiry, and expiry within 30 days and not expired yet)
      if (nearExpiration) {
        if (!hasExpiry || daysToExpiry < 0 || daysToExpiry > 30) {
          return false;
        }
      }

      // 9. Vencidos (has expiry, and expired)
      if (expired) {
        if (!hasExpiry || daysToExpiry >= 0) {
          return false;
        }
      }

      // 10. Com Receita Médica (requires prescription)
      if (withPrescription && item.farmaciaNecessitaReceita !== "sim") {
        return false;
      }

      // 11. Em Stock
      const stockQty = item.quantidadeDisponivel !== undefined ? item.quantidadeDisponivel : 0;
      if (inStock && stockQty <= 0) {
        return false;
      }

      // 12. Sem Stock
      if (outOfStock && stockQty > 0) {
        return false;
      }

      return true;
    });
  }, [
    products,
    periodType,
    startDate,
    endDate,
    selectedCategory,
    selectedSupplier,
    selectedProductType,
    selectedPriceHealth,
    lowMargin,
    withLoss,
    nearExpiration,
    expired,
    withPrescription,
    inStock,
    outOfStock,
    todayTime
  ]);

  // Filter price history reactively
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (item.userId !== userId) return false;

      // 1. Period Filter (createdAt of history record)
      if (periodType !== "todos" && item.createdAt) {
        const itemDate = new Date(item.createdAt);
        const itemTime = itemDate.getTime();
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        if (periodType === "hoje" && itemTime < startOfToday) {
          return false;
        } else if (periodType === "semana") {
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        } else if (periodType === "mes") {
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        } else if (periodType === "ano") {
          const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
          if (itemTime < startOfYear) return false;
        } else if (periodType === "personalizado") {
          if (startDate) {
            const startDateTime = new Date(startDate + "T00:00:00").getTime();
            if (itemTime < startDateTime) return false;
          }
          if (endDate) {
            const endDateTime = new Date(endDate + "T23:59:59").getTime();
            if (itemTime > endDateTime) return false;
          }
        }
      }

      // 2. Category
      if (selectedCategory !== "todos" && item.productCategory !== selectedCategory) {
        return false;
      }

      // Since other fields like supplier, medicine checkboxes, stock are specifically product-level attributes,
      // we only filter history based on period and category. This provides a very clean user experience.
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [history, periodType, startDate, endDate, selectedCategory, userId]);

  // Calculate Executive Summary Metrics based on filteredProducts list
  const summaryMetrics = useMemo(() => {
    const totalCount = filteredProducts.length;

    let totalInvestment = 0;
    let totalRevenue = 0;
    let totalExpectedProfit = 0;
    let sumMargins = 0;
    let countMargins = 0;
    let sumRois = 0;
    let countRois = 0;

    let countLowMargin = 0;
    let countWithLoss = 0;

    // Farmacia specifics
    let countMedicamentos = 0;
    let countNearExpiry = 0;
    let countExpired = 0;
    let countPrescription = 0;

    filteredProducts.forEach((p) => {
      // Legacy or new calculated values
      const qtyComprada = p.quantidade && p.quantidade > 0 ? p.quantidade : 1;
      const stockQty = p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0;

      // Investimento Total
      let investment = 0;
      if (p.loteCustoTotal !== undefined) {
        investment = p.loteCustoTotal;
      } else {
        const baseCostTotal = (p.custoCompra || 0) + (p.custoTransporte || 0) + (p.custoEmbalagem || 0) + (p.outrosCustos || 0);
        investment = baseCostTotal * qtyComprada;
      }
      totalInvestment += investment;

      // Receita Esperada
      let revenue = 0;
      if (p.receitaTotalEsperada !== undefined) {
        revenue = p.receitaTotalEsperada;
      } else {
        revenue = (p.precoVendaRecomendado || 0) * qtyComprada;
      }
      totalRevenue += revenue;

      // Lucro Esperado
      let profit = 0;
      if (p.lucroTotalEsperado !== undefined) {
        profit = p.lucroTotalEsperado;
      } else {
        profit = (p.lucroEstimado || 0) * qtyComprada;
      }
      totalExpectedProfit += profit;

      // Margem & ROI averages
      if (p.margemReal !== undefined) {
        sumMargins += p.margemReal;
        countMargins++;
      }
      if (p.roi !== undefined) {
        sumRois += p.roi;
        countRois++;
      }

      // Low Margin
      const health = getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0);
      if (p.margemReal !== undefined && p.margemReal < (p.margemDesejada || 0)) {
        countLowMargin++;
      } else if (health.status === "baixo" || health.status === "prejuizo") {
        countLowMargin++;
      }

      // With Loss
      if (p.lucroEstimado !== undefined && p.lucroEstimado <= 0) {
        countWithLoss++;
      }

      // Farmacia Indicators
      if ((p.tipoProduto || "produto comum") === "medicamento/farmácia" || businessType === "farmacia") {
        countMedicamentos++;
      }

      if (p.farmaciaDataValidade) {
        const expiryDate = new Date(p.farmaciaDataValidade);
        const daysToExpiry = Math.ceil((expiryDate.getTime() - todayTime) / (1000 * 3600 * 24));
        if (daysToExpiry < 0) {
          countExpired++;
        } else if (daysToExpiry <= 30) {
          countNearExpiry++;
        }
      }

      if (p.farmaciaNecessitaReceita === "sim") {
        countPrescription++;
      }
    });

    const avgMargin = countMargins > 0 ? sumMargins / countMargins : 0;
    const avgRoi = countRois > 0 ? sumRois / countRois : 0;

    return {
      totalCount,
      totalInvestment,
      totalRevenue,
      totalExpectedProfit,
      avgMargin,
      avgRoi,
      countLowMargin,
      countWithLoss,
      countMedicamentos,
      countNearExpiry,
      countExpired,
      countPrescription
    };
  }, [filteredProducts, businessType, todayTime]);

  // Build printable / displayable filter string summary
  const appliedFiltersSummary = useMemo(() => {
    const parts: string[] = [];

    // Period
    if (periodType === "todos") parts.push("Período: Todos");
    else if (periodType === "hoje") parts.push("Período: Hoje");
    else if (periodType === "semana") parts.push("Período: Últimos 7 dias");
    else if (periodType === "mes") parts.push("Período: Últimos 30 dias");
    else if (periodType === "ano") parts.push("Período: Este ano");
    else if (periodType === "personalizado") {
      parts.push(`Período: ${startDate || "Início"} até ${endDate || "Fim"}`);
    }

    // Category
    parts.push(`Categoria: ${selectedCategory === "todos" ? "Todas" : selectedCategory}`);

    // Supplier
    parts.push(`Fornecedor: ${selectedSupplier === "todos" ? "Todos" : selectedSupplier}`);

    // Product Type
    if (selectedProductType !== "todos") {
      parts.push(`Tipo: ${selectedProductType}`);
    }

    // Price Health
    if (selectedPriceHealth !== "todos") {
      const labelMap: Record<string, string> = {
        excelente: "Excelente",
        saudavel: "Saudável",
        atencao: "Atenção",
        baixo: "Margem Baixa",
        prejuizo: "Prejuízo"
      };
      parts.push(`Saúde do Preço: ${labelMap[selectedPriceHealth] || selectedPriceHealth}`);
    }

    // Toggles
    if (lowMargin) parts.push("Margem Baixa");
    if (withLoss) parts.push("Com Prejuízo");
    if (nearExpiration) parts.push("Próximos da Validade");
    if (expired) parts.push("Vencidos");
    if (withPrescription) parts.push("Com Receita");
    if (inStock) parts.push("Em Stock");
    if (outOfStock) parts.push("Sem Stock");

    return parts.join(" | ");
  }, [
    periodType,
    startDate,
    endDate,
    selectedCategory,
    selectedSupplier,
    selectedProductType,
    selectedPriceHealth,
    lowMargin,
    withLoss,
    nearExpiration,
    expired,
    withPrescription,
    inStock,
    outOfStock
  ]);

  // Format Helper
  const formatVal = (val: number) => {
    return formatKz(val);
  };

  const clearFilters = () => {
    // Clear Applied
    setPeriodType("todos");
    setStartDate("");
    setEndDate("");
    setSelectedCategory("todos");
    setSelectedSupplier("todos");
    setSelectedProductType("todos");
    setSelectedPriceHealth("todos");
    setLowMargin(false);
    setWithLoss(false);
    setNearExpiration(false);
    setExpired(false);
    setWithPrescription(false);
    setInStock(false);
    setOutOfStock(false);

    // Clear Draft
    setDraftPeriodType("todos");
    setDraftStartDate("");
    setDraftEndDate("");
    setDraftSelectedCategory("todos");
    setDraftSelectedSupplier("todos");
    setDraftSelectedProductType("todos");
    setDraftSelectedPriceHealth("todos");
    setDraftLowMargin(false);
    setDraftWithLoss(false);
    setDraftNearExpiration(false);
    setDraftExpired(false);
    setDraftWithPrescription(false);
    setDraftInStock(false);
    setDraftOutOfStock(false);
  };

  const triggerGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Copy draft values to applied filters
      setPeriodType(draftPeriodType);
      setStartDate(draftStartDate);
      setEndDate(draftEndDate);
      setSelectedCategory(draftSelectedCategory);
      setSelectedSupplier(draftSelectedSupplier);
      setSelectedProductType(draftSelectedProductType);
      setSelectedPriceHealth(draftSelectedPriceHealth);
      setLowMargin(draftLowMargin);
      setWithLoss(draftWithLoss);
      setNearExpiration(draftNearExpiration);
      setExpired(draftExpired);
      setWithPrescription(draftWithPrescription);
      setInStock(draftInStock);
      setOutOfStock(draftOutOfStock);
      
      setIsGenerating(false);
    }, 800);
  };

  // PDF EXPORT IMPLEMENTATION
  const getColumnStyles = (headersList: string[]) => {
    const styles: Record<number, any> = {};
    headersList.forEach((h, index) => {
      const headerLower = h.toLowerCase();
      if (
        headerLower.includes("custo") ||
        headerLower.includes("preço") ||
        headerLower.includes("receita") ||
        headerLower.includes("lucro") ||
        headerLower.includes("margem") ||
        headerLower.includes("roi") ||
        headerLower.includes("stock") ||
        headerLower.includes("est.") ||
        headerLower.includes("qtd") ||
        headerLower.includes("total")
      ) {
        styles[index] = { halign: "right" };
      } else if (
        headerLower.includes("data") ||
        headerLower.includes("validade") ||
        headerLower.includes("estado") ||
        headerLower.includes("saúde") ||
        headerLower.includes("receita?")
      ) {
        styles[index] = { halign: "center" };
      }
    });
    return styles;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const dateStr = new Date().toLocaleDateString("pt-BR");
    const todayStrFull = new Date().toLocaleString("pt-BR");

    let reportTitle = "";
    let fileName = "";
    let headers: string[] = [];
    let rows: any[][] = [];

    if (activeReport === "geral") {
      reportTitle = "Relatório Geral de Produtos";
      fileName = `Relatorio_Geral_Produtos_${todayStr}`;
      headers = [
        "Produto",
        "Categoria",
        "Fornecedor",
        "Est.",
        "Custo Un.",
        "Preço",
        "Lucro Un.",
        "Lucro Tot.",
        "Margem",
        "ROI",
        "Saúde"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        p.categoria || "Sem Categoria",
        p.fornecedor || "Não informado",
        p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
        formatVal(p.custoRealUnidadeVenda || p.custoTotalReal || p.custoCompra || 0),
        formatVal(p.precoVendaRecomendado || 0),
        formatVal(p.lucroEstimado || 0),
        formatVal(p.lucroTotalEsperado || 0),
        `${(p.margemReal || 0).toFixed(1)}%`,
        `${(p.roi || 0).toFixed(1)}%`,
        getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0).label
      ]);
    } else if (activeReport === "precificacao") {
      reportTitle = "Relatório de Precificação Detalhada";
      fileName = `Relatorio_Precificacao_${todayStr}`;
      headers = [
        "Produto",
        "Custo Lote",
        "Custo Un.",
        "Margem Desejada",
        "Preço Recomendado",
        "Lucro Estimado",
        "ROI",
        "Saúde"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        formatVal(p.loteCustoTotal || 0),
        formatVal(p.custoRealUnidadeVenda || p.custoTotalReal || p.custoCompra || 0),
        `${(p.margemDesejada || 0).toFixed(1)}%`,
        formatVal(p.precoVendaRecomendado || 0),
        formatVal(p.lucroEstimado || 0),
        `${(p.roi || 0).toFixed(1)}%`,
        getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0).label
      ]);
    } else if (activeReport === "stock") {
      reportTitle = "Relatório de Distribuição de Stock";
      fileName = `Relatorio_Stock_${todayStr}`;
      headers = [
        "Produto",
        "Categoria",
        "Un. Compra",
        "Un. Venda",
        "Qtd Comprada",
        "Qtd Vendida",
        "Stock Disponível",
        "Total Vendáveis"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        p.categoria || "Sem Categoria",
        p.unidadeCompra || "Não inf.",
        p.unidadeVenda || "Não inf.",
        p.quantidade || 1,
        p.quantidadeVendida || 0,
        p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
        p.totalUnidadesVendaveis || p.quantidade || 1
      ]);
    } else if (activeReport === "rentabilidade") {
      reportTitle = "Relatório de Rentabilidade & ROI";
      fileName = `Relatorio_Rentabilidade_${todayStr}`;
      headers = [
        "Produto",
        "Investimento Real",
        "Receita Esperada",
        "Lucro Esperado",
        "Margem",
        "ROI",
        "Saúde"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        formatVal(p.loteCustoTotal || 0),
        formatVal(p.receitaTotalEsperada || 0),
        formatVal(p.lucroTotalEsperado || 0),
        `${(p.margemReal || 0).toFixed(1)}%`,
        `${(p.roi || 0).toFixed(1)}%`,
        getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0).label
      ]);
    } else if (activeReport === "medicamentos") {
      reportTitle = "Relatório de Medicamentos Registados";
      fileName = `Relatorio_Medicamentos_${todayStr}`;
      headers = [
        "Nome Comercial",
        "Princípio Ativo",
        "Dosagem",
        "Forma",
        "Laboratório",
        "Lote",
        "Validade",
        "Receita?",
        "Stock",
        "Preço Venda",
        "Margem",
        "ROI",
        "Estado"
      ];
      rows = filteredProducts.map((p) => {
        let alertVal = "Válido";
        if (p.farmaciaDataValidade) {
          const expiryDate = new Date(p.farmaciaDataValidade);
          const daysToExpiry = Math.ceil((expiryDate.getTime() - todayTime) / (1000 * 3600 * 24));
          if (daysToExpiry < 0) alertVal = "Vencido";
          else if (daysToExpiry <= 30) alertVal = "Próximo Venc.";
        }
        return [
          p.farmaciaNomeComercial || p.nome,
          p.farmaciaPrincipioAtivo || "Não inf.",
          p.farmaciaDosagem || "Não inf.",
          p.farmaciaFormaFarmaceutica || "Não inf.",
          p.farmaciaLaboratorio || "Não inf.",
          p.farmaciaLote || "Não inf.",
          p.farmaciaDataValidade || "Não inf.",
          p.farmaciaNecessitaReceita || "Não inf.",
          p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
          formatVal(p.precoVendaRecomendado || 0),
          `${(p.margemReal || 0).toFixed(1)}%`,
          `${(p.roi || 0).toFixed(1)}%`,
          alertVal
        ];
      });
    } else if (activeReport === "historico") {
      reportTitle = "Relatório de Histórico de Reajustes";
      fileName = `Relatorio_Historico_Alteracoes_${todayStr}`;
      headers = [
        "Data",
        "Produto",
        "Preço Ant.",
        "Novo Preço",
        "Variação",
        "Custo Ant.",
        "Novo Custo",
        "Margem Ant.",
        "Nova Margem",
        "Motivo"
      ];
      rows = filteredHistory.map((h) => {
        const diffKz = h.newPrice - h.previousPrice;
        const diffPct = h.previousPrice > 0 ? (diffKz / h.previousPrice) * 100 : 0;
        const varStr = `${diffKz >= 0 ? "+" : ""}${formatVal(diffKz)} (${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%)`;
        return [
          formatDate(h.createdAt?.split("T")[0] || ""),
          h.productName || "Produto desconhecido",
          formatVal(h.previousPrice || 0),
          formatVal(h.newPrice || 0),
          varStr,
          formatVal(h.previousCost || 0),
          formatVal(h.newCost || 0),
          `${(h.previousMargin || 0).toFixed(1)}%`,
          `${(h.newMargin || 0).toFixed(1)}%`,
          h.changeReason || "Não especificado"
        ];
      });
    }

    // PDF HEADER RENDER
    // Left blue/accent band
    doc.setFillColor(15, 23, 42); // slate-900 (deep dark blue)
    doc.rect(0, 0, 210, 10, "F");

    // Decorative Accent bar in emerald
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 10, 210, 1.5, "F");

    // Company Logo / Name Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(settings?.companyName?.toUpperCase() || "PREÇOCERTO LDA", 15, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Módulo Comercial: ${settings?.businessType?.toUpperCase() || "GERAL/FARMÁCIA"}`, 15, 26.5);
    doc.text(`Data de Emissão: ${todayStrFull}`, 15, 31);

    // Right-aligned report title banner
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle.toUpperCase(), 195, 22, { align: "right" });

    // Active Filters
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtros: ${appliedFiltersSummary}`, 195, 27, { align: "right" });

    // Dividers
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(15, 34, 195, 34);

    // EXECUTIVE SUMMARY BOX
    let currentY = 38;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("RESUMO EXECUTIVO DO RELATÓRIO", 15, currentY);
    currentY += 3.5;

    // Draw background block
    const isFarmaciaReport = businessType === "farmacia" || activeReport === "medicamentos";
    const boxHeight = isFarmaciaReport ? 31 : 16;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.roundedRect(15, currentY, 180, boxHeight, 2, 2, "FD");

    // Metrics structure
    const row1Metrics = [
      { label: "REGISTROS", value: String(summaryMetrics.totalCount) },
      { label: "INVESTIMENTO", value: formatVal(summaryMetrics.totalInvestment) },
      { label: "RECEITA ESP.", value: formatVal(summaryMetrics.totalRevenue) },
      { label: "LUCRO ESPERADO", value: formatVal(summaryMetrics.totalExpectedProfit) },
      { label: "MARGEM MÉDIA", value: `${summaryMetrics.avgMargin.toFixed(1)}%` },
      { label: "ROI MÉDIO", value: `${summaryMetrics.avgRoi.toFixed(1)}%` },
    ];

    // Position Row 1 metrics inside the box
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    let colWidth = 180 / 6;

    // Draw Row 1 labels
    for (let i = 0; i < 6; i++) {
      const metric = row1Metrics[i];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(metric.label, 15 + i * colWidth + colWidth / 2, currentY + 4.5, { align: "center" });

      // Value color custom rules
      doc.setFontSize(8.5);
      if (metric.label.includes("LUCRO")) {
        doc.setTextColor(79, 70, 229); // indigo-600
      } else if (metric.label.includes("RECEITA")) {
        doc.setTextColor(5, 150, 105); // emerald-600
      } else {
        doc.setTextColor(30, 41, 59); // slate-800
      }
      doc.text(metric.value, 15 + i * colWidth + colWidth / 2, currentY + 10.5, { align: "center" });
    }

    // Row 2 (if farmacia / medicamentos)
    if (isFarmaciaReport) {
      // Draw row separation line
      doc.setDrawColor(241, 245, 249);
      doc.line(15 + 2, currentY + 15.5, 195 - 2, currentY + 15.5);

      const row2Metrics = [
        { label: "MEDICAMENTOS", value: String(summaryMetrics.countMedicamentos) },
        { label: "PRÓX. VALIDADE", value: String(summaryMetrics.countNearExpiry) },
        { label: "MED. VENCIDOS", value: String(summaryMetrics.countExpired) },
        { label: "RECEITA OBRIGAT.", value: String(summaryMetrics.countPrescription) },
        { label: "MARGEM BAIXA", value: String(summaryMetrics.countLowMargin) },
        { label: "COM PREJUÍZO", value: String(summaryMetrics.countWithLoss) },
      ];

      for (let i = 0; i < 6; i++) {
        const metric = row2Metrics[i];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(metric.label, 15 + i * colWidth + colWidth / 2, currentY + 19.5, { align: "center" });

        doc.setFontSize(8.5);
        if (metric.label.includes("VENCIDOS") && summaryMetrics.countExpired > 0) {
          doc.setTextColor(220, 38, 38); // red-600
        } else if (metric.label.includes("PREJUÍZO") && summaryMetrics.countWithLoss > 0) {
          doc.setTextColor(220, 38, 38); // red-600
        } else if (metric.label.includes("VALIDADE") && summaryMetrics.countNearExpiry > 0) {
          doc.setTextColor(217, 119, 6); // amber-600
        } else {
          doc.setTextColor(30, 41, 59); // slate-800
        }
        doc.text(metric.value, 15 + i * colWidth + colWidth / 2, currentY + 25.5, { align: "center" });
      }
    }

    currentY += boxHeight + 6;

    // MAIN DATA TABLE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("DADOS DETALHADOS DO RELATÓRIO", 15, currentY);
    currentY += 2.5;

    // Get dynamic column alignments
    const colStyles = getColumnStyles(headers);
    if (colStyles[0]) {
      colStyles[0] = { ...colStyles[0], fontStyle: "bold" };
    } else {
      colStyles[0] = { fontStyle: "bold" };
    }

    autoTable(doc, {
      startY: currentY,
      head: [headers],
      body: rows,
      theme: "striped",
      headStyles: {
        fillColor: [15, 23, 42], // Deep slate
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: "bold",
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [30, 41, 59], // slate-800
        cellPadding: 1.8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      margin: { left: 15, right: 15, bottom: 20 },
      styles: {
        font: "helvetica",
        overflow: "linebreak",
      },
      columnStyles: colStyles,
      didDrawPage: (data) => {
        // Page numbering footer
        const pageCount = doc.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        
        const footerY = 285;
        // Draw footer separation line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(15, footerY - 4, 195, footerY - 4);
        
        doc.text(
          `PreçoCerto Lda - Sistema de Gestão e Precificação Inteligente`,
          15,
          footerY
        );
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          195,
          footerY,
          { align: "right" }
        );
      }
    });

    // Save/Download PDF
    doc.save(`${fileName}.pdf`);
  };

  const handlePrint = () => {
    const reportTitleMap: Record<ReportType, string> = {
      geral: "Relatorio_Geral_Produtos",
      precificacao: "Relatorio_Precificacao_Detalhada",
      stock: "Relatorio_Distribuicao_Stock",
      rentabilidade: "Relatorio_Rentabilidade_ROI",
      medicamentos: "Relatorio_Medicamentos_Registados",
      historico: "Relatorio_Historico_Alteracoes"
    };
    
    const originalTitle = document.title;
    const reportName = reportTitleMap[activeReport] || "Relatorio";
    const dateStr = new Date().toISOString().split("T")[0];
    
    // Set document.title temporarily so default printed file name is exceptionally clean
    document.title = `${reportName}_${dateStr}`;
    
    window.print();
    
    // Restore title quickly
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // EXCEL EXPORT IMPLEMENTATION
  const handleExportExcel = async () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let fileName = "";
    let reportTitle = "";

    const dateStr = new Date().toLocaleDateString();

    if (activeReport === "geral") {
      reportTitle = "Relatório Geral de Produtos";
      fileName = `Relatorio_Geral_Produtos_${todayStr}`;
      headers = [
        "Produto",
        "Categoria",
        "Fornecedor",
        "Qtd Comprada",
        "Qtd Vendida",
        "Stock Disponível",
        "Custo por Unidade",
        "Preço de Venda",
        "Lucro por Unidade",
        "Lucro Total Esperado",
        "Margem (%)",
        "ROI (%)",
        "Saúde do Preço"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        p.categoria || "Sem Categoria",
        p.fornecedor || "Não informado",
        p.quantidade || 1,
        p.quantidadeVendida || 0,
        p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
        p.custoRealUnidadeVenda || p.custoTotalReal || p.custoCompra || 0,
        p.precoVendaRecomendado || 0,
        p.lucroEstimado || 0,
        p.lucroTotalEsperado || 0,
        p.margemReal || 0,
        p.roi || 0,
        getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0).label
      ]);
    } else if (activeReport === "precificacao") {
      reportTitle = "Relatório de Precificação";
      fileName = `Relatorio_Precificacao_${todayStr}`;
      headers = [
        "Produto",
        "Custo Total Lote",
        "Custo por Unidade",
        "Margem Desejada (%)",
        "Preço Recomendado",
        "Lucro Estimado",
        "ROI (%)",
        "Status do Preço"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        p.loteCustoTotal || (p.custoTotalReal || p.custoCompra) * (p.quantidade || 1),
        p.custoRealUnidadeVenda || p.custoTotalReal || p.custoCompra || 0,
        p.margemDesejada || 0,
        p.precoVendaRecomendado || 0,
        p.lucroEstimado || 0,
        p.roi || 0,
        getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0).label
      ]);
    } else if (activeReport === "stock") {
      reportTitle = "Relatório de Stock";
      fileName = `Relatorio_Stock_${todayStr}`;
      headers = [
        "Produto",
        "Categoria",
        "Unidade de Compra",
        "Unidade de Venda",
        "Quantidade Comprada",
        "Quantidade Vendida",
        "Quantidade Disponível",
        "Total de Unidades Vendáveis"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        p.categoria || "Sem Categoria",
        p.unidadeCompra || "Não informado",
        p.unidadeVenda || "Não informado",
        p.quantidade || 1,
        p.quantidadeVendida || 0,
        p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
        p.totalUnidadesVendaveis || p.quantidade || 1
      ]);
    } else if (activeReport === "rentabilidade") {
      reportTitle = "Relatório de Rentabilidade";
      fileName = `Relatorio_Rentabilidade_${todayStr}`;
      headers = [
        "Produto",
        "Investimento Real",
        "Receita Esperada",
        "Lucro Esperado",
        "Margem (%)",
        "ROI (%)",
        "Classificação de Saúde"
      ];
      rows = filteredProducts.map((p) => [
        p.nome,
        p.loteCustoTotal || 0,
        p.receitaTotalEsperada || 0,
        p.lucroTotalEsperado || 0,
        p.margemReal || 0,
        p.roi || 0,
        getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0).label
      ]);
    } else if (activeReport === "medicamentos") {
      reportTitle = "Relatório de Medicamentos";
      fileName = `Relatorio_Medicamentos_${todayStr}`;
      headers = [
        "Nome Comercial",
        "Princípio Ativo",
        "Dosagem",
        "Forma Farmacêutica",
        "Laboratório",
        "Lote",
        "Data de Validade",
        "Receita Médica",
        "Stock",
        "Preço de Venda",
        "Margem (%)",
        "ROI (%)",
        "Alerta de Validade"
      ];
      rows = filteredProducts.map((p) => {
        let alertVal = "Válido";
        if (p.farmaciaDataValidade) {
          const expiryDate = new Date(p.farmaciaDataValidade);
          const daysToExpiry = Math.ceil((expiryDate.getTime() - todayTime) / (1000 * 3600 * 24));
          if (daysToExpiry < 0) alertVal = "Vencido 🚨";
          else if (daysToExpiry <= 30) alertVal = "Próximo do Vencimento ⚠️";
        }
        return [
          p.farmaciaNomeComercial || p.nome,
          p.farmaciaPrincipioAtivo || "Não informado",
          p.farmaciaDosagem || "Não informado",
          p.farmaciaFormaFarmaceutica || "Não informado",
          p.farmaciaLaboratorio || "Não informado",
          p.farmaciaLote || "Não informado",
          p.farmaciaDataValidade || "Não informado",
          p.farmaciaNecessitaReceita || "Não informado",
          p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0,
          p.precoVendaRecomendado || 0,
          p.margemReal || 0,
          p.roi || 0,
          alertVal
        ];
      });
    } else if (activeReport === "historico") {
      reportTitle = "Relatório de Histórico de Preços";
      fileName = `Relatorio_Historico_Alteracoes_${todayStr}`;
      headers = [
        "Data da Alteração",
        "Produto",
        "Preço Anterior",
        "Novo Preço",
        "Variação (Kz)",
        "Variação (%)",
        "Custo Anterior",
        "Novo Custo",
        "Margem Anterior (%)",
        "Nova Margem (%)",
        "Motivo da Alteração"
      ];
      rows = filteredHistory.map((h) => {
        const diffKz = h.newPrice - h.previousPrice;
        const diffPct = h.previousPrice > 0 ? (diffKz / h.previousPrice) * 100 : 0;
        return [
          formatDate(h.createdAt?.split("T")[0] || ""),
          h.productName || "Produto desconhecido",
          h.previousPrice || 0,
          h.newPrice || 0,
          diffKz,
          diffPct,
          h.previousCost || 0,
          h.newCost || 0,
          h.previousMargin || 0,
          h.newMargin || 0,
          h.changeReason || "Não especificado"
        ];
      });
    }

    // Add Executive Summary Metadata and Title to Excel sheet
    const metaRows = [
      [reportTitle.toUpperCase()],
      [`Empresa: ${settings?.companyName || "PreçoCerto Lda"}`],
      [`Módulo Ativo: ${settings?.businessType || "farmacia"}`],
      [`Filtros Aplicados: ${appliedFiltersSummary}`],
      [`Data de Emissão: ${new Date().toLocaleString()}`],
      [],
      ["RESUMO EXECUTIVO DO RELATÓRIO"],
      ["Produtos Filtrados", summaryMetrics.totalCount],
      ["Investimento Total", `${settings?.currency || "Kz"} ${summaryMetrics.totalInvestment.toFixed(2)}`],
      ["Receita Esperada", `${settings?.currency || "Kz"} ${summaryMetrics.totalRevenue.toFixed(2)}`],
      ["Lucro Esperado", `${settings?.currency || "Kz"} ${summaryMetrics.totalExpectedProfit.toFixed(2)}`],
      ["Margem Média (%)", `${summaryMetrics.avgMargin.toFixed(2)}%`],
      ["ROI Médio (%)", `${summaryMetrics.avgRoi.toFixed(2)}%`],
      ["Produtos com Margem Baixa", summaryMetrics.countLowMargin],
      ["Produtos com Prejuízo", summaryMetrics.countWithLoss],
    ];

    if (businessType === "farmacia" || activeReport === "medicamentos") {
      metaRows.push(
        ["Medicamentos Cadastrados", summaryMetrics.countMedicamentos],
        ["Medicamentos Próximos da Validade", summaryMetrics.countNearExpiry],
        ["Medicamentos Vencidos", summaryMetrics.countExpired],
        ["Medicamentos com Receita Obrigatória", summaryMetrics.countPrescription]
      );
    }

    metaRows.push([], []); // Blank separation rows before main table

    // Combine metadata with headers and body data
    const finalAOA = [...metaRows, headers, ...rows];

    try {
      await exportSheetsToXlsx(
        [
          {
            name: "Relatório",
            rows: finalAOA,
            headerRow: metaRows.length + 1,
          },
        ],
        `${fileName}.xlsx`
      );
    } catch (error) {
      console.error("Erro ao exportar relatório para Excel:", error);
      alert("Erro ao exportar relatório para Excel. Tente novamente.");
    }
  };

  return (
    <div id="reports-view-root" className="space-y-6">
      {/* 1. Filter Panel (Hides completely during device print layout) */}
      <div
        id="report-filters-card"
        className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Filtros Avançados de Relatórios</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Refine os dados para o seu relatório executivo de forma precisa.</p>
            </div>
          </div>
          <button
            id="clear-all-filters-btn"
            onClick={clearFilters}
            className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Limpar Todos os Filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Period Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Período de Cadastro</label>
            <select
              id="report-filter-period"
              value={draftPeriodType}
              onChange={(e) => setDraftPeriodType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
            >
              <option value="todos">Todos os registros</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Últimos 7 dias</option>
              <option value="mes">Últimos 30 dias</option>
              <option value="ano">Este Ano</option>
              <option value="personalizado">Intervalo Personalizado</option>
            </select>
          </div>

          {/* Custom Date Picker Inputs */}
          {draftPeriodType === "personalizado" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">De (Início)</label>
                <input
                  id="report-filter-start-date"
                  type="date"
                  value={draftStartDate}
                  onChange={(e) => setDraftStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Até (Fim)</label>
                <input
                  id="report-filter-end-date"
                  type="date"
                  value={draftEndDate}
                  onChange={(e) => setDraftEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors"
                />
              </div>
            </>
          )}

          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoria</label>
            <select
              id="report-filter-category"
              value={draftSelectedCategory}
              onChange={(e) => setDraftSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
            >
              <option value="todos">Todas as categorias</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fornecedor</label>
            <select
              id="report-filter-supplier"
              value={draftSelectedSupplier}
              onChange={(e) => setDraftSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
            >
              <option value="todos">Todos os fornecedores</option>
              {uniqueSuppliers.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* Product Type Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo de Produto</label>
            <select
              id="report-filter-product-type"
              value={draftSelectedProductType}
              onChange={(e) => setDraftSelectedProductType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
            >
              <option value="todos">Todos os tipos</option>
              <option value="produto comum">Produto Comum</option>
              <option value="medicamento/farmácia">Medicamento / Farmácia</option>
              <option value="cosmético">Cosmético</option>
              <option value="alimentar">Alimentar</option>
              <option value="material escolar/escritório">Material Escolar / Escritório</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* Price Health Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saúde do Preço</label>
            <select
              id="report-filter-price-health"
              value={draftSelectedPriceHealth}
              onChange={(e) => setDraftSelectedPriceHealth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
            >
              <option value="todos">Todas as situações</option>
              <option value="excelente">Excelente (margem &gt;= 35%)</option>
              <option value="saudavel">Saudável (25% - 35%)</option>
              <option value="atencao">Atenção (15% - 25%)</option>
              <option value="baixo">Margem Baixa (0% - 15%)</option>
              <option value="prejuizo">Prejuízo (margem &lt;= 0%)</option>
            </select>
          </div>
        </div>

        {/* Toggles bar */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sinalizações e Estados de Stock</h4>
          
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-low-margin"
                type="checkbox"
                checked={draftLowMargin}
                onChange={(e) => setDraftLowMargin(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Margem Baixa</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-with-loss"
                type="checkbox"
                checked={draftWithLoss}
                onChange={(e) => setDraftWithLoss(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Com Prejuízo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-near-expiry"
                type="checkbox"
                checked={draftNearExpiration}
                onChange={(e) => setDraftNearExpiration(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Próximos da Validade (&lt; 30 dias)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-expired"
                type="checkbox"
                checked={draftExpired}
                onChange={(e) => setDraftExpired(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Vencidos</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-prescription"
                type="checkbox"
                checked={draftWithPrescription}
                onChange={(e) => setDraftWithPrescription(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Com Receita Médica</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-in-stock"
                type="checkbox"
                checked={draftInStock}
                onChange={(e) => setDraftInStock(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Em Stock</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input
                id="toggle-out-of-stock"
                type="checkbox"
                checked={draftOutOfStock}
                onChange={(e) => setDraftOutOfStock(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span>Sem Stock</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            id="trigger-generate-report-btn"
            onClick={triggerGenerateReport}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-600/10 cursor-pointer flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                <span>Gerando Relatório...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Gerar Relatório</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Selection of Report Type (Hides completely during device print layout) */}
      <div
        id="report-type-navigation"
        className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-2 flex flex-wrap gap-1 shadow-xs"
      >
        <button
          id="report-type-btn-geral"
          onClick={() => setActiveReport("geral")}
          className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
            activeReport === "geral"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          Geral de Produtos
        </button>
        <button
          id="report-type-btn-precificacao"
          onClick={() => setActiveReport("precificacao")}
          className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
            activeReport === "precificacao"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          Precificação
        </button>
        <button
          id="report-type-btn-stock"
          onClick={() => setActiveReport("stock")}
          className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
            activeReport === "stock"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          Stock & Distribuição
        </button>
        <button
          id="report-type-btn-rentabilidade"
          onClick={() => setActiveReport("rentabilidade")}
          className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
            activeReport === "rentabilidade"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          Rentabilidade
        </button>
        
        {businessType === "farmacia" && (
          <button
            id="report-type-btn-medicamentos"
            onClick={() => setActiveReport("medicamentos")}
            className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
              activeReport === "medicamentos"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            Medicamentos (Farmácia)
          </button>
        )}

        <button
          id="report-type-btn-historico"
          onClick={() => setActiveReport("historico")}
          className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
            activeReport === "historico"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }`}
        >
          Histórico de Alterações
        </button>
      </div>

      {/* 3. Actions toolbar: EXPORT / PRINT / SAVE (Hides completely during device print layout) */}
      <div
        id="report-actions-panel"
        className="print:hidden bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2">
          <FileText className="text-slate-400" size={18} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Relatório Ativo: <span className="text-emerald-600 dark:text-emerald-400">{
              activeReport === "geral" ? "Geral de Produtos" :
              activeReport === "precificacao" ? "Precificação Detalhada" :
              activeReport === "stock" ? "Gestão de Stock" :
              activeReport === "rentabilidade" ? "Rentabilidade & ROI" :
              activeReport === "medicamentos" ? "Medicamentos Registados" :
              "Histórico de Reajustes"
            }</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200/50 dark:border-emerald-800/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar Excel</span>
          </button>

          <button
            id="export-pdf-btn"
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200/50 dark:border-indigo-800/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} />
            <span>Exportar PDF</span>
          </button>

          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 4. ACTUAL MAIN REPORT RENDER CONTAINER     */}
      {/* ========================================== */}
      <div id="print-section" className="relative space-y-6">
        {isGenerating && (
          <div className="print:hidden absolute inset-0 bg-white/75 dark:bg-slate-950/75 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center min-h-[300px] rounded-2xl border border-slate-150 dark:border-slate-800">
            <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <RefreshCw className="animate-spin text-emerald-600 dark:text-emerald-400" size={32} />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Compilando Dados do Relatório...</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Sincronizando produtos e métricas...</p>
              </div>
            </div>
          </div>
        )}
        
        {/* PRINT ONLY HEADER */}
        <div id="print-header" className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase">
                {settings?.companyName || "PREÇOCERTO LDA"}
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Segmento: {businessType.toUpperCase()} | Moeda: {settings?.currency || "Kz"}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-md font-bold text-slate-700 uppercase">
                {activeReport === "geral" && "Relatório Geral de Produtos"}
                {activeReport === "precificacao" && "Relatório de Precificação Detalhada"}
                {activeReport === "stock" && "Relatório de Distribuição de Stock"}
                {activeReport === "rentabilidade" && "Relatório de Rentabilidade & ROI"}
                {activeReport === "medicamentos" && "Relatório de Medicamentos Registados"}
                {activeReport === "historico" && "Relatório de Histórico de Alterações"}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Emissão: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
          
          {/* APPLIED FILTERS HEADER SECTION FOR PRINT */}
          <div className="mt-4 bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] font-bold uppercase block text-slate-500 font-mono">Filtros Aplicados:</span>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{appliedFiltersSummary}</p>
          </div>
        </div>

        {/* SCREEN DISPLAY FILTERS APPLIED */}
        <div className="print:hidden flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
          <Info size={14} className="text-slate-400 shrink-0" />
          <div className="text-xs text-slate-500 dark:text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-bold text-slate-700 dark:text-slate-300">Filtros ativos:</span> {appliedFiltersSummary}
          </div>
        </div>

        {/* 6. EXECUTIVE SUMMARY COMPONENT */}
        <div
          id="report-executive-summary"
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <span className="text-sm font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
              Resumo Executivo do Relatório
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Registros</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block font-mono mt-1 whitespace-nowrap">
                {summaryMetrics.totalCount}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Investimento</span>
              <span className="text-base font-extrabold text-slate-850 dark:text-slate-100 block font-mono mt-1 whitespace-nowrap">
                {formatVal(summaryMetrics.totalInvestment)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Receita Esp.</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-450 block font-mono mt-1 whitespace-nowrap">
                {formatVal(summaryMetrics.totalRevenue)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Lucro Esperado</span>
              <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 block font-mono mt-1 whitespace-nowrap">
                {formatVal(summaryMetrics.totalExpectedProfit)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Margem Média</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block font-mono mt-1">
                {summaryMetrics.avgMargin.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">ROI Médio</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block font-mono mt-1">
                {summaryMetrics.avgRoi.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-xl border border-rose-100/55 dark:border-rose-900/30">
              <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block">Margem Baixa</span>
              <span className="text-base font-extrabold text-rose-600 dark:text-rose-450 block font-mono mt-1">
                {summaryMetrics.countLowMargin}
              </span>
            </div>

            <div className="p-3 bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100/55 dark:border-red-900/30">
              <span className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider block">Com Prejuízo</span>
              <span className="text-base font-extrabold text-red-600 dark:text-red-450 block font-mono mt-1">
                {summaryMetrics.countWithLoss}
              </span>
            </div>
          </div>

          {/* If Farmácia, show specific medical statistics */}
          {(businessType === "farmacia" || activeReport === "medicamentos") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-xl border border-emerald-100/40 dark:border-emerald-900/20">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider block">Medicamentos</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-1 block">
                  {summaryMetrics.countMedicamentos}
                </span>
              </div>
              <div className="p-3 bg-amber-50/30 dark:bg-amber-950/10 rounded-xl border border-amber-100/40 dark:border-amber-900/20">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-450 uppercase tracking-wider block">Próximos do Vencimento</span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-450 font-mono mt-1 block">
                  {summaryMetrics.countNearExpiry}
                </span>
              </div>
              <div className="p-3 bg-rose-50/30 dark:bg-rose-950/10 rounded-xl border border-rose-100/40 dark:border-rose-900/20">
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wider block">Medicamentos Vencidos</span>
                <span className="text-base font-extrabold text-rose-600 dark:text-rose-450 font-mono mt-1 block">
                  {summaryMetrics.countExpired}
                </span>
              </div>
              <div className="p-3 bg-sky-50/30 dark:bg-sky-950/10 rounded-xl border border-sky-100/40 dark:border-sky-900/20">
                <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Com Receita Obrigatória</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-1 block">
                  {summaryMetrics.countPrescription}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 7. TABLES RENDERING */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* ==================================== */}
          {/* REPORT 1: GENERAL PRODUCT REPORT     */}
          {/* ==================================== */}
          {activeReport === "geral" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Nome</th>
                    <th className="py-3 px-4 whitespace-nowrap">Categoria</th>
                    <th className="py-3 px-4 whitespace-nowrap">Fornecedor</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Comprado</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Vendido</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Stock</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Custo Un.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Preço de Venda</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Lucro Un.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Lucro Esperado</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Margem</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ROI</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Saúde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-450">
                        Nenhum produto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const health = getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0);
                      const unitCost = p.custoRealUnidadeVenda || p.custoTotalReal || p.custoCompra || 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-150 whitespace-nowrap">{p.nome}</td>
                          <td className="py-3 px-4 text-slate-450 whitespace-nowrap">{p.categoria || "Não informado"}</td>
                          <td className="py-3 px-4 text-slate-450 whitespace-nowrap">{p.fornecedor || "Não informado"}</td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.quantidade || 1}</td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.quantidadeVendida || 0}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">{formatVal(unitCost)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">{formatVal(p.precoVendaRecomendado || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-450 whitespace-nowrap">
                            {formatVal(p.lucroEstimado || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">
                            {formatVal(p.lucroTotalEsperado || 0)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.margemReal ? `${p.margemReal.toFixed(1)}%` : "0%"}</td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.roi ? `${p.roi.toFixed(1)}%` : "0%"}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${health.bgClass}`}>
                              {health.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================================== */}
          {/* REPORT 2: PRICING REPORT             */}
          {/* ==================================== */}
          {activeReport === "precificacao" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Produto</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Custo Total Lote</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Custo Unitário Real</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Margem Desejada</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Preço Recomendado</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Lucro Estimado</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ROI</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-450">
                        Nenhum produto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const health = getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0);
                      const unitCost = p.custoRealUnidadeVenda || p.custoTotalReal || p.custoCompra || 0;
                      const totalCusto = p.loteCustoTotal || (p.custoTotalReal || p.custoCompra) * (p.quantidade || 1);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-150 whitespace-nowrap">{p.nome}</td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">{formatVal(totalCusto)}</td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">{formatVal(unitCost)}</td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.margemDesejada || 0}%</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {formatVal(p.precoVendaRecomendado || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-450 whitespace-nowrap">
                            {formatVal(p.lucroEstimado || 0)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">{p.roi ? `${p.roi.toFixed(1)}%` : "0%"}</td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${health.bgClass}`}>
                              {health.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================================== */}
          {/* REPORT 3: STOCK REPORT               */}
          {/* ==================================== */}
          {activeReport === "stock" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Produto</th>
                    <th className="py-3 px-4 whitespace-nowrap">Categoria</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Und. Compra</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Und. Venda</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Quantidade Lote</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Quantidade Vendida</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Stock Disponível</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Total Unidades Vendáveis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-450">
                        Nenhum produto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-150 whitespace-nowrap">{p.nome}</td>
                        <td className="py-3 px-4 text-slate-450 whitespace-nowrap">{p.categoria || "Não informado"}</td>
                        <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.unidadeCompra || "Unidade"}</td>
                        <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.unidadeVenda || "Unidade"}</td>
                        <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.quantidade || 1}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">{p.quantidadeVendida || 0}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                          {p.totalUnidadesVendaveis || p.quantidade || 1}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================================== */}
          {/* REPORT 4: PROFITABILITY REPORT       */}
          {/* ==================================== */}
          {activeReport === "rentabilidade" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Produto</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Investimento Real (Custo)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Receita Esperada (Faturamento)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Lucro Total Esperado</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Margem Real</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ROI</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-450">
                        Nenhum produto corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const health = getPriceHealth(p.lucroEstimado || 0, p.margemReal || 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-150 whitespace-nowrap">{p.nome}</td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">{formatVal(p.loteCustoTotal || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {formatVal(p.receitaTotalEsperada || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">
                            {formatVal(p.lucroTotalEsperado || 0)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            {p.margemReal ? `${p.margemReal.toFixed(1)}%` : "0%"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            {p.roi ? `${p.roi.toFixed(1)}%` : "0%"}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${health.bgClass}`}>
                              {health.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================================== */}
          {/* REPORT 5: MEDICINE PHARMACY REPORT   */}
          {/* ==================================== */}
          {activeReport === "medicamentos" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Nome Comercial</th>
                    <th className="py-3 px-4 whitespace-nowrap">Princípio Ativo</th>
                    <th className="py-3 px-4 whitespace-nowrap">Dosagem</th>
                    <th className="py-3 px-4 whitespace-nowrap">Forma</th>
                    <th className="py-3 px-4 whitespace-nowrap">Laboratório</th>
                    <th className="py-3 px-4 whitespace-nowrap">Lote</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Validade</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Receita?</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Stock</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Preço de Venda</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Margem</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ROI</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Estado Validade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-450">
                        Nenhum medicamento corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      let alertColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20";
                      let alertText = "Válido";
                      
                      if (p.farmaciaDataValidade) {
                        const expiryDate = new Date(p.farmaciaDataValidade);
                        const daysToExpiry = Math.ceil((expiryDate.getTime() - todayTime) / (1000 * 3600 * 24));
                        if (daysToExpiry < 0) {
                          alertColor = "text-red-600 bg-red-50 dark:bg-red-950/20 font-bold";
                          alertText = "Vencido 🚨";
                        } else if (daysToExpiry <= 30) {
                          alertColor = "text-amber-600 bg-amber-50 dark:bg-amber-950/20 font-semibold";
                          alertText = `${daysToExpiry} dias ⚠️`;
                        }
                      }
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-150 whitespace-nowrap">
                            {p.farmaciaNomeComercial || p.nome}
                          </td>
                          <td className="py-3 px-4 text-slate-450 whitespace-nowrap">{p.farmaciaPrincipioAtivo || "Não informado"}</td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{p.farmaciaDosagem || "Não informado"}</td>
                          <td className="py-3 px-4 text-slate-450 whitespace-nowrap">{p.farmaciaFormaFarmaceutica || "Não informado"}</td>
                          <td className="py-3 px-4 text-slate-450 whitespace-nowrap">{p.farmaciaLaboratorio || "Não informado"}</td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{p.farmaciaLote || "Não informado"}</td>
                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">{p.farmaciaDataValidade || "Não informado"}</td>
                          <td className="py-3 px-4 text-center capitalize whitespace-nowrap">{p.farmaciaNecessitaReceita || "Não informado"}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold whitespace-nowrap">
                            {p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">{formatVal(p.precoVendaRecomendado || 0)}</td>
                          <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                            {p.margemReal ? `${p.margemReal.toFixed(1)}%` : "0%"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">
                            {p.roi ? `${p.roi.toFixed(1)}%` : "0%"}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] ${alertColor}`}>
                              {alertText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ==================================== */}
          {/* REPORT 6: PRICE CHANGE HISTORY REPORT*/}
          {/* ==================================== */}
          {activeReport === "historico" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/60 text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">Data</th>
                    <th className="py-3 px-4 whitespace-nowrap">Produto</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Preço Anterior</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Novo Preço</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Variação</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Custo Anterior</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Novo Custo</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Margem Anterior</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Nova Margem</th>
                    <th className="py-3 px-4 whitespace-nowrap">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-450">
                        A carregar dados do histórico...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-450">
                        Nenhum reajuste no histórico corresponde aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((h) => {
                      const diffKz = h.newPrice - h.previousPrice;
                      const diffPct = h.previousPrice > 0 ? (diffKz / h.previousPrice) * 100 : 0;
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-850/20 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(h.createdAt?.split("T")[0] || "")}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-150 whitespace-nowrap">
                            {h.productName || "Produto desconhecido"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono whitespace-nowrap">{formatVal(h.previousPrice || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {formatVal(h.newPrice || 0)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-semibold whitespace-nowrap ${
                            diffKz > 0 ? "text-emerald-600 dark:text-emerald-400" : diffKz < 0 ? "text-rose-600" : "text-slate-500"
                          }`}>
                            {diffKz > 0 ? "+" : ""}{formatVal(diffKz)} ({diffPct > 0 ? "+" : ""}{diffPct.toFixed(1)}%)
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">{formatVal(h.previousCost || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">{formatVal(h.newCost || 0)}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">{h.previousMargin?.toFixed(1) || 0}%</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {h.newMargin?.toFixed(1) || 0}%
                          </td>
                          <td className="py-3 px-4 italic text-slate-500 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap" title={h.changeReason}>
                            {h.changeReason || "Não informado"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TOTAL SUMMARY COUNTERS IN BOTTOM TABLE CORNER */}
          <div className="bg-slate-50 dark:bg-slate-850/50 p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Registros exibidos: <span className="font-bold text-slate-700 dark:text-slate-300">{
                activeReport === "historico" ? filteredHistory.length : filteredProducts.length
              }</span> de <span className="font-semibold">{
                activeReport === "historico" ? history.length : products.length
              }</span> no total.
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1 font-mono text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 uppercase tracking-wider">Investimento Filtrado:</span>
                <span className="font-bold text-slate-850 dark:text-slate-100">{formatVal(summaryMetrics.totalInvestment)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 uppercase tracking-wider">Lucro Filtrado:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatVal(summaryMetrics.totalExpectedProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRINT ONLY FOOTER FOOTNOTE */}
        <div id="print-footer" className="hidden print:block border-t border-slate-300 pt-3 mt-12 text-center text-[10px] text-slate-400 font-mono">
          Relatório gerado pelo PreçoCerto | Emitido em: {new Date().toLocaleString()} | Pág 1 de 1
        </div>
      </div>
    </div>
  );
}
