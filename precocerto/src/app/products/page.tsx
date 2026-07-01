'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Nav } from '@/components/layout/nav'
import { ProductList } from '@/components/products/product-list'
import { Product } from '@/types'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string>('')

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar produtos:', error)
        return
      }

      setProducts(data || [])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja apagar este produto?')) {
      return
    }

    try {
      setIsDeleting(id)
      const supabase = createClient()

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Erro ao apagar produto: ' + error.message)
        return
      }

      setProducts(products.filter(p => p.id !== id))
    } finally {
      setIsDeleting('')
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Produtos</h1>
            <p className="text-slate-600 mt-2">Gerencie seus produtos e precificação</p>
          </div>
          <Link href="/products/new">
            <Button>Novo Produto</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Carregando produtos...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <ProductList
              products={products}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
          </div>
        )}
      </main>
    </>
  )
}
