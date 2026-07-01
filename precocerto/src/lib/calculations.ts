export interface PriceCalculation {
  totalCost: number
  recommendedPrice: number
  estimatedProfit: number
  realMargin: number
}

export function calculatePrice(
  costOfPurchase: number,
  transportCost: number,
  packagingCost: number,
  otherCosts: number,
  desiredMargin: number
): PriceCalculation {
  const totalCost = costOfPurchase + transportCost + packagingCost + otherCosts

  const recommendedPrice = desiredMargin >= 100
    ? 0
    : totalCost / (1 - desiredMargin / 100)

  const estimatedProfit = recommendedPrice - totalCost
  const realMargin = recommendedPrice > 0
    ? (estimatedProfit / recommendedPrice) * 100
    : 0

  return {
    totalCost: Math.max(0, totalCost),
    recommendedPrice: Math.max(0, recommendedPrice),
    estimatedProfit: Math.max(0, estimatedProfit),
    realMargin: Math.max(0, realMargin),
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}
