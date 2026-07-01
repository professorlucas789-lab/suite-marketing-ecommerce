'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Nav } from '@/components/layout/nav'
import { StatCard } from '@/components/dashboard/stat-card'
import { calculatePrice, formatCurrency, formatPercentage } from '@/lib/calculations'
import { Product, DashboardStats } from '@/types'
import { BarChart3, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCost: 0,
    totalSaleValue: 0,
    totalEstimatedProfit: 0,
    averageMargin: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)

        if (products && products.length > 0) {
          let totalCost = 0
          let totalSaleValue = 0
          let totalProfit = 0
          let sumMargin = 0

          products.forEach((product: Product) => {
            const calc = calculatePrice(
              product.costOfPurchase,
              product.transportCost,
              product.packagingCost,
              product.otherCosts,
              product.desiredMargin
            )

            totalCost += calc.totalCost
            totalSaleValue += calc.recommendedPrice
            totalProfit += calc.estimatedProfit
            sumMargin += calc.realMargin
          })

          setStats({
            totalProducts: products.length,
            totalCost,
            totalSaleValue,
            totalEstimatedProfit: totalProfit,
            averageMargin: sumMargin / products.length,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-2">Bem-vindo ao PreçoCerto</p>
          </div>
          <Link href="/products/new">
            <Button>Novo Produto</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Carregando dados...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard
                label="Total de Produtos"
                value={stats.totalProducts}
                icon={<ShoppingBag className="w-6 h-6" />}
              />
              <StatCard
                label="Custo Total"
                value={formatCurrency(stats.totalCost)}
                icon={<Wallet className="w-6 h-6" />}
              />
              <StatCard
                label="Valor de Venda"
                value={formatCurrency(stats.totalSaleValue)}
                icon={<BarChart3 className="w-6 h-6" />}
              />
              <StatCard
                label="Lucro Total"
                value={formatCurrency(stats.totalEstimatedProfit)}
                icon={<TrendingUp className="w-6 h-6 text-green-600" />}
              />
              <StatCard
                label="Margem Média"
                value={formatPercentage(stats.averageMargin)}
                icon={<TrendingUp className="w-6 h-6" />}
              />
            </div>

            {stats.totalProducts === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <p className="text-slate-600 mb-4">
                  Você ainda não cadastrou nenhum produto. Começe agora!
                </p>
                <Link href="/products/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Cadastrar Primeiro Produto
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
