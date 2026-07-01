'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/schemas'
import { calculatePrice } from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { useState, useEffect } from 'react'

interface ProductFormProps {
  initialData?: ProductInput & { id?: string }
  onSubmit: (data: ProductInput & { id?: string }) => Promise<void>
  isLoading?: boolean
}

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
  const [calculatedValues, setCalculatedValues] = useState({
    totalCost: 0,
    recommendedPrice: 0,
    estimatedProfit: 0,
    realMargin: 0,
  })

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '',
      category: '',
      supplier: '',
      costOfPurchase: 0,
      transportCost: 0,
      packagingCost: 0,
      otherCosts: 0,
      desiredMargin: 30,
      notes: '',
    },
  })

  const watchedValues = form.watch([
    'costOfPurchase',
    'transportCost',
    'packagingCost',
    'otherCosts',
    'desiredMargin',
  ])

  useEffect(() => {
    const [costOfPurchase, transportCost, packagingCost, otherCosts, desiredMargin] = watchedValues
    const calculation = calculatePrice(
      costOfPurchase || 0,
      transportCost || 0,
      packagingCost || 0,
      otherCosts || 0,
      desiredMargin || 0
    )
    setCalculatedValues(calculation)
  }, [watchedValues])

  async function handleSubmit(data: ProductInput) {
    await onSubmit({
      ...data,
      id: initialData?.id,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Produto *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Camiseta Azul" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Vestuário" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Fornecedor ABC" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="desiredMargin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Margem Desejada (%) *</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" min="0" max="99.99" placeholder="Ex: 30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Custos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="costOfPurchase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo de Compra (Kz) *</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transportCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo de Transporte (Kz)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="packagingCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo de Embalagem (Kz)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otherCosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outros Custos (Kz)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Cálculos Automáticos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Custo Total</p>
              <p className="text-2xl font-bold text-slate-900">{calculatedValues.totalCost.toFixed(2)} Kz</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Preço Recomendado</p>
              <p className="text-2xl font-bold text-slate-900">{calculatedValues.recommendedPrice.toFixed(2)} Kz</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Lucro Estimado</p>
              <p className="text-2xl font-bold text-green-600">{calculatedValues.estimatedProfit.toFixed(2)} Kz</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Margem Real</p>
              <p className="text-2xl font-bold text-slate-900">{calculatedValues.realMargin.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  placeholder="Notas adicionais sobre o produto..."
                  rows={4}
                  className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-6 border-t">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Salvando...' : 'Salvar Produto'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
