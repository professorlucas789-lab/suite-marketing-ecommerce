/**
 * Serviço de Detecção de Anomalias em Vendas
 * FASE 5-6: Detecção de Padrões Anormais
 *
 * Identifica desvios significativos em:
 * - Volumes de vendas
 * - Margens de lucro
 * - Movimentações de estoque
 * - Padrões de preços
 */

import { SalesAnomaly, DailySalesAggregate } from '../types/analytics';
import { Sale, Product } from '../types/store';

export class AnomalyDetectionService {
  /**
   * Detectar anomalia em venda individual
   * Compara com histórico e identifica desvios
   */
  static detectSaleAnomaly(
    sale: Sale,
    product: Product,
    historicalSales: Sale[],
    threshold: number = 2.5
  ): SalesAnomaly | null {
    // Calcular estatísticas históricas
    const historicalPrices = historicalSales
      .filter((s) => s.productId === sale.productId)
      .map((s) => s.unitPrice);

    if (historicalPrices.length < 5) {
      return null; // Dados insuficientes
    }

    const mean = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
    const variance =
      historicalPrices.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
      historicalPrices.length;
    const stdDev = Math.sqrt(variance);

    // Calcular Z-score do preço
    const priceZScore = stdDev > 0 ? (sale.unitPrice - mean) / stdDev : 0;

    // Detectar anomalias de preço
    if (Math.abs(priceZScore) > threshold) {
      return {
        id: `anomaly-price-${sale.id}`,
        storeId: sale.storeId,
        productId: sale.productId,
        type: 'price_anomaly',
        severity: Math.abs(priceZScore) > threshold * 1.5 ? 'CRITICAL' : 'WARNING',
        date: sale.date,
        actualValue: sale.unitPrice,
        expectedValue: mean,
        deviation: priceZScore,
        deviationPercentage: ((sale.unitPrice - mean) / mean) * 100,
        description: `Preço anormalmente ${sale.unitPrice > mean ? 'alto' : 'baixo'}: Kz${sale.unitPrice} (esperado: Kz${mean.toFixed(2)})`,
        possibleCauses: [
          'Erro de entrada do preço',
          'Promoção não documentada',
          'Erro de sistema',
        ],
        recommendedActions: [
          'Verificar histórico de preços',
          'Confirmar com gerente da loja',
          'Revisar sistema de precificação',
        ],
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Detectar anomalias de margem de lucro
   * Identifica transações com margem anormalmente baixa/alta
   */
  static detectMarginAnomaly(
    sale: Sale,
    historicalSales: Sale[],
    threshold: number = 2.0
  ): SalesAnomaly | null {
    // Calcular margens históricas
    const margins = historicalSales
      .filter((s) => s.productId === sale.productId && s.totalCost > 0)
      .map((s) => {
        const margin = ((s.totalPrice - s.totalCost) / s.totalPrice) * 100;
        return isFinite(margin) ? margin : 0;
      });

    if (margins.length < 5) {
      return null; // Dados insuficientes
    }

    const meanMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
    const variance =
      margins.reduce((sum, x) => sum + Math.pow(x - meanMargin, 2), 0) / margins.length;
    const stdDev = Math.sqrt(variance);

    // Calcular margem da venda actual
    const saleMargin = sale.totalCost > 0 ? ((sale.totalPrice - sale.totalCost) / sale.totalPrice) * 100 : 0;
    const marginZScore = stdDev > 0 ? (saleMargin - meanMargin) / stdDev : 0;

    if (Math.abs(marginZScore) > threshold) {
      return {
        id: `anomaly-margin-${sale.id}`,
        storeId: sale.storeId,
        productId: sale.productId,
        type: 'unusual_margin',
        severity: saleMargin < meanMargin * 0.8 ? 'CRITICAL' : 'WARNING',
        date: sale.date,
        actualValue: saleMargin,
        expectedValue: meanMargin,
        deviation: marginZScore,
        deviationPercentage: ((saleMargin - meanMargin) / meanMargin) * 100,
        description: `Margem ${saleMargin < meanMargin ? 'abaixo' : 'acima'} do esperado: ${saleMargin.toFixed(1)}% (esperado: ${meanMargin.toFixed(1)}%)`,
        possibleCauses: [
          'Erro de custeio',
          'Promoção não comunicada',
          'Produto danificado/defeito',
          'Desconto manual não registado',
        ],
        recommendedActions: [
          'Investigar custo do produto',
          'Verificar se houve desconto',
          'Revisar precificação com gerente',
        ],
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Detectar anomalias de volume de vendas
   * Compara com padrão histórico (semanal, por dia da semana)
   */
  static detectVolumeAnomaly(
    date: string,
    actualVolume: number,
    historicalData: DailySalesAggregate[],
    threshold: number = 2.5
  ): SalesAnomaly | null {
    if (historicalData.length < 10) {
      return null; // Dados insuficientes
    }

    // Agrupar por dia da semana
    const dayOfWeek = new Date(date).getDay();
    const sameWeekdayData = historicalData.filter(
      (d) => new Date(d.date).getDay() === dayOfWeek && d.date !== date
    );

    if (sameWeekdayData.length < 3) {
      return null; // Dados insuficientes
    }

    // Calcular estatísticas para este dia da semana
    const volumes = sameWeekdayData.map((d) => d.unitsSlod);
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const variance = volumes.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / volumes.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev > 0 ? (actualVolume - mean) / stdDev : 0;

    if (Math.abs(zScore) > threshold) {
      const anomalyType = actualVolume > mean ? 'demand_spike' : 'demand_drop';

      return {
        id: `anomaly-volume-${date}-${Date.now()}`,
        storeId: historicalData[0].storeId,
        type: anomalyType,
        severity: Math.abs(zScore) > threshold * 1.5 ? 'CRITICAL' : 'WARNING',
        date,
        actualValue: actualVolume,
        expectedValue: mean,
        deviation: zScore,
        deviationPercentage: ((actualVolume - mean) / mean) * 100,
        description:
          anomalyType === 'demand_spike'
            ? `Pico de demanda: ${actualVolume} unidades (esperado: ${mean.toFixed(0)})`
            : `Queda de demanda: ${actualVolume} unidades (esperado: ${mean.toFixed(0)})`,
        possibleCauses:
          anomalyType === 'demand_spike'
            ? [
                'Promoção especial',
                'Evento comunitário',
                'Falta de concorrência',
                'Reabastecimento de estoque',
              ]
            : [
                'Problema de estoque',
                'Produto fora de prateleira',
                'Concorrência nova',
                'Feriado/evento especial',
              ],
        recommendedActions:
          anomalyType === 'demand_spike'
            ? [
                'Investigar causa do pico',
                'Aumentar estoque se não for evento único',
                'Documentar para referência futura',
              ]
            : [
                'Verificar nível de estoque',
                'Revisar posicionamento em loja',
                'Considerar promoção para recuperar',
              ],
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Detectar anomalias de estoque
   * Identifica discrepâncias entre estoque registado e vendas
   */
  static detectStockAnomaly(
    product: Product,
    historicalData: DailySalesAggregate[],
    threshold: number = 20 // Percentagem
  ): SalesAnomaly | null {
    if (historicalData.length === 0) {
      return null;
    }

    // Calcular uso médio diário
    const avgDailyUsage =
      historicalData.reduce((sum, d) => sum + d.unitsSlod, 0) / historicalData.length;

    // Comparar com campo de uso médio do produto
    const recordedAvgUsage = product.averageDailyUsage || avgDailyUsage;

    const discrepancy = Math.abs(avgDailyUsage - recordedAvgUsage);
    const discrepancyPercentage = (discrepancy / recordedAvgUsage) * 100;

    if (discrepancyPercentage > threshold) {
      return {
        id: `anomaly-stock-${product.id}-${Date.now()}`,
        storeId: product.storeId || '',
        productId: product.id,
        type: 'stock_mismatch',
        severity: discrepancyPercentage > threshold * 2 ? 'CRITICAL' : 'WARNING',
        date: new Date().toISOString().split('T')[0],
        actualValue: avgDailyUsage,
        expectedValue: recordedAvgUsage,
        deviation: (discrepancy / recordedAvgUsage) * Math.sqrt(historicalData.length),
        deviationPercentage: discrepancyPercentage,
        description: `Uso actual (${avgDailyUsage.toFixed(1)}) diverge ${discrepancyPercentage > 0 ? 'acima' : 'abaixo'} do registado (${recordedAvgUsage.toFixed(1)})`,
        possibleCauses: [
          'Furto ou perda de stock',
          'Erro de contagem',
          'Devoluções não registadas',
          'Danos ao produto',
          'Sistema de cálculo incorreto',
        ],
        recommendedActions: [
          'Fazer contagem física de estoque',
          'Revisar registos de entrada/saída',
          'Investigar períodos de discrepância',
          'Atualizar campo de uso médio se necessário',
        ],
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Detectar múltiplas anomalias numa lista de vendas
   */
  static detectMultipleAnomalies(
    sales: Sale[],
    products: Map<string, Product>,
    historicalSales: Sale[],
    historicalData: DailySalesAggregate[]
  ): SalesAnomaly[] {
    const anomalies: SalesAnomaly[] = [];

    for (const sale of sales) {
      const product = products.get(sale.productId);
      if (!product) continue;

      // Detectar anomalias de preço
      const priceAnomaly = this.detectSaleAnomaly(sale, product, historicalSales);
      if (priceAnomaly) anomalies.push(priceAnomaly);

      // Detectar anomalias de margem
      const marginAnomaly = this.detectMarginAnomaly(sale, historicalSales);
      if (marginAnomaly) anomalies.push(marginAnomaly);
    }

    // Detectar anomalias de volume por data
    const volumeByDate = new Map<string, number>();
    sales.forEach((s) => {
      const date = s.date;
      volumeByDate.set(date, (volumeByDate.get(date) || 0) + s.quantity);
    });

    volumeByDate.forEach((volume, date) => {
      const volumeAnomaly = this.detectVolumeAnomaly(date, volume, historicalData);
      if (volumeAnomaly) anomalies.push(volumeAnomaly);
    });

    return anomalies;
  }

  /**
   * Calcular score de confiança para uma anomalia
   * (0-1, onde 1 é muito confiável)
   */
  static calculateConfidenceScore(
    deviation: number, // Z-score
    dataPoints: number // Quantidade de dados históricos
  ): number {
    // Desvio maior = mais confiável
    const deviationConfidence = Math.min(Math.abs(deviation) / 4, 1);

    // Mais dados = mais confiável
    const dataPointsConfidence = Math.min(dataPoints / 30, 1);

    // Média ponderada
    return (deviationConfidence * 0.6 + dataPointsConfidence * 0.4);
  }
}
