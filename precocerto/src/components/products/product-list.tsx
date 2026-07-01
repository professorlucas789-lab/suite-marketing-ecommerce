'use client'

import { Product } from '@/types'
import { calculatePrice, formatCurrency, formatPercentage } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface ProductListProps {
  products: Product[]
  onDelete: (id: string) => Promise<void>
  isDeleting?: string
}

export function ProductList({ products, onDelete, isDeleting }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 mb-4">Nenhum produto cadastrado ainda.</p>
        <Link href="/products/new">
          <Button>Cadastrar Primeiro Produto</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Produto</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Categoria</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Custo Total</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Preço</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Lucro</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Margem</th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const calculation = calculatePrice(
              product.costOfPurchase,
              product.transportCost,
              product.packagingCost,
              product.otherCosts,
              product.desiredMargin
            )

            return (
              <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                <td className="px-6 py-4 text-sm text-right text-slate-900">
                  {formatCurrency(calculation.totalCost)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">
                  {formatCurrency(calculation.recommendedPrice)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                  {formatCurrency(calculation.estimatedProfit)}
                </td>
                <td className="px-6 py-4 text-sm text-right text-slate-900">
                  {formatPercentage(calculation.realMargin)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex gap-2 justify-center">
                    <Link href={`/products/${product.id}/edit`}>
                      <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      onClick={() => onDelete(product.id)}
                      disabled={isDeleting === product.id}
                      className="bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
