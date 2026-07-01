'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Nav } from '@/components/layout/nav'
import { ProductForm } from '@/components/products/product-form'
import { ProductInput } from '@/lib/schemas'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

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

      const { error: insertError } = await supabase
        .from('products')
        .insert([
          {
            ...data,
            user_id: user.id,
          },
        ])

      if (insertError) {
        setError(insertError.message)
        return
      }

      router.push('/products')
    } catch (err) {
      setError('Erro ao criar produto. Tente novamente.')
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
          <h1 className="text-4xl font-bold text-slate-900">Novo Produto</h1>
          <p className="text-slate-600 mt-2">Cadastre um novo produto e deixe o sistema calcular o preço</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
          <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </main>
    </>
  )
}
