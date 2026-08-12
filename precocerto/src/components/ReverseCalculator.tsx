import React, { useState, useEffect } from "react";
import { Product, BusinessSettings } from "../types";
import { formatKz } from "../utils";
import { getPriceHealth } from "../utils/pricing";
import { motion } from "motion/react";
import { 
  Calculator, 
  HelpCircle, 
  Coins, 
  TrendingUp, 
  Percent, 
  Info,
  Layers,
  Activity,
  Sparkles,
  RefreshCw,
  ArrowRight
} from "lucide-react";

interface ReverseCalculatorProps {
  products: Product[];
  settings?: BusinessSettings | null;
}

export default function ReverseCalculator({ products, settings }: ReverseCalculatorProps) {
  // Option to select existing product
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Core Batch-Level Inputs
  const [quantidade, setQuantidade] = useState<string>("10");
  const [custoCompraLote, setCustoCompraLote] = useState<string>("10000");
  const [custosAdicionaisLote, setCustosAdicionaisLote] = useState<string>("2000");

  // Three vision simulation inputs
  const [desiredProfitPerUnit, setDesiredProfitPerUnit] = useState<string>("500");
  const [desiredProfitWholeLote, setDesiredProfitWholeLote] = useState<string>("5000");
  const [desiredPricePerUnit, setDesiredPricePerUnit] = useState<string>("1800");

  // Handle Loading an Existing Product
  useEffect(() => {
    if (!selectedProductId) return;

    const prod = products.find(p => p.id === selectedProductId);
    if (prod) {
      // For converted retail packaging, we calculate on saleable units
      const isConverted = prod.venderEmbalagemInteira === false && prod.totalUnidadesVendaveis !== undefined;
      const q = isConverted ? (prod.totalUnidadesVendaveis || 1) : (prod.quantidade && prod.quantidade > 0 ? prod.quantidade : 1);
      setQuantidade(q.toString());

      if (prod.loteCustoTotal !== undefined) {
        // If we already have the full calculated batch cost, load it directly
        setCustoCompraLote(prod.loteCustoTotal.toString());
        setCustosAdicionaisLote("0");
      } else {
        const isLote = prod.modoCalculo === "lote";
        const purchaseCostTotal = isLote ? (prod.custoCompra || 0) : (prod.custoCompra || 0) * (prod.quantidade || 1);
        setCustoCompraLote(purchaseCostTotal.toString());

        // Calculate other additional costs for the whole lot
        const totalAdditionalUnit = 
          (prod.custoTransporte || 0) + 
          (prod.custoEmbalagem || 0) + 
          (prod.outrosCustos || 0) +
          (prod.comissaoVenda || 0) +
          (prod.taxaBancaria || 0) +
          (prod.taxaMarketplace || 0) +
          (prod.custoPublicidade || 0) +
          (prod.custoEntrega || 0) +
          (prod.combustivel || 0) +
          (prod.impostoTaxa || 0) +
          (prod.perdasDesperdicios || 0) +
          (prod.energia || 0) +
          (prod.internet || 0) +
          (prod.renda || 0) +
          (prod.salario || 0) +
          (prod.agua || 0) +
          (prod.contabilidade || 0) +
          (prod.seguranca || 0) +
          (prod.outrosCustosFixos || 0);

        const additionalLoteTotal = totalAdditionalUnit * (prod.quantidade || 1);
        setCustosAdicionaisLote(additionalLoteTotal.toString());
      }

      // Pre-fill target simulations
      setDesiredProfitPerUnit((prod.lucroEstimado || 500).toString());
      setDesiredProfitWholeLote((prod.lucroTotalEsperado !== undefined ? prod.lucroTotalEsperado : (prod.lucroEstimado || 500) * q).toString());
      setDesiredPricePerUnit((prod.precoVendaRecomendado || 1800).toString());
    }
  }, [selectedProductId, products]);

  // Reset helper
  const handleReset = () => {
    setSelectedProductId("");
    setQuantidade("10");
    setCustoCompraLote("10000");
    setCustosAdicionaisLote("2000");
    setDesiredProfitPerUnit("500");
    setDesiredProfitWholeLote("5000");
    setDesiredPricePerUnit("1800");
  };

  // Safe parsing helpers
  const parseNum = (val: string, fallback: number = 0) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) || parsed < 0 ? fallback : parsed;
  };

  const qParsed = Math.max(1, parseNum(quantidade, 1));
  const purchaseCostParsed = parseNum(custoCompraLote);
  const additionalCostParsed = parseNum(custosAdicionaisLote);

  const totalInvestmentLote = purchaseCostParsed + additionalCostParsed;
  const custoUnitarioReal = totalInvestmentLote / qParsed;

  // VISÃO A: Quero ganhar X por unidade
  const xPerUnit = parseNum(desiredProfitPerUnit);
  const visionAPriceNeeded = custoUnitarioReal + xPerUnit;
  const visionAExpectedProfitLote = xPerUnit * qParsed;
  const visionAMargin = visionAPriceNeeded > 0 ? (xPerUnit / visionAPriceNeeded) * 100 : 0;
  const visionARoi = custoUnitarioReal > 0 ? (xPerUnit / custoUnitarioReal) * 100 : 0;
  const visionAHealth = getPriceHealth(xPerUnit, visionAMargin);

  // VISÃO B: Quero ganhar X no lote inteiro
  const xWholeLote = parseNum(desiredProfitWholeLote);
  const visionBProfitPerUnit = xWholeLote / qParsed;
  const visionBPriceNeeded = custoUnitarioReal + visionBProfitPerUnit;
  const visionBExpectedRevenue = visionBPriceNeeded * qParsed;
  const visionBMargin = visionBPriceNeeded > 0 ? (visionBProfitPerUnit / visionBPriceNeeded) * 100 : 0;
  const visionBRoi = custoUnitarioReal > 0 ? (visionBProfitPerUnit / custoUnitarioReal) * 100 : 0;
  const visionBHealth = getPriceHealth(visionBProfitPerUnit, visionBMargin);

  // VISÃO C: Quero vender por X a unidade
  const xPricePerUnit = parseNum(desiredPricePerUnit);
  const visionCLucroPerUnit = xPricePerUnit - custoUnitarioReal;
  const visionCExpectedProfitLote = visionCLucroPerUnit * qParsed;
  const visionCMargin = xPricePerUnit > 0 ? (visionCLucroPerUnit / xPricePerUnit) * 100 : 0;
  const visionCRoi = custoUnitarioReal > 0 ? (visionCLucroPerUnit / custoUnitarioReal) * 100 : 0;
  const visionCHealth = getPriceHealth(visionCLucroPerUnit, visionCMargin);

  return (
    <div id="reverse-calculator-view" className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Calculator className="text-emerald-600" size={26} />
            <span>Calculadora Reversa de Preços (Lote/Batch)</span>
          </h1>
          <p className="text-sm text-slate-500 font-sans">
            Simule cenários de lucros e preços ideais a partir de compras consolidadas em lotes.
          </p>
        </div>

        <button
          id="btn-reset-calculator"
          onClick={handleReset}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
        >
          <RefreshCw size={14} />
          <span>Reiniciar Simulador</span>
        </button>
      </div>

      {/* Select Existing Product as Template */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
          💡 Carregar Estrutura de Lote de um Produto Cadastrado
        </label>
        <div className="relative">
          <select
            id="calculator-product-select"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-slate-800 cursor-pointer appearance-none font-medium"
          >
            <option value="">-- Sandbox Manual (Digitar Dados do Lote Abaixo) --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} - {p.quantidade || 1} {p.unidadeMedida || 'un'} cadastrados
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500 text-xs">
            ▼
          </div>
        </div>
      </div>

      {/* Inputs Section: Sandbox do Lote */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
          <Sparkles size={16} className="text-emerald-500" />
          <span>1. Defina os Parâmetros do Lote (Sandbox)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quantidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Quantidade Comprada no Lote/Compra:
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 text-slate-800"
            />
          </div>

          {/* Custo Compra Lote */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Custo Total da Compra/Lote (Kz):
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 font-mono">Kz</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={custoCompraLote}
                onChange={(e) => setCustoCompraLote(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
          </div>

          {/* Custos Adicionais Lote */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Custos Totais Adicionais do Lote (Kz):
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 font-mono">Kz</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={custosAdicionaisLote}
                onChange={(e) => setCustosAdicionaisLote(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500 text-slate-800"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              (Soma de frete, embalagem, impostos e taxas agregadas do lote)
            </p>
          </div>
        </div>

        {/* Automatic derived cost card */}
        <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-semibold">Investimento Total Lote</span>
            <span className="text-lg font-bold text-slate-100">{formatKz(totalInvestmentLote)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-semibold">Tamanho do Lote</span>
            <span className="text-lg font-bold text-slate-100">{qParsed} unidades</span>
          </div>
          <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/30">
            <span className="text-[10px] text-emerald-400 block uppercase font-sans font-bold">Custo Unitário Real Calculado</span>
            <span className="text-lg font-extrabold text-emerald-300">{formatKz(custoUnitarioReal)}</span>
          </div>
        </div>
      </div>

      {/* Vision Simulations Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Coins size={16} className="text-emerald-600" />
          <span>2. Escolha um Cenário para Simulação Reversa</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Visão A */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs font-mono">A</span>
                <h3 className="font-bold text-slate-800 text-sm">Quero ganhar X por unidade</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Defina o lucro unitário desejado na mão para encontrar o preço ideal de venda e os resultados consolidados do lote.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-mono">Lucro Desejado Unitário (Kz):</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 font-mono">Kz</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={desiredProfitPerUnit}
                    onChange={(e) => setDesiredProfitPerUnit(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                <span className="text-[10px] text-slate-500 font-sans">Preço Necessário / un:</span>
                <span className="font-extrabold text-slate-800">{formatKz(visionAPriceNeeded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Lucro Lote Esperado:</span>
                <span className="font-bold text-emerald-600">+{formatKz(visionAExpectedProfitLote)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Margem Obtida:</span>
                <span className="font-bold text-slate-700">{visionAMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">ROI %:</span>
                <span className="font-bold text-slate-700">{visionARoi.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-sans">Saúde do Preço:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visionAHealth.bgClass}`}>
                  {visionAHealth.label}
                </span>
              </div>
            </div>
          </div>

          {/* Visão B */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs font-mono">B</span>
                <h3 className="font-bold text-slate-800 text-sm">Quero ganhar X no lote inteiro</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Defina o lucro total que quer tirar sobre todo o lote para descobrir o preço unitário e a receita de venda.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-mono">Lucro Desejado Total do Lote (Kz):</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 font-mono">Kz</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={desiredProfitWholeLote}
                    onChange={(e) => setDesiredProfitWholeLote(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                <span className="text-[10px] text-slate-500 font-sans">Preço Necessário / un:</span>
                <span className="font-extrabold text-slate-800">{formatKz(visionBPriceNeeded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Lucro Unitário:</span>
                <span className="font-bold text-emerald-600">+{formatKz(visionBProfitPerUnit)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Receita Venda Total:</span>
                <span className="font-bold text-slate-700">{formatKz(visionBExpectedRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Margem Obtida:</span>
                <span className="font-bold text-slate-700">{visionBMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">ROI %:</span>
                <span className="font-bold text-slate-700">{visionBRoi.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-sans">Saúde do Preço:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visionBHealth.bgClass}`}>
                  {visionBHealth.label}
                </span>
              </div>
            </div>
          </div>

          {/* Visão C */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center font-bold text-xs font-mono">C</span>
                <h3 className="font-bold text-slate-800 text-sm">Quero vender por X a unidade</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Insira o preço de venda unitário estimado e descubra qual será o seu lucro por unidade, lucro do lote e métricas.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 font-mono">Preço Venda Unitário Alvo (Kz):</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-slate-400 font-mono">Kz</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={desiredPricePerUnit}
                    onChange={(e) => setDesiredPricePerUnit(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                <span className="text-[10px] text-slate-500 font-sans">Lucro por Unidade:</span>
                <span className={`font-extrabold ${visionCLucroPerUnit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {visionCLucroPerUnit > 0 ? '+' : ''}{formatKz(visionCLucroPerUnit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Lucro Lote Esperado:</span>
                <span className={`font-bold ${visionCExpectedProfitLote > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {visionCExpectedProfitLote > 0 ? '+' : ''}{formatKz(visionCExpectedProfitLote)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">Margem Obtida:</span>
                <span className="font-bold text-slate-700">{visionCMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-sans">ROI %:</span>
                <span className="font-bold text-slate-700">{visionCRoi.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-sans">Saúde do Preço:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${visionCHealth.bgClass}`}>
                  {visionCHealth.label}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Concept Explanatory Info Box */}
      <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex items-start gap-3 text-xs text-indigo-700">
        <span className="text-xl">💡</span>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-900 text-sm">Vantagem da Precificação Reversa por Lotes</h4>
          <p className="leading-relaxed">
            Ao vender por caixas, pacotes, ou lotes fechados (como em mercados de fardo ou vestuário de revenda em Luanda), calcular a precificação baseando-se apenas na estimativa de uma única unidade muitas vezes omite o rateio real dos custos adicionais (como frete consolidado ou despesas de desembaraço).
          </p>
          <p className="leading-relaxed font-semibold">
            Esta calculadora distribui os custos totais adicionais por cada unidade do lote, permitindo que você tome decisões de desconto baseadas no volume real.
          </p>
        </div>
      </div>

    </div>
  );
}
