import React, { useState, useEffect } from "react";
import { Product, BusinessSettings } from "../types";
import { CATEGORY_PRESETS, formatKz } from "../utils";
import { calculateProductFields, getPriceHealth } from "../utils/pricing";
import { calculateProductPricesWithCategoryMargin } from "../utils/categoryUtils";
import { useCategories } from "../hooks/useCategories"; // NOVO (Fase 2)
import { getProductMargin, validateMarginCompliance } from "../utils/categoryUtils"; // NOVO (Fase 2)
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Save, 
  TrendingUp, 
  Percent, 
  Coins, 
  Info,
  ChevronDown,
  Loader2,
  AlertCircle,
  Package,
  Activity,
  DollarSign,
  Briefcase,
  Layers,
  ShoppingCart,
  Tag,
  HelpCircle,
  Calendar
} from "lucide-react";
import { businessModuleRegistry } from "../modules/business-types";
import DynamicFieldRenderer from "./DynamicFieldRenderer";
import PackageConversionSection from "./PackageConversionSection"; // NOVO (Fase 3 - v2)

interface ProductFormProps {
  productToEdit?: Product | null;
  onSave: (
    productData: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">,
    changeReason?: string
  ) => Promise<void>;
  onCancel: () => void;
  settings?: BusinessSettings | null;
}

const UNIDADES_PRESETS = [
  "unidade",
  "caixa",
  "pacote",
  "kg",
  "litro",
  "metro",
  "saco",
  "par",
  "dúzia",
  "outro"
];

