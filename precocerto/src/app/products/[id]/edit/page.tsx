'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Nav } from '@/components/layout/nav'
import { ProductForm } from '@/components/products/product-form'
import { ProductInput } from '@/lib/schemas'
import { Product } from '@/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchProduct()
  }, [productId])

  async function fetchProduct() {
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !data) {
        setError('Produto não encontrado')
        return
      }

      setProduct(data)
    } finally {
      setIsLoadingData(false)
    }
  }

  async function handleSubmit(data: ProductInput & { id?: string }) {
    try {
      setError('')
      setIsLoading(true)

      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: data.name,
          category: data.category,
          supplier: data.supplier,
          costOfPurchase: data.costOfPurchase,
          transportCost: data.transportCost,
          packagingCost: data.packagingCost,
          otherCosts: data.otherCosts,
          desiredMargin: data.desiredMargin,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .eq('user_id', user.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push('/products')
    } catch (err) {
      setError('Erro ao atualizar produto. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/products" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <h1 className="text-4xl font-bold text-slate-900">Editar Produto</h1>
          <p className="text-slate-600 mt-2">Atualize as informações do produto</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {isLoadingData ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Carregando produto...</p>
          </div>
        ) : product ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
            <ProductForm
              initialData={{
                name: product.name,
                category: product.category,
                supplier: product.supplier || '',
                costOfPurchase: product.costOfPurchase,
                transportCost: product.transportCost,
                packagingCost: product.packagingCost,
                otherCosts: product.otherCosts,
                desiredMargin: product.desiredMargin,
                notes: product.notes || '',
              }}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-red-600">Produto não encontrado</p>
          </div>
        )}
      </main>
    </>
  )
}
