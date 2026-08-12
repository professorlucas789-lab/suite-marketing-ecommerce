export interface CalculationInput {
  quantidade?: number; // Quantidade comprada do lote
  modoCalculo?: "manual" | "lote";
  custoCompra: number;
  custoTransporte: number;
  custoEmbalagem: number;
  outrosCustos: number;
  
  // Opcionais da Fase 2
  comissaoVenda?: number;
  taxaBancaria?: number;
  taxaMarketplace?: number;
  custoPublicidade?: number;
  custoEntrega?: number;
  combustivel?: number;
  impostoTaxa?: number;
  perdasDesperdicios?: number;

  energia?: number;
  internet?: number;
  renda?: number;
  salario?: number;
  agua?: number;
  contabilidade?: number;
  seguranca?: number;
  outrosCustosFixos?: number;

  margemDesejada: number;

  // Tipos de cálculo de custos adicionais da Fase 3 ("unidade" | "lote")
  custoTransporteTipo?: "unidade" | "lote";
  custoEmbalagemTipo?: "unidade" | "lote";
  outrosCustosTipo?: "unidade" | "lote";
  comissaoVendaTipo?: "unidade" | "lote";
  taxaBancariaTipo?: "unidade" | "lote";
  taxaMarketplaceTipo?: "unidade" | "lote";
  custoPublicidadeTipo?: "unidade" | "lote";
  custoEntregaTipo?: "unidade" | "lote";
  combustivelTipo?: "unidade" | "lote";
  impostoTaxaTipo?: "unidade" | "lote";
  perdasDesperdiciosTipo?: "unidade" | "lote";
  energiaTipo?: "unidade" | "lote";
  internetTipo?: "unidade" | "lote";
  rendaTipo?: "unidade" | "lote";
  salarioTipo?: "unidade" | "lote";
  aguaTipo?: "unidade" | "lote";
  contabilidadeTipo?: "unidade" | "lote";
  segurancaTipo?: "unidade" | "lote";
  outrosCustosFixosTipo?: "unidade" | "lote";

  // Fase 4 Fields
  unidadesInternas?: number;
  venderEmbalagemInteira?: boolean;
}

export interface HealthStatus {
  status: "excelente" | "saudavel" | "atencao" | "baixo" | "prejuizo";
  label: string;
  colorClass: string; 
  bgClass: string;
  textClass: string;
}

/**
 * Returns the pricing health status (verde, azul, amarelo, vermelho, crítico).
 * - Verde: Excelente (margem >= 35%)
 * - Azul: Saudável (margem entre 25% e 34,99%)
 * - Amarelo: Atenção (margem entre 15% e 24,99%)
 * - Vermelho: Margem baixa (margem abaixo de 15%)
 * - Crítico: Prejuízo (lucro <= 0)
 */
export function getPriceHealth(lucro: number, margem: number): HealthStatus {
  if (lucro <= 0) {
    return {
      status: "prejuizo",
      label: "Prejuízo",
      colorClass: "bg-red-500",
      bgClass: "bg-red-50 text-red-700 border-red-200",
      textClass: "text-red-600 font-semibold"
    };
  }
  
  if (margem >= 35) {
    return {
      status: "excelente",
      label: "Excelente",
      colorClass: "bg-emerald-500",
      bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      textClass: "text-emerald-600 font-semibold"
    };
  } else if (margem >= 25) {
    return {
      status: "saudavel",
      label: "Saudável",
      colorClass: "bg-sky-500",
      bgClass: "bg-sky-50 text-sky-700 border-sky-200",
      textClass: "text-sky-600 font-semibold"
    };
  } else if (margem >= 15) {
    return {
      status: "atencao",
      label: "Atenção",
      colorClass: "bg-amber-500",
      bgClass: "bg-amber-50 text-amber-700 border-amber-200",
      textClass: "text-amber-600 font-semibold"
    };
  } else {
    return {
      status: "baixo",
      label: "Margem baixa",
      colorClass: "bg-rose-500",
      bgClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-600 font-semibold"
    };
  }
}

/**
 * Calculates all product price fields.
 * 
 * Formulas:
 * - Custo base = custoCompra + custoTransporte + custoEmbalagem + outrosCustos
 * - Custos variáveis = comissaoVenda + taxaBancaria + taxaMarketplace + custoPublicidade + custoEntrega + combustivel + impostoTaxa + perdasDesperdicios
 * - Custos fixos rateados = energia + internet + renda + salario + agua + contabilidade + seguranca + outrosCustosFixos
 * - Custo total real = custo base + custos variáveis + custos fixos rateados
 * - Preço de venda recomendado = custo total real / (1 - margem desejada / 100)
 * - Lucro estimado = preço de venda recomendado - custo total real
 * - Margem real = lucro estimado / preço de venda recomendado * 100
 * - ROI = lucro estimado / custo total real * 100
 */
