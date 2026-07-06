'use client'

import { Product } from '@/types'
import { calculatePrice, formatCurrency, formatPercentage } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleRowExpand = (productId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId)
    } else {
      newExpanded.add(productId)
    }
    setExpandedRows(newExpanded)
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
            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900 w-12">
              Detalhes
            </th>
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

            const isExpanded = expandedRows.has(product.id)

            return (
              <>
                <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => toggleRowExpand(product.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-200 transition-colors"
                      title={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      )}
                    </button>
                  </td>
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
              {isExpanded && (
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Fornecedor</p>
                          <p className="text-sm text-slate-900">{product.supplier || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Margem Desejada</p>
                          <p className="text-sm text-slate-900">{product.desiredMargin.toFixed(2)}%</p>
                        </div>
                      </div>
                      {(product.notes) && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Notas</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{product.notes}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Detalhamento de Custos</p>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Compra:</span>
                            <span className="font-medium">{formatCurrency(product.costOfPurchase)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Transporte:</span>
                            <span className="font-medium">{formatCurrency(product.transportCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Embalagem:</span>
                            <span className="font-medium">{formatCurrency(product.packagingCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Outros:</span>
                            <span className="font-medium">{formatCurrency(product.otherCosts)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
