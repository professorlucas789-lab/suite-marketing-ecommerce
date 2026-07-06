import { Product } from '@/types'
import { calculatePrice, formatCurrency, formatPercentage } from './calculations'

export function exportProductsToCSV(products: Product[]): string {
  const headers = [
    'Produto',
    'Categoria',
    'Fornecedor',
    'Custo de Compra',
    'Custo de Transporte',
    'Custo de Embalagem',
    'Outros Custos',
    'Custo Total',
    'Margem Desejada',
    'Preço Recomendado',
    'Lucro Estimado',
    'Margem Real',
    'Notas',
    'Data de Criação'
  ]

  const rows = products.map((product) => {
    const calc = calculatePrice(
      product.costOfPurchase,
      product.transportCost,
      product.packagingCost,
      product.otherCosts,
      product.desiredMargin
    )

    return [
      escapeCsvValue(product.name),
      escapeCsvValue(product.category),
      escapeCsvValue(product.supplier || ''),
      product.costOfPurchase.toFixed(2),
      product.transportCost.toFixed(2),
      product.packagingCost.toFixed(2),
      product.otherCosts.toFixed(2),
      calc.totalCost.toFixed(2),
      product.desiredMargin.toFixed(2),
      calc.recommendedPrice.toFixed(2),
      calc.estimatedProfit.toFixed(2),
      calc.realMargin.toFixed(2),
      escapeCsvValue(product.notes || ''),
      new Date(product.createdAt).toLocaleDateString('pt-AO')
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCSV(content: string, filename: string): void {
  const element = document.createElement('a')
  element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`)
  element.setAttribute('download', filename)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}
