'use client'

import { Product } from '@/types'
import { calculatePrice, formatCurrency, formatPercentage } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface ProductListProps {
  products: Product[]
  onDelete: (id: string) => Promise<void>
  isDeleting?: string
}

type SortField = 'name' | 'category' | 'totalCost' | 'price' | 'profit' | 'margin'
type SortDirection = 'asc' | 'desc'

export function ProductList({ products, onDelete, isDeleting }: ProductListProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ?
      <ArrowUp className="w-4 h-4 inline ml-1" /> :
      <ArrowDown className="w-4 h-4 inline ml-1" />
  }

  const sortedProducts = [...products].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    const aCalc = calculatePrice(
      a.costOfPurchase,
      a.transportCost,
      a.packagingCost,
      a.otherCosts,
      a.desiredMargin
    )

    const bCalc = calculatePrice(
      b.costOfPurchase,
      b.transportCost,
      b.packagingCost,
      b.otherCosts,
      b.desiredMargin
    )

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'category':
        aVal = a.category.toLowerCase()
        bVal = b.category.toLowerCase()
        break
      case 'totalCost':
        aVal = aCalc.totalCost
        bVal = bCalc.totalCost
        break
      case 'price':
        aVal = aCalc.recommendedPrice
        bVal = bCalc.recommendedPrice
        break
      case 'profit':
        aVal = aCalc.estimatedProfit
        bVal = bCalc.estimatedProfit
        break
      case 'margin':
        aVal = aCalc.realMargin
        bVal = bCalc.realMargin
        break
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

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
            <th
              onClick={() => handleSort('name')}
              className="px-6 py-3 text-left text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              Produto <SortIcon field="name" />
            </th>
            <th
              onClick={() => handleSort('category')}
              className="px-6 py-3 text-left text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              Categoria <SortIcon field="category" />
            </th>
            <th
              onClick={() => handleSort('totalCost')}
              className="px-6 py-3 text-right text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              Custo Total <SortIcon field="totalCost" />
            </th>
            <th
              onClick={() => handleSort('price')}
              className="px-6 py-3 text-right text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              Preço <SortIcon field="price" />
            </th>
            <th
              onClick={() => handleSort('profit')}
              className="px-6 py-3 text-right text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              Lucro <SortIcon field="profit" />
            </th>
            <th
              onClick={() => handleSort('margin')}
              className="px-6 py-3 text-right text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              Margem <SortIcon field="margin" />
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sortedProducts.map((product) => {
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