export default function ProductForm({ productToEdit, onSave, onCancel, settings }: ProductFormProps) {
  const activeModule = businessModuleRegistry.getModuleById(settings?.businessType || "outro");
  const [extraFieldValues, setExtraFieldValues] = useState<Record<string, any>>({});

  // NOVO (Fase 2): Categories and margin management
  const { categories, loading: categoriesLoading } = useCategories();
  const [categoryId, setCategoryId] = useState<string>("");
  const [margemOverride, setMargemOverride] = useState<string>("");
  const [margemOverrideReason, setMargemOverrideReason] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // States for Phase 7 change reason tracking
  const [changeReasonOption, setChangeReasonOption] = useState<string>("aumento do custo de compra");
  const [customChangeReason, setCustomChangeReason] = useState<string>("");

  const [nome, setNome] = useState<string>("");
  const [categoria, setCategoria] = useState<string>(activeModule.categories[0] || CATEGORY_PRESETS[0]);
  const [fornecedor, setFornecedor] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("1");
  
  // New Phase 3 Fields
  const [unidadeMedida, setUnidadeMedida] = useState<string>("unidade");
  const [modoCalculo, setModoCalculo] = useState<"manual" | "lote">("manual");
  const [quantidadeVendida, setQuantidadeVendida] = useState<string>("0");
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState<string>("1");

  // Custos Base
  const [custoCompra, setCustoCompra] = useState<string>("");
  const [custoTransporte, setCustoTransporte] = useState<string>("");
  const [custoEmbalagem, setCustoEmbalagem] = useState<string>("");
  const [outrosCustos, setOutrosCustos] = useState<string>("");

  // Cost Types (unidade / lote)
  const [custoTransporteTipo, setCustoTransporteTipo] = useState<"unidade" | "lote">("unidade");
  const [custoEmbalagemTipo, setCustoEmbalagemTipo] = useState<"unidade" | "lote">("unidade");
  const [outrosCustosTipo, setOutrosCustosTipo] = useState<"unidade" | "lote">("unidade");

  // Custos Variáveis
  const [comissaoVenda, setComissaoVenda] = useState<string>("");
  const [taxaBancaria, setTaxaBancaria] = useState<string>("");
  const [taxaMarketplace, setTaxaMarketplace] = useState<string>("");
  const [custoPublicidade, setCustoPublicidade] = useState<string>("");
  const [custoEntrega, setCustoEntrega] = useState<string>("");
  const [combustivel, setCombustivel] = useState<string>("");
  const [impostoTaxa, setImpostoTaxa] = useState<string>("");
  const [perdasDesperdicios, setPerdasDesperdicios] = useState<string>("");

  // Cost Types (Variables)
  const [comissaoVendaTipo, setComissaoVendaTipo] = useState<"unidade" | "lote">("unidade");
  const [taxaBancariaTipo, setTaxaBancariaTipo] = useState<"unidade" | "lote">("unidade");
  const [taxaMarketplaceTipo, setTaxaMarketplaceTipo] = useState<"unidade" | "lote">("unidade");
  const [custoPublicidadeTipo, setCustoPublicidadeTipo] = useState<"unidade" | "lote">("unidade");
  const [custoEntregaTipo, setCustoEntregaTipo] = useState<"unidade" | "lote">("unidade");
  const [combustivelTipo, setCombustivelTipo] = useState<"unidade" | "lote">("unidade");
  const [impostoTaxaTipo, setImpostoTaxaTipo] = useState<"unidade" | "lote">("unidade");
  const [perdasDesperdiciosTipo, setPerdasDesperdiciosTipo] = useState<"unidade" | "lote">("unidade");

  // Custos Fixos Rateados
  const [energia, setEnergia] = useState<string>("");
  const [internet, setInternet] = useState<string>("");
  const [renda, setRenda] = useState<string>("");
  const [salario, setSalario] = useState<string>("");
  const [agua, setAgua] = useState<string>("");
  const [contabilidade, setContabilidade] = useState<string>("");
  const [seguranca, setSeguranca] = useState<string>("");
  const [outrosCustosFixos, setOutrosCustosFixos] = useState<string>("");

  // Cost Types (Fixed)
  const [energiaTipo, setEnergiaTipo] = useState<"unidade" | "lote">("unidade");
  const [internetTipo, setInternetTipo] = useState<"unidade" | "lote">("unidade");
  const [rendaTipo, setRendaTipo] = useState<"unidade" | "lote">("unidade");
  const [salarioTipo, setSalarioTipo] = useState<"unidade" | "lote">("unidade");
  const [aguaTipo, setAguaTipo] = useState<"unidade" | "lote">("unidade");
  const [contabilidadeTipo, setContabilidadeTipo] = useState<"unidade" | "lote">("unidade");
  const [segurancaTipo, setSegurancaTipo] = useState<"unidade" | "lote">("unidade");
  const [outrosCustosFixosTipo, setOutrosCustosFixosTipo] = useState<"unidade" | "lote">("unidade");  const [margemDesejada, setMargemDesejada] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  // Novas propriedades da Fase 4: Conversão de Embalagem / Retalho
  const [tipoProduto, setTipoProduto] = useState<string>("produto comum");
  const [unidadeCompra, setUnidadeCompra] = useState<string>("unidade");
  const [unidadeVenda, setUnidadeVenda] = useState<string>("unidade");
  const [unidadesInternas, setUnidadesInternas] = useState<string>("1");
  const [venderEmbalagemInteira, setVenderEmbalagemInteira] = useState<boolean>(true);

  // Propriedades específicas de Farmácia
  const [farmaciaNomeComercial, setFarmaciaNomeComercial] = useState<string>("");
  const [farmaciaPrincipioAtivo, setFarmaciaPrincipioAtivo] = useState<string>("");
  const [farmaciaDosagem, setFarmaciaDosagem] = useState<string>("");
  const [farmaciaFormaFarmaceutica, setFarmaciaFormaFarmaceutica] = useState<string>("");
  const [farmaciaLaboratorio, setFarmaciaLaboratorio] = useState<string>("");
  const [farmaciaLote, setFarmaciaLote] = useState<string>("");
  const [farmaciaDataValidade, setFarmaciaDataValidade] = useState<string>("");
  const [farmaciaRegistroRegulatorio, setFarmaciaRegistroRegulatorio] = useState<string>("");
  const [farmaciaNecessitaReceita, setFarmaciaNecessitaReceita] = useState<"sim" | "não" | "não informado">("não informado");
  
  const [validationError, setValidationError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAdvancedCosts, setShowAdvancedCosts] = useState<boolean>(false);

  // NOVO (Fase 2): Auto-update margin when category changes
  useEffect(() => {
    if (selectedCategory && !margemOverride) {
      // Se não há override, usar margem da categoria
      setMargemDesejada(selectedCategory.marginRules.baseMargin.toString());
    }
  }, [selectedCategory, margemOverride]);

  // Auto-calculate available quantity
  useEffect(() => {
    const qComp = parseFloat(quantidade) || 0;
    const uInternas = parseFloat(unidadesInternas) || 1;
    const totalVend = venderEmbalagemInteira ? qComp : (qComp * uInternas);
    const qVend = parseFloat(quantidadeVendida) || 0;
    setQuantidadeDisponivel(Math.max(0, totalVend - qVend).toString());
  }, [quantidade, unidadesInternas, venderEmbalagemInteira, quantidadeVendida]);

  // NOVO (Fase 2): Load category data when product is edited or categories change
  useEffect(() => {
    if (productToEdit?.categoryId && categories.length > 0) {
      const cat = categories.find(c => c.id === productToEdit.categoryId);
      if (cat) {
        setCategoryId(cat.id);
        setSelectedCategory(cat);
        setMargemOverride(productToEdit.margemOverride?.toString() || "");
        setMargemOverrideReason(productToEdit.margemOverrideReason || "");
      }
    } else if (categories.length > 0 && !categoryId) {
      // Auto-select first category if none selected
      setCategoryId(categories[0].id);
      setSelectedCategory(categories[0]);
    }
  }, [productToEdit?.categoryId, categories, categoryId]);

  // Load product data when editing
  useEffect(() => {
    if (productToEdit) {
      setNome(productToEdit.nome || "");
      setCategoria(productToEdit.categoria || CATEGORY_PRESETS[0]);
      setFornecedor(productToEdit.fornecedor || "");
      setQuantidade(productToEdit.quantidade?.toString() || "1");
      
      setUnidadeMedida(productToEdit.unidadeMedida || "unidade");
      setModoCalculo(productToEdit.modoCalculo || "manual");
      setQuantidadeVendida(productToEdit.quantidadeVendida?.toString() || "0");
      setQuantidadeDisponivel(productToEdit.quantidadeDisponivel?.toString() || (productToEdit.quantidade?.toString() || "1"));

      // Base
      setCustoCompra(productToEdit.custoCompra?.toString() || "");
      setCustoTransporte(productToEdit.custoTransporte?.toString() || "");
      setCustoEmbalagem(productToEdit.custoEmbalagem?.toString() || "");
      setOutrosCustos(productToEdit.outrosCustos?.toString() || "");

      setCustoTransporteTipo(productToEdit.custoTransporteTipo || "unidade");
      setCustoEmbalagemTipo(productToEdit.custoEmbalagemTipo || "unidade");
      setOutrosCustosTipo(productToEdit.outrosCustosTipo || "unidade");
      
      // Variables
      setComissaoVenda(productToEdit.comissaoVenda?.toString() || "");
      setTaxaBancaria(productToEdit.taxaBancaria?.toString() || "");
      setTaxaMarketplace(productToEdit.taxaMarketplace?.toString() || "");
      setCustoPublicidade(productToEdit.custoPublicidade?.toString() || "");
      setCustoEntrega(productToEdit.custoEntrega?.toString() || "");
      setCombustivel(productToEdit.combustivel?.toString() || "");
      setImpostoTaxa(productToEdit.impostoTaxa?.toString() || "");
      setPerdasDesperdicios(productToEdit.perdasDesperdicios?.toString() || "");

      setComissaoVendaTipo(productToEdit.comissaoVendaTipo || "unidade");
      setTaxaBancariaTipo(productToEdit.taxaBancariaTipo || "unidade");
      setTaxaMarketplaceTipo(productToEdit.taxaMarketplaceTipo || "unidade");
      setCustoPublicidadeTipo(productToEdit.custoPublicidadeTipo || "unidade");
      setCustoEntregaTipo(productToEdit.custoEntregaTipo || "unidade");
      setCombustivelTipo(productToEdit.combustivelTipo || "unidade");
      setImpostoTaxaTipo(productToEdit.impostoTaxaTipo || "unidade");
      setPerdasDesperdiciosTipo(productToEdit.perdasDesperdiciosTipo || "unidade");

      // Fixed
      setEnergia(productToEdit.energia?.toString() || "");
      setInternet(productToEdit.internet?.toString() || "");
      setRenda(productToEdit.renda?.toString() || "");
      setSalario(productToEdit.salario?.toString() || "");
      setAgua(productToEdit.agua?.toString() || "");
      setContabilidade(productToEdit.contabilidade?.toString() || "");
      setSeguranca(productToEdit.seguranca?.toString() || "");
      setOutrosCustosFixos(productToEdit.outrosCustosFixos?.toString() || "");

      setEnergiaTipo(productToEdit.energiaTipo || "unidade");
      setInternetTipo(productToEdit.internetTipo || "unidade");
      setRendaTipo(productToEdit.rendaTipo || "unidade");
      setSalarioTipo(productToEdit.salarioTipo || "unidade");
      setAguaTipo(productToEdit.aguaTipo || "unidade");
      setContabilidadeTipo(productToEdit.contabilidadeTipo || "unidade");
      setSegurancaTipo(productToEdit.segurancaTipo || "unidade");
      setOutrosCustosFixosTipo(productToEdit.outrosCustosFixosTipo || "unidade");

      setMargemDesejada(productToEdit.margemDesejada?.toString() || "");
      setObservacoes(productToEdit.observacoes || "");

      // Fase 4 Loading
      setTipoProduto(productToEdit.tipoProduto || "produto comum");
      setUnidadeCompra(productToEdit.unidadeCompra || productToEdit.unidadeMedida || "unidade");
      setUnidadeVenda(productToEdit.unidadeVenda || "unidade");
      setUnidadesInternas(productToEdit.unidadesInternas?.toString() || "1");
      setVenderEmbalagemInteira(productToEdit.venderEmbalagemInteira !== undefined ? productToEdit.venderEmbalagemInteira : true);

      // Farmacia Loading
      setFarmaciaNomeComercial(productToEdit.farmaciaNomeComercial || "");
      setFarmaciaPrincipioAtivo(productToEdit.farmaciaPrincipioAtivo || "");
      setFarmaciaDosagem(productToEdit.farmaciaDosagem || "");
      setFarmaciaFormaFarmaceutica(productToEdit.farmaciaFormaFarmaceutica || "");
      setFarmaciaLaboratorio(productToEdit.farmaciaLaboratorio || "");
      setFarmaciaLote(productToEdit.farmaciaLote || "");
      setFarmaciaDataValidade(productToEdit.farmaciaDataValidade || "");
      setFarmaciaRegistroRegulatorio(productToEdit.farmaciaRegistroRegulatorio || "");
      setFarmaciaNecessitaReceita(productToEdit.farmaciaNecessitaReceita || "não informado");
    }
  }, [productToEdit]);

  // Load dynamic extra fields when editing or changing active module
  useEffect(() => {
    if (productToEdit) {
      const loadedExtra: Record<string, any> = {};
      activeModule.productExtraFields.forEach((field) => {
        if (productToEdit[field.key as keyof Product] !== undefined) {
          loadedExtra[field.key] = productToEdit[field.key as keyof Product];
        } else {
          loadedExtra[field.key] = "";
        }
      });
      setExtraFieldValues(loadedExtra);
    } else {
      const defaultExtra: Record<string, any> = {};
      activeModule.productExtraFields.forEach((field) => {
        defaultExtra[field.key] = "";
      });
      setExtraFieldValues(defaultExtra);
    }
  }, [productToEdit, activeModule]);

  // Keep category synchronized when business type changes
  useEffect(() => {
    if (!productToEdit && activeModule.categories.length > 0) {
      setCategoria(activeModule.categories[0]);
    }
  }, [activeModule, productToEdit]);

  // Derived calculations in real-time
  const calculated = getLiveCalculations();

  const checkHasChanges = () => {
    if (!productToEdit) return false;

    const prevPrice = productToEdit.venderEmbalagemInteira === false && productToEdit.precoRecomendadoUnidadeVenda !== undefined
      ? productToEdit.precoRecomendadoUnidadeVenda
      : productToEdit.precoVendaRecomendado;

    const prevQ = productToEdit.quantidade || 1;
    const prevCost = productToEdit.custoRealUnidadeVenda !== undefined
      ? productToEdit.custoRealUnidadeVenda
      : ((productToEdit.custoCompra || 0) + (productToEdit.custoTransporte || 0) + (productToEdit.custoEmbalagem || 0) + (productToEdit.outrosCustos || 0)) / prevQ;

    const prevMargin = productToEdit.margemReal || 0;

    const newPrice = calculated.precoRecomendadoUnidadeVenda;
    const newCost = calculated.custoRealUnidadeVenda;
    const newMargin = calculated.margemReal;

    const priceChanged = Math.abs((prevPrice || 0) - (newPrice || 0)) > 0.01;
    const costChanged = Math.abs((prevCost || 0) - (newCost || 0)) > 0.01;
    const marginChanged = Math.abs((prevMargin || 0) - (newMargin || 0)) > 0.01;

    // Direct input comparisons
    const parseNum = (val: string) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };
    const currentCustoCompra = parseNum(custoCompra);
    const costPurchaseChanged = Math.abs((productToEdit.custoCompra || 0) - currentCustoCompra) > 0.01;

    const currentMargemDesejada = parseNum(margemDesejada);
    const marginDesiredChanged = Math.abs((productToEdit.margemDesejada || 0) - currentMargemDesejada) > 0.01;

    // Check additional tracked fields from inputs
    const parsedQuantidade = parseFloat(quantidade) || 1;
    const qtyChanged = (productToEdit.quantidade || 1) !== parsedQuantidade;

    const parsedUnidadesInternas = parseFloat(unidadesInternas) || 1;
    const unitsChanged = (productToEdit.unidadesInternas || 1) !== parsedUnidadesInternas;

    const uVendaChanged = (productToEdit.unidadeVenda || "") !== unidadeVenda;
    const modeChanged = (productToEdit.venderEmbalagemInteira ?? true) !== venderEmbalagemInteira;

    return priceChanged || costChanged || marginChanged || costPurchaseChanged || marginDesiredChanged || qtyChanged || unitsChanged || uVendaChanged || modeChanged;
  };

  const showChangeReason = !!productToEdit && checkHasChanges();

  function getLiveCalculations() {
    const parseNum = (val: string) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    const parsedQtd = parseFloat(quantidade);
    const q = isNaN(parsedQtd) || parsedQtd <= 0 ? 1 : parsedQtd;

    // NOVO (Fase 2): Determinar margem a usar (override > base > input)
    let effectiveMargin = 0;
    if (margemOverride !== "") {
      effectiveMargin = parseFloat(margemOverride) || 0;
    } else if (selectedCategory) {
      effectiveMargin = selectedCategory.marginRules.baseMargin;
    } else {
      effectiveMargin = parseFloat(margemDesejada) || 0;
    }

    // Preparar dados de cálculo (sem margem, pois a função integrada a adiciona)
    const calculationData = {
      quantidade: q,
      modoCalculo,
      custoCompra: parseNum(custoCompra),
      custoTransporte: parseNum(custoTransporte),
      custoTransporteTipo,
      custoEmbalagem: parseNum(custoEmbalagem),
      custoEmbalagemTipo,
      outrosCustos: parseNum(outrosCustos),
      outrosCustosTipo,

      comissaoVenda: parseNum(comissaoVenda),
      comissaoVendaTipo,
      taxaBancaria: parseNum(taxaBancaria),
      taxaBancariaTipo,
      taxaMarketplace: parseNum(taxaMarketplace),
      taxaMarketplaceTipo,
      custoPublicidade: parseNum(custoPublicidade),
      custoPublicidadeTipo,
      custoEntrega: parseNum(custoEntrega),
      custoEntregaTipo,
      combustivel: parseNum(combustivel),
      combustivelTipo,
      impostoTaxa: parseNum(impostoTaxa),
      impostoTaxaTipo,
      perdasDesperdicios: parseNum(perdasDesperdicios),
      perdasDesperdiciosTipo,

      energia: parseNum(energia),
      energiaTipo,
      internet: parseNum(internet),
      internetTipo,
      renda: parseNum(renda),
      rendaTipo,
      salario: parseNum(salario),
      salarioTipo,
      agua: parseNum(agua),
      aguaTipo,
      contabilidade: parseNum(contabilidade),
      contabilidadeTipo,
      seguranca: parseNum(seguranca),
      segurancaTipo,
      outrosCustosFixos: parseNum(outrosCustosFixos),
      outrosCustosFixosTipo,

      unidadesInternas: parseNum(unidadesInternas),
      venderEmbalagemInteira
    };

    // NOVO (Fase 2): Usar cálculo integrado com margem da categoria
    const baseCalculated = selectedCategory
      ? calculateProductPricesWithCategoryMargin(
          calculationData,
          selectedCategory,
          margemOverride ? parseFloat(margemOverride) : undefined
        )
      : calculateProductFields({
          ...calculationData,
          margemDesejada: effectiveMargin
        });

    if (activeModule.calculationRules && typeof activeModule.calculationRules.applyModuleSpecificRules === "function") {
      const currentProductRepresentation = {
        nome,
        categoria,
        quantidade: q,
        custoCompra: parseNum(custoCompra),
        ...extraFieldValues
      };
      return activeModule.calculationRules.applyModuleSpecificRules(currentProductRepresentation, baseCalculated);
    }

    return baseCalculated;
  }

  const health = getPriceHealth(calculated.lucroEstimado, calculated.margemReal);

  // Visual helper to render Unit / Lote cost types next to inputs
  function renderTypeToggle(
    currentVal: "unidade" | "lote",
    onToggle: (val: "unidade" | "lote") => void
  ) {
    return (
      <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[10px] shrink-0 font-mono">
        <button
          type="button"
          onClick={() => onToggle("unidade")}
          className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${currentVal === "unidade" ? "bg-white text-emerald-700 font-bold shadow-xs border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}
        >
          Unit.
        </button>
        <button
          type="button"
          onClick={() => onToggle("lote")}
          className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${currentVal === "lote" ? "bg-white text-emerald-700 font-bold shadow-xs border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}
        >
          Lote
        </button>
      </div>
    );
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!nome.trim()) {
      setValidationError("O nome do produto é obrigatório.");
      return;
    }

    const parsedCustoCompra = parseFloat(custoCompra);
    if (isNaN(parsedCustoCompra)) {
      setValidationError("O custo de compra é obrigatório e deve ser um número válido.");
      return;
    }

    const parsedQuantidade = parseFloat(quantidade || "1");
    if (isNaN(parsedQuantidade) || parsedQuantidade <= 0) {
      setValidationError("A quantidade comprada do lote deve ser maior do que zero.");
      return;
    }

    const parsedQuantidadeVendida = parseFloat(quantidadeVendida || "0");
    if (isNaN(parsedQuantidadeVendida) || parsedQuantidadeVendida < 0) {
      setValidationError("A quantidade vendida não pode ser menor que zero.");
      return;
    }

    if (parsedQuantidadeVendida > parsedQuantidade) {
      setValidationError("A quantidade vendida não pode ser maior que a quantidade comprada.");
      return;
    }

    const parsedMargemDesejada = parseFloat(margemDesejada);
    if (isNaN(parsedMargemDesejada)) {
      setValidationError("A margem desejada é obrigatória e deve ser um número válido.");
      return;
    }

    if (modoCalculo === "lote" && parsedCustoCompra <= 0) {
      setValidationError("O custo total do lote deve ser maior que zero quando o modo lote estiver ativo.");
      return;
    }

    // Parse all helper costs and validate no negative numbers are allowed
    const parseOrZero = (val: string) => parseFloat(val || "0");

    const numFields = [
      { name: "Quantidade", val: parsedQuantidade },
      { name: "Quantidade Vendida", val: parsedQuantidadeVendida },
      { name: "Custo de compra", val: parsedCustoCompra },
      { name: "Custo de transporte", val: parseOrZero(custoTransporte) },
      { name: "Custo de embalagem", val: parseOrZero(custoEmbalagem) },
      { name: "Outros custos", val: parseOrZero(outrosCustos) },
      
      { name: "Comissão de venda", val: parseOrZero(comissaoVenda) },
      { name: "Taxa bancária", val: parseOrZero(taxaBancaria) },
      { name: "Taxa de marketplace", val: parseOrZero(taxaMarketplace) },
      { name: "Custo de publicidade", val: parseOrZero(custoPublicidade) },
      { name: "Custo de entrega", val: parseOrZero(custoEntrega) },
      { name: "Combustível", val: parseOrZero(combustivel) },
      { name: "Imposto/taxa", val: parseOrZero(impostoTaxa) },
      { name: "Perdas ou desperdícios", val: parseOrZero(perdasDesperdicios) },

      { name: "Energia", val: parseOrZero(energia) },
      { name: "Internet", val: parseOrZero(internet) },
      { name: "Renda", val: parseOrZero(renda) },
      { name: "Salário", val: parseOrZero(salario) },
      { name: "Água", val: parseOrZero(agua) },
      { name: "Contabilidade", val: parseOrZero(contabilidade) },
      { name: "Segurança", val: parseOrZero(seguranca) },
      { name: "Outros custos fixos", val: parseOrZero(outrosCustosFixos) },

      { name: "Margem desejada", val: parsedMargemDesejada }
    ];

    for (const f of numFields) {
      if (f.val < 0) {
        setValidationError(`${f.name} não pode ser menor do que zero.`);
        return;
      }
    }

    if (parsedMargemDesejada >= 100) {
      setValidationError("A margem desejada deve ser estritamente menor do que 100%.");
      return;
    }

    const parsedUnidadesInternas = parseFloat(unidadesInternas || "1");
    if (isNaN(parsedUnidadesInternas) || parsedUnidadesInternas <= 0) {
      setValidationError("As unidades internas por embalagem devem ser maiores do que zero.");
      return;
    }

    // Module configuration validation rules
    if (activeModule.validationRules.validate) {
      const moduleError = activeModule.validationRules.validate({
        ...extraFieldValues,
        nome: nome.trim(),
        categoria,
        fornecedor: fornecedor.trim(),
        quantidade: parsedQuantidade,
        custoCompra: parsedCustoCompra,
        margemDesejada: parsedMargemDesejada,
        venderEmbalagemInteira,
        unidadeCompra,
        unidadeVenda,
        unidadesInternas: parsedUnidadesInternas
      });
      if (moduleError) {
        setValidationError(moduleError);
        return;
      }
    }

    // NOVO (Fase 2): Validação de compliance de margem com categoria
    if (selectedCategory && margemOverride) {
      const marginValue = parseFloat(margemOverride);
      if (isNaN(marginValue)) {
        setValidationError("Margem override deve ser um número válido");
        return;
      }

      const complianceInfo = validateMarginCompliance(selectedCategory, marginValue);
      if (!complianceInfo.isCompliant) {
        setValidationError(`Margem não está em conformidade: ${complianceInfo.reason}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const hasChanges = checkHasChanges();
      const finalReason = hasChanges
        ? (changeReasonOption === "outro" ? (customChangeReason.trim() || "Outro") : changeReasonOption)
        : undefined;

      await onSave({
        nome: nome.trim(),
        categoria,
        fornecedor: fornecedor.trim(),
        quantidade: parsedQuantidade,

        // NOVO (Fase 2): Category-based margins
        categoryId: categoryId || null,
        margemOverride: margemOverride ? parseFloat(margemOverride) : null,
        margemOverrideReason: margemOverrideReason || null,

        // Phase 3 structural storage
        unidadeMedida,
        modoCalculo,
        quantidadeVendida: parsedQuantidadeVendida,
        quantidadeDisponivel: parseFloat(quantidadeDisponivel),

        // Base
        custoCompra: parsedCustoCompra,
        custoTransporte: parseOrZero(custoTransporte),
        custoTransporteTipo,
        custoEmbalagem: parseOrZero(custoEmbalagem),
        custoEmbalagemTipo,
        outrosCustos: parseOrZero(outrosCustos),
        outrosCustosTipo,

        // Variables
        comissaoVenda: parseOrZero(comissaoVenda),
        comissaoVendaTipo,
        taxaBancaria: parseOrZero(taxaBancaria),
        taxaBancariaTipo,
        taxaMarketplace: parseOrZero(taxaMarketplace),
        taxaMarketplaceTipo,
        custoPublicidade: parseOrZero(custoPublicidade),
        custoPublicidadeTipo,
        custoEntrega: parseOrZero(custoEntrega),
        custoEntregaTipo,
        combustivel: parseOrZero(combustivel),
        combustivelTipo,
        impostoTaxa: parseOrZero(impostoTaxa),
        impostoTaxaTipo,
        perdasDesperdicios: parseOrZero(perdasDesperdicios),
        perdasDesperdiciosTipo,

        // Fixed
        energia: parseOrZero(energia),
        energiaTipo,
        internet: parseOrZero(internet),
        internetTipo,
        renda: parseOrZero(renda),
        rendaTipo,
        salario: parseOrZero(salario),
        salarioTipo,
        agua: parseOrZero(agua),
        aguaTipo,
        contabilidade: parseOrZero(contabilidade),
        contabilidadeTipo,
        seguranca: parseOrZero(seguranca),
        segurancaTipo,
        outrosCustosFixos: parseOrZero(outrosCustosFixos),
        outrosCustosFixosTipo,

        margemDesejada: parsedMargemDesejada,
        precoVendaRecomendado: calculated.precoVendaRecomendado,
        lucroEstimado: calculated.lucroEstimado,
        margemReal: calculated.margemReal,
        roi: calculated.roi,
        observacoes: observacoes.trim(),

        // Novas propriedades Fase 4
        tipoProduto,
        unidadeCompra,
        unidadeVenda,
        unidadesInternas: parsedUnidadesInternas,
        venderEmbalagemInteira,
        totalUnidadesVendaveis: calculated.totalUnidadesVendaveis,
        custoRealUnidadeVenda: calculated.custoRealUnidadeVenda,
        precoRecomendadoUnidadeVenda: calculated.precoRecomendadoUnidadeVenda,
        lucroUnidadeVenda: calculated.lucroUnidadeVenda,
        receitaTotalEsperada: calculated.receitaTotalEsperada,
        lucroTotalEsperado: calculated.lucroTotalEsperado,

        // Farmácia
        farmaciaNomeComercial: farmaciaNomeComercial.trim(),
        farmaciaPrincipioAtivo: farmaciaPrincipioAtivo.trim(),
        farmaciaDosagem: farmaciaDosagem.trim(),
        farmaciaFormaFarmaceutica,
        farmaciaLaboratorio: farmaciaLaboratorio.trim(),
        farmaciaLote: farmaciaLote.trim(),
        farmaciaDataValidade,
        farmaciaRegistroRegulatorio: farmaciaRegistroRegulatorio.trim(),
        farmaciaNecessitaReceita,

        // Dynamic Extra Fields
        ...extraFieldValues
      }, finalReason);
    } catch (err) {
      console.error(err);
      let errorMsg = "Erro ao guardar o produto. Por favor, tente de novo.";
      if (err instanceof Error) {
        errorMsg = `Erro ao salvar o produto: ${err.message}`;
      }
      setValidationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="product-form-container" className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <button
          id="form-back-button"
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {productToEdit ? "Editar Produto" : "Cadastrar Novo Produto"}
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Configure a quantidade, estrutura de custos e tipo de aplicação por lote ou unidade de forma instantânea.
          </p>
        </div>
      </div>

      {validationError && (
        <motion.div 
          id="form-error-alert"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
          <span>{validationError}</span>
        </motion.div>
      )}

      {/* Main Grid: Form + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form panel */}
        <form onSubmit={handleFormSubmit} className="lg:col-span-2 space-y-6 bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
          
          {/* SECÇÃO: INFORMAÇÕES DO PRODUTO */}
          <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Package size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                📦 Informações do Produto
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nome do Produto <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-nome"
                  type="text"
                  placeholder="Ex: Coca-Cola 330ml, Paracetamol 500mg"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  required
                />
              </div>

              {/* NOVO (Fase 2): Category selection with margin management */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Categoria <span className="text-emerald-500">(Margem Gerida)</span>
                </label>
                {categoriesLoading ? (
                  <div className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500">
                    Carregando categorias...
                  </div>
                ) : categories.length > 0 ? (
                  <select
                    id="form-categoryId"
                    value={categoryId}
                    onChange={(e) => {
                      const selected = categories.find(c => c.id === e.target.value);
                      if (selected) {
                        setCategoryId(selected.id);
                        setSelectedCategory(selected);
                        setMargemDesejada(selected.marginRules.baseMargin.toString());
                        setMargemOverride("");
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.marginRules.baseMargin}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3.5 py-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
                    Nenhuma categoria criada. Aceda a "Categorias" para criar uma.
                  </div>
                )}
                {selectedCategory && (
                  <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-xs text-emerald-700 dark:text-emerald-400">
                    Margem: {selectedCategory.marginRules.baseMargin}% | Limite: {selectedCategory.marginRules.minMargin}%-{selectedCategory.marginRules.maxMargin}%
                  </div>
                )}
              </div>

              {/* Legacy category field for compatibility */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Categoria (Legacy)
                </label>
                <select
                  id="form-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                >
                  {activeModule.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Fornecedor / Origem
                </label>
                <input
                  id="form-fornecedor"
                  type="text"
                  placeholder="Ex: Armazém Central, Importador"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SECÇÃO: DETALHES ESPECÍFICOS DO NEGÓCIO */}
          {activeModule.productExtraFields.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Activity size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                  ✨ Informações Adicionais ({activeModule.name})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <DynamicFieldRenderer
                  fields={activeModule.productExtraFields}
                  values={extraFieldValues}
                  onChange={(key, val) => setExtraFieldValues(prev => ({ ...prev, [key]: val }))}
                />
              </div>
            </motion.div>
          )}

          {/* SECÇÃO: COMPRA */}
          <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <ShoppingCart size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                🛒 Compra
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Unidade de Compra
                </label>
                <select
                  value={unidadeCompra}
                  onChange={(e) => {
                    setUnidadeCompra(e.target.value);
                    setUnidadeMedida(e.target.value); // Sync with legacy field
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                >
                  {activeModule.purchaseUnits.map((un) => (
                    <option key={un} value={un}>
                      {un.charAt(0).toUpperCase() + un.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Quantidade Comprada <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
                  required
                />
              </div>

              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Modo de Cálculo <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setModoCalculo("manual")}
                    className={`py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      modoCalculo === "manual"
                        ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Por Unidade
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCalculo("lote")}
                    className={`py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      modoCalculo === "lote"
                        ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Por Lote
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {modoCalculo === "manual" ? "Custo de Compra por Unidade" : "Custo de Compra Total do Lote"} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs font-semibold text-slate-400">
                    Kz
                  </span>
                  <input
                    id="form-custocompra"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={custoCompra}
                    onChange={(e) => setCustoCompra(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECÇÃO: FORMA DE VENDA */}
          <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Tag size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                🏷️ Forma de Venda
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Vender Embalagem Inteira?
                </label>
                <select
                  value={venderEmbalagemInteira ? "sim" : "não"}
                  onChange={(e) => setVenderEmbalagemInteira(e.target.value === "sim")}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                >
                  <option value="sim">Sim, vender embalagem inteira</option>
                  <option value="não">Não, vender por unidade interna (retalho)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Unidade de Venda
                </label>
                <select
                  value={unidadeVenda}
                  onChange={(e) => setUnidadeVenda(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors"
                >
                  {activeModule.saleUnits.map((un) => (
                    <option key={un} value={un}>
                      {un.charAt(0).toUpperCase() + un.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Unidades Internas por Embalagem
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={unidadesInternas}
                  onChange={(e) => setUnidadesInternas(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/20 disabled:text-slate-400 transition-colors"
                  disabled={venderEmbalagemInteira}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Quantidade Já Vendida
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidadeVendida}
                  onChange={(e) => setQuantidadeVendida(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Quantidade Disponível
                </label>
                <input
                  type="number"
                  value={quantidadeDisponivel}
                  disabled
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-500 dark:text-slate-400 font-semibold transition-colors"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Total de Unidades Vendáveis
                </label>
                <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-sm font-mono text-emerald-800 dark:text-emerald-400 font-semibold h-[38px] flex items-center justify-center">
                  {calculated.totalUnidadesVendaveis} {venderEmbalagemInteira ? unidadeCompra : unidadeVenda}(s)
                </div>
              </div>
            </div>
          </div>

          {/* NOVO (Fase 3): Conversão de Embalagem */}
          <PackageConversionSection
            tipoProduto={tipoProduto}
            unidadeCompra={unidadeCompra}
            unidadeVenda={unidadeVenda}
            unidadesInternas={unidadesInternas}
            venderEmbalagemInteira={venderEmbalagemInteira}
            custoCompra={parseNum(custoCompra)}
            quantidade={quantidade}
            precoVendaRecomendado={calculated.precoVendaRecomendado}
            margemDesejada={parseNum(margemDesejada)}
            onUnidadeCompraChange={setUnidadeCompra}
            onUnidadeVendaChange={setUnidadeVenda}
            onUnidadesInternasChange={setUnidadesInternas}
            onVenderEmbalagemInteiraChange={setVenderEmbalagemInteira}
            showResults={true}
          />

          {/* SECÇÃO: CUSTOS */}
          <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Coins size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                  💰 Custos Adicionais e Rateados
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedCosts(!showAdvancedCosts)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg transition-colors"
              >
                <span>{showAdvancedCosts ? "Ocultar Avançados" : "Mostrar Avançados"}</span>
                <ChevronDown size={14} className={`transform transition-transform ${showAdvancedCosts ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* CUSTOS PRINCIPAIS / DIRETOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Transporte */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Transporte</label>
                  {renderTypeToggle(custoTransporteTipo, setCustoTransporteTipo)}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={custoTransporte}
                    onChange={(e) => setCustoTransporte(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>

              {/* Embalagem */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Embalagem</label>
                  {renderTypeToggle(custoEmbalagemTipo, setCustoEmbalagemTipo)}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={custoEmbalagem}
                    onChange={(e) => setCustoEmbalagem(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>

              {/* Outros Custos */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Outros Custos</label>
                  {renderTypeToggle(outrosCustosTipo, setOutrosCustosTipo)}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={outrosCustos}
                    onChange={(e) => setOutrosCustos(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* CUSTOS AVANÇADOS / MENOS COMUNS E FIXOS RATEADOS (COLLAPSIBLE) */}
            {showAdvancedCosts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800"
              >
                {/* Custos Adicionais Menos Comuns */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Outros Custos Adicionais
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Comissão */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Comissão de Venda</label>
                        {renderTypeToggle(comissaoVendaTipo, setComissaoVendaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={comissaoVenda}
                          onChange={(e) => setComissaoVenda(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* TPA */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Taxa Bancária (TPA)</label>
                        {renderTypeToggle(taxaBancariaTipo, setTaxaBancariaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={taxaBancaria}
                          onChange={(e) => setTaxaBancaria(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Marketplace */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Marketplace</label>
                        {renderTypeToggle(taxaMarketplaceTipo, setTaxaMarketplaceTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={taxaMarketplace}
                          onChange={(e) => setTaxaMarketplace(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Publicidade */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Publicidade</label>
                        {renderTypeToggle(custoPublicidadeTipo, setCustoPublicidadeTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={custoPublicidade}
                          onChange={(e) => setCustoPublicidade(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Entrega */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Custo de Entrega</label>
                        {renderTypeToggle(custoEntregaTipo, setCustoEntregaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={custoEntrega}
                          onChange={(e) => setCustoEntrega(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Combustível */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Combustível</label>
                        {renderTypeToggle(combustivelTipo, setCombustivelTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={combustivel}
                          onChange={(e) => setCombustivel(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Imposto */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Imposto / Taxa</label>
                        {renderTypeToggle(impostoTaxaTipo, setImpostoTaxaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={impostoTaxa}
                          onChange={(e) => setImpostoTaxa(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Perdas */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Perdas / Desperdício</label>
                        {renderTypeToggle(perdasDesperdiciosTipo, setPerdasDesperdiciosTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={perdasDesperdicios}
                          onChange={(e) => setPerdasDesperdicios(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custos Fixos Rateados */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Custos Fixos Operacionais (Rateados)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Energia */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Energia Elétrica</label>
                        {renderTypeToggle(energiaTipo, setEnergiaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={energia}
                          onChange={(e) => setEnergia(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Internet */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Internet / Tel</label>
                        {renderTypeToggle(internetTipo, setInternetTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={internet}
                          onChange={(e) => setInternet(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Renda */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Aluguer (Renda)</label>
                        {renderTypeToggle(rendaTipo, setRendaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={renda}
                          onChange={(e) => setRenda(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Salarios */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Salários</label>
                        {renderTypeToggle(salarioTipo, setSalarioTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={salario}
                          onChange={(e) => setSalario(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Agua */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Água</label>
                        {renderTypeToggle(aguaTipo, setAguaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={agua}
                          onChange={(e) => setAgua(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Contabilidade */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Contabilidade</label>
                        {renderTypeToggle(contabilidadeTipo, setContabilidadeTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={contabilidade}
                          onChange={(e) => setContabilidade(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Seguranca */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Segurança</label>
                        {renderTypeToggle(segurancaTipo, setSegurancaTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={seguranca}
                          onChange={(e) => setSeguranca(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Outros custos fixos */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Outros Fixos</label>
                        {renderTypeToggle(outrosCustosFixosTipo, setOutrosCustosFixosTipo)}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400">Kz</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={outrosCustosFixos}
                          onChange={(e) => setOutrosCustosFixos(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* SECÇÃO: RESULTADO DA PRECIFICAÇÃO */}
          <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Percent size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                📈 Resultado da Precificação
              </h3>
            </div>
            
            {/* NOVO (Fase 2): Category margin information card */}
            {selectedCategory && (
              <motion.div
                id="form-category-margin-info"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Info size={16} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                      Configuração de Margem da Categoria: {selectedCategory.name}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Base:</span>
                        <span className="text-emerald-900 dark:text-emerald-100 block font-mono font-bold">
                          {selectedCategory.marginRules.baseMargin}%
                        </span>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Mín-Máx:</span>
                        <span className="text-emerald-900 dark:text-emerald-100 block font-mono font-bold">
                          {selectedCategory.marginRules.minMargin}%-{selectedCategory.marginRules.maxMargin}%
                        </span>
                      </div>
                      {selectedCategory.regulatoryConstraints?.maxMarginPercentage && (
                        <div>
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">Regulatório:</span>
                          <span className="text-amber-900 dark:text-amber-100 block font-mono font-bold">
                            Máx {selectedCategory.regulatoryConstraints.maxMarginPercentage}%
                          </span>
                        </div>
                      )}
                      {selectedCategory.regulatoryConstraints?.restrictionBody && (
                        <div>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">Regulador:</span>
                          <span className="text-slate-900 dark:text-slate-100 block text-[10px]">
                            {selectedCategory.regulatoryConstraints.restrictionBody}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* NOVO (Fase 2): Margin override section */}
            {selectedCategory && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    id="form-use-margin-override"
                    type="checkbox"
                    checked={margemOverride !== ""}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMargemOverride(selectedCategory.marginRules.baseMargin.toString());
                      } else {
                        setMargemOverride("");
                        setMargemOverrideReason("");
                      }
                    }}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="form-use-margin-override" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Sobrepor Margem da Categoria
                  </label>
                </div>

                {margemOverride !== "" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Margem Override %
                      </label>
                      <div className="relative">
                        <input
                          id="form-margem-override"
                          type="number"
                          step="0.1"
                          min="0"
                          max="99.9"
                          value={margemOverride}
                          onChange={(e) => setMargemOverride(e.target.value)}
                          className="w-full pr-10 pl-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-slate-800 dark:text-slate-100 transition-colors"
                        />
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Motivo da Sobreposição (Obrigatório)
                      </label>
                      <textarea
                        id="form-margem-override-reason"
                        placeholder="Ex: Produto com elevada procura no mercado / Ajuste competitivo / Campanha promocional"
                        rows={2}
                        value={margemOverrideReason}
                        onChange={(e) => setMargemOverrideReason(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                      />
                      {!margemOverrideReason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Precisa documentar o motivo para sobreposição.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Margem Desejada % <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Deve ser menor que 100%</span>
                </label>
                <div className="relative">
                  <input
                    id="form-margem-desejada"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    placeholder="Ex: 35"
                    value={margemDesejada}
                    onChange={(e) => setMargemDesejada(e.target.value)}
                    className={`w-full pr-10 pl-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border ${
                      calculated.margemReal < 0 
                        ? "border-rose-400 dark:border-rose-900/60 focus:border-rose-500 dark:focus:border-rose-400" 
                        : "border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400"
                    } rounded-lg text-sm font-mono focus:outline-none focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors`}
                    required
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            {calculated.margemReal < 0 && (
              <motion.div
                id="form-negative-margin-warning"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-xs shadow-xs"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
                <div className="space-y-1">
                  <p className="font-extrabold text-sm tracking-tight text-rose-800 dark:text-rose-250">
                    Aviso Importante: Margem de Lucro Negativa!
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-700/90 dark:text-rose-350">
                    O preço de venda unitário recomendado (<span className="font-bold">{formatKz(calculated.precoVendaRecomendadoUnitario)}</span>) é inferior ao custo total real unitário do produto (<span className="font-bold">{formatKz(calculated.custoTotalRealUnitario)}</span>), gerando prejuízo. A margem real calculada é de <span className="font-bold font-mono">{calculated.margemReal.toFixed(1)}%</span>.
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold italic mt-1">
                    Sugestão: Aumente a margem desejada ou tente reduzir os custos adicionais (transporte, embalagem, impostos) para tornar a precificação saudável.
                  </p>
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Observações / Detalhes Adicionais
              </label>
              <textarea
                id="form-observacoes"
                placeholder="Ex: Produto com alta saída no mercado."
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              />
            </div>

            {showChangeReason && (
              <motion.div 
                id="form-change-reason-block"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm">⚠️</span>
                  <label className="block text-xs font-bold text-slate-700 dark:text-amber-250">
                    Foi detetada uma alteração no Preço, Custo ou Margem do produto. Deseja informar o motivo da alteração? (Opcional)
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      id="change-reason-select"
                      value={changeReasonOption}
                      onChange={(e) => setChangeReasonOption(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                      <option value="aumento do custo de compra">Aumento do custo de compra</option>
                      <option value="redução do custo de compra">Redução do custo de compra</option>
                      <option value="alteração de margem">Alteração de margem</option>
                      <option value="alteração de fornecedor">Alteração de fornecedor</option>
                      <option value="alteração de embalagem">Alteração de embalagem</option>
                      <option value="ajuste promocional">Ajuste promocional</option>
                      <option value="correção de cadastro">Correção de cadastro</option>
                      <option value="outro">Outro (especificar ao lado)</option>
                    </select>
                  </div>
                  {changeReasonOption === "outro" && (
                    <div>
                      <input
                        id="custom-change-reason-input"
                        type="text"
                        placeholder="Escreva o motivo personalizado..."
                        value={customChangeReason}
                        onChange={(e) => setCustomChangeReason(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-slate-800 dark:text-slate-100 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              {calculated.margemReal < 0 && (
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <AlertCircle size={14} className="shrink-0 animate-bounce" />
                  <span>Atenção: Margem Real Negativa!</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                id="form-cancel-button"
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-905 disabled:text-slate-300 dark:disabled:text-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="form-save-button"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Guardar Produto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Live pricing simulator panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
            
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-5">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Cálculo em Tempo Real</span>
            </h2>

            <div className="space-y-4">
              {/* Custos split breakdown */}
              <div className="space-y-2 border-b border-slate-800 pb-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Custo Compra Unit.:</span>
                  <span className="font-mono text-slate-300">{formatKz(calculated.custoCompraUnitario)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custos Base Unit. Adicionais:</span>
                  <span className="font-mono text-slate-300">+{formatKz(calculated.custoBaseUnitario - calculated.custoCompraUnitario)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custos Variáveis Unit.:</span>
                  <span className="font-mono text-slate-300">+{formatKz(calculated.custosVariaveisUnitarios)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custos Fixos Unit.:</span>
                  <span className="font-mono text-slate-300">+{formatKz(calculated.custosFixosRateadosUnitarios)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-200 border-t border-slate-800/40">
                  <span className="uppercase text-[9px] tracking-wider text-slate-400">Custo Unitário Total Real:</span>
                  <span className="font-mono text-emerald-400">{formatKz(calculated.custoTotalRealUnitario)}</span>
                </div>
              </div>

              {/* Preco venda recomendado */}
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-emerald-400 block font-semibold uppercase">Preço Unitário Recomendado</span>
                  <span className="text-[8px] text-slate-400 mt-0.5 block max-w-[160px] leading-tight font-mono">
                    Custo Real Unit. / (1 - Margem %)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-emerald-400 text-lg">
                    {formatKz(calculated.precoVendaRecomendadoUnitario)}
                  </span>
                </div>
              </div>

              {/* Lucro estimado */}
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Lucro Unitário Esperado</span>
                  <span className="text-[8px] text-slate-400 mt-0.5 block font-mono">
                    Preço Venda Unit. - Custo Real Unit.
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-bold text-base ${calculated.lucroEstimadoUnitario <= 0 ? "text-rose-400" : "text-emerald-300"}`}>
                    {calculated.lucroEstimadoUnitario > 0 ? "+" : ""}{formatKz(calculated.lucroEstimadoUnitario)}
                  </span>
                </div>
              </div>

              {/* Margem Real & ROI */}
              <div className="space-y-3 pb-2 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Margem Real</span>
                  </div>
                  <div className="text-right flex items-center gap-1.5 justify-end">
                    {calculated.margemReal < 0 && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 animate-pulse">
                        NEGATIVA
                      </span>
                    )}
                    <span className={`font-mono font-bold text-sm ${calculated.margemReal < 0 ? "text-rose-400 font-extrabold" : "text-slate-100"}`}>
                      {calculated.margemReal.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">ROI Estimado</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-100 text-sm">
                      {calculated.roi.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Batch-level summary when qty > 1 */}
              {parseFloat(quantidade) > 1 && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/30 rounded-lg text-xs space-y-1.5">
                  <div className="font-bold text-emerald-400 text-[10px] uppercase tracking-wider mb-1">Resumo Total do Lote ({quantidade} {unidadeMedida})</div>
                  <div className="flex justify-between text-slate-300">
                    <span>Investimento Lote:</span>
                    <span className="font-mono text-slate-200">{formatKz(calculated.loteCustoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Faturamento Estimado:</span>
                    <span className="font-mono text-slate-200">{formatKz(calculated.loteVendaTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-300">
                    <span>Lucro Total Lote:</span>
                    <span className="font-mono">+{formatKz(calculated.loteLucroTotal)}</span>
                  </div>
                </div>
              )}

              {/* Price Health indicator */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Saúde do Preço:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${health.colorClass}`}></span>
                  <span className="text-xs font-bold text-slate-200">{health.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick guidance notice info */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-2.5 text-xs text-slate-500 leading-relaxed">
            <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Fórmulas da Fase 3</p>
              <p className="mt-0.5 font-mono text-[10px] leading-relaxed">
                Custo de Compra Unit. = Manual (Modo A) ou Total Lote / Quantidade (Modo B).<br />
                Custos Adicionais can be configured per unit or for the whole lot.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
