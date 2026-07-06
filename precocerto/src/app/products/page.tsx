'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Nav } from '@/components/layout/nav'
import { ProductList } from '@/components/products/product-list'
import { CSVImport } from '@/components/products/csv-import'
import { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Search, Download } from 'lucide-react'
import { exportProductsToCSV, downloadCSV } from '@/lib/export'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [userId, setUserId] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)

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

      setUserId(user.id)

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

  function handleExportCSV() {
    const csv = exportProductsToCSV(filteredProducts.length > 0 ? filteredProducts : products)
    const filename = `produtos_precocerto_${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(csv, filename)
  }

  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).sort()

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      (product.supplier && product.supplier.toLowerCase().includes(query)) ||
      (product.notes && product.notes.toLowerCase().includes(query))

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Produtos</h1>
            <p className="text-slate-600 mt-2">Gerencie seus produtos e precificação</p>
          </div>
          <div className="flex gap-2">
            {products.length > 0 && (
              <Button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            )}
            <Button
              onClick={() => setShowImportModal(!showImportModal)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Importar CSV
            </Button>
            <Link href="/products/new">
              <Button>Novo Produto</Button>
            </Link>
          </div>
        </div>

        {showImportModal && userId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">Importar Produtos</h2>
              <CSVImport
                userId={userId}
                onImportSuccess={() => {
                  setShowImportModal(false)
                  fetchProducts()
                }}
              />
              <Button
                onClick={() => setShowImportModal(false)}
                className="w-full mt-4 bg-slate-200 text-slate-900 hover:bg-slate-300"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Carregando produtos...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar produtos por nome, categoria, fornecedor ou notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {uniqueCategories.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <label className="text-sm font-medium text-slate-700 flex items-center">
                    Categoria:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(searchQuery || selectedCategory !== 'all') && (
                <div className="text-sm text-slate-600">
                  {filteredProducts.length} de {products.length} produtos encontrados
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <ProductList
                products={filteredProducts}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </div>
          </>
        )}
      </main>
    </>
  )
}