export function calculateProductFields(fields: CalculationInput) {
  const quantidade = fields.quantidade && fields.quantidade > 0 ? fields.quantidade : 1;
  const modoCalculo = fields.modoCalculo || "manual";

  const getUnitValue = (val: number | undefined, tipo: "unidade" | "lote" | undefined) => {
    const value = val || 0;
    if (tipo === "lote") {
      return value / quantidade;
    }
    return value;
  };

  const getLoteValue = (val: number | undefined, tipo: "unidade" | "lote" | undefined) => {
    const value = val || 0;
    if (tipo === "unidade") {
      return value * quantidade;
    }
    return value;
  };

  // Custo unitário de compra
  const custoCompraUnitario = modoCalculo === "lote" ? (fields.custoCompra || 0) / quantidade : (fields.custoCompra || 0);
  const custoCompraTotal = modoCalculo === "lote" ? (fields.custoCompra || 0) : (fields.custoCompra || 0) * quantidade;

  // Custos base unitários
  const custoTransporteUnitario = getUnitValue(fields.custoTransporte, fields.custoTransporteTipo);
  const custoEmbalagemUnitario = getUnitValue(fields.custoEmbalagem, fields.custoEmbalagemTipo);
  const outrosCustosUnitario = getUnitValue(fields.outrosCustos, fields.outrosCustosTipo);

  // Custos variáveis unitários
  const comissaoVendaUnitario = getUnitValue(fields.comissaoVenda, fields.comissaoVendaTipo);
  const taxaBancariaUnitario = getUnitValue(fields.taxaBancaria, fields.taxaBancariaTipo);
  const taxaMarketplaceUnitario = getUnitValue(fields.taxaMarketplace, fields.taxaMarketplaceTipo);
  const custoPublicidadeUnitario = getUnitValue(fields.custoPublicidade, fields.custoPublicidadeTipo);
  const custoEntregaUnitario = getUnitValue(fields.custoEntrega, fields.custoEntregaTipo);
  const combustivelUnitario = getUnitValue(fields.combustivel, fields.combustivelTipo);
  const impostoTaxaUnitario = getUnitValue(fields.impostoTaxa, fields.impostoTaxaTipo);
  const perdasDesperdiciosUnitario = getUnitValue(fields.perdasDesperdicios, fields.perdasDesperdiciosTipo);

  // Custos fixos unitários
  const energiaUnitario = getUnitValue(fields.energia, fields.energiaTipo);
  const internetUnitario = getUnitValue(fields.internet, fields.internetTipo);
  const rendaUnitario = getUnitValue(fields.renda, fields.rendaTipo);
  const salarioUnitario = getUnitValue(fields.salario, fields.salarioTipo);
  const aguaUnitario = getUnitValue(fields.agua, fields.aguaTipo);
  const contabilidadeUnitario = getUnitValue(fields.contabilidade, fields.contabilidadeTipo);
  const segurancaUnitario = getUnitValue(fields.seguranca, fields.segurancaTipo);
  const outrosCustosFixosUnitario = getUnitValue(fields.outrosCustosFixos, fields.outrosCustosFixosTipo);

  const margemDesejada = fields.margemDesejada || 0;

  // Custo base total do lote
  const custoBaseTotal = custoCompraTotal +
    getLoteValue(fields.custoTransporte, fields.custoTransporteTipo) +
    getLoteValue(fields.custoEmbalagem, fields.custoEmbalagemTipo) +
    getLoteValue(fields.outrosCustos, fields.outrosCustosTipo);

  // Custo base unitário
  const custoBaseUnitario = custoCompraUnitario + custoTransporteUnitario + custoEmbalagemUnitario + outrosCustosUnitario;

  // Custos variáveis unitários somados
  const custosVariaveisUnitarios = comissaoVendaUnitario + taxaBancariaUnitario + taxaMarketplaceUnitario + 
    custoPublicidadeUnitario + custoEntregaUnitario + combustivelUnitario + impostoTaxaUnitario + perdasDesperdiciosUnitario;

  // Custos fixos rateados unitários somados
  const custosFixosRateadosUnitarios = energiaUnitario + internetUnitario + rendaUnitario + salarioUnitario + 
    aguaUnitario + contabilidadeUnitario + segurancaUnitario + outrosCustosFixosUnitario;

  // Custo total real por unidade
  const custoTotalRealUnitario = custoBaseUnitario + custosVariaveisUnitarios + custosFixosRateadosUnitarios;

  // Fase 4 Fields - Conversão de Embalagem / Retalho
  const unidadesInternas = fields.unidadesInternas && fields.unidadesInternas > 0 ? fields.unidadesInternas : 1;
  const venderEmbalagemInteira = fields.venderEmbalagemInteira !== false;

  const totalUnidadesVendaveis = venderEmbalagemInteira ? quantidade : (quantidade * unidadesInternas);
  const loteCustoTotal = custoTotalRealUnitario * quantidade; // investimento total real
  
  const custoRealUnidadeVenda = venderEmbalagemInteira ? custoTotalRealUnitario : (custoTotalRealUnitario / unidadesInternas);

  let precoRecomendadoUnidadeVenda = 0;
  if (margemDesejada < 100) {
    const factor = 1 - (margemDesejada / 100);
    precoRecomendadoUnidadeVenda = factor > 0 ? custoRealUnidadeVenda / factor : 0;
  } else {
    precoRecomendadoUnidadeVenda = custoRealUnidadeVenda;
  }

  const lucroUnidadeVenda = precoRecomendadoUnidadeVenda - custoRealUnidadeVenda;
  const receitaTotalEsperada = precoRecomendadoUnidadeVenda * totalUnidadesVendaveis;
  const lucroTotalEsperado = lucroUnidadeVenda * totalUnidadesVendaveis;

  let roi = 0;
  if (loteCustoTotal > 0) {
    roi = (lucroTotalEsperado / loteCustoTotal) * 100;
  }

  let margemReal = 0;
  if (precoRecomendadoUnidadeVenda > 0) {
    margemReal = (lucroUnidadeVenda / precoRecomendadoUnidadeVenda) * 100;
  }

  const precoVendaRecomendado = precoRecomendadoUnidadeVenda;
  const lucroEstimado = lucroUnidadeVenda;

  return {
    custoBase: Math.round(custoBaseTotal * 100) / 100, // keep for compatibility as total input
    custoBaseUnitario: Math.round(custoBaseUnitario * 100) / 100,
    custosVariaveis: Math.round(custosVariaveisUnitarios * 100) / 100,
    custosFixosRateados: Math.round(custosFixosRateadosUnitarios * 100) / 100,
    custoTotalReal: Math.round(custoTotalRealUnitario * 100) / 100, // now returns unit cost for unit pricing
    precoVendaRecomendado: Math.round(precoVendaRecomendado * 100) / 100, // per unit
    lucroEstimado: Math.round(lucroEstimado * 100) / 100, // per unit
    margemReal: Math.round(margemReal * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    
    // Derived unit cost metrics for Phase 3 UI
    custoCompraUnitario: Math.round(custoCompraUnitario * 100) / 100,
    custoTotalRealUnitario: Math.round(custoTotalRealUnitario * 100) / 100,
    precoVendaRecomendadoUnitario: Math.round(precoVendaRecomendado * 100) / 100,
    lucroEstimadoUnitario: Math.round(lucroEstimado * 100) / 100,
    custosVariaveisUnitarios: Math.round(custosVariaveisUnitarios * 100) / 100,
    custosFixosRateadosUnitarios: Math.round(custosFixosRateadosUnitarios * 100) / 100,

    // Batch/lote indicators
    loteCustoTotal: Math.round(loteCustoTotal * 100) / 100,
    loteVendaTotal: Math.round(receitaTotalEsperada * 100) / 100,
    loteLucroTotal: Math.round(lucroTotalEsperado * 100) / 100,

    // Fase 4 Metrics
    totalUnidadesVendaveis: Math.round(totalUnidadesVendaveis * 100) / 100,
    custoRealUnidadeVenda: Math.round(custoRealUnidadeVenda * 100) / 100,
    precoRecomendadoUnidadeVenda: Math.round(precoRecomendadoUnidadeVenda * 100) / 100,
    lucroUnidadeVenda: Math.round(lucroUnidadeVenda * 100) / 100,
    receitaTotalEsperada: Math.round(receitaTotalEsperada * 100) / 100,
    lucroTotalEsperado: Math.round(lucroTotalEsperado * 100) / 100,
  };
}

/**
 * Evaluates alternative price for simulator
 */
export function evaluateAlternativePrice(custoTotalReal: number, testPrice: number) {
  const lucro = testPrice - custoTotalReal;
  const margem = testPrice > 0 ? (lucro / testPrice) * 100 : 0;
  const roi = custoTotalReal > 0 ? (lucro / custoTotalReal) * 100 : 0;
  const health = getPriceHealth(lucro, margem);

  return {
    lucro: Math.round(lucro * 100) / 100,
    margemReal: Math.round(margem * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    health
  };
}

/**
 * Formats a number with currency symbol and dynamic decimal format
 */
export function formatCurrency(value: number, currencySymbol: string = "Kz", numberFormat: string = "1.234,56"): string {
  const formattedVal = Math.round(value * 100) / 100;
  if (numberFormat === "1,234.56") {
    // English style (point for decimal, comma for thousand)
    return `${currencySymbol}\u00A0${formattedVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (numberFormat === "1 234,56") {
    // French/Space style
    const valString = formattedVal.toFixed(2);
    const parts = valString.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
    return `${currencySymbol}\u00A0${parts.join(",")}`;
  } else {
    // Portuguese style (comma for decimal, point for thousand)
    const valString = formattedVal.toFixed(2);
    const parts = valString.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${currencySymbol}\u00A0${parts.join(",")}`;
  }
}

/**
 * Formats a date string based on chosen date format
 */
export function formatDate(dateString: string, dateFormat: string = "DD/MM/YYYY"): string {
  if (!dateString) return "-";
  const parts = dateString.split("-"); // YYYY-MM-DD
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  if (dateFormat === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  } else if (dateFormat === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  } else {
    return `${day}/${month}/${year}`;
  }
}
