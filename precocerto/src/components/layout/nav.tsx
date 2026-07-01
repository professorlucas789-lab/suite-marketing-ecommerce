'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, Home, Package } from 'lucide-react'

export function Nav() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="font-bold text-xl text-slate-900">PreçoCerto</div>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/products" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <Package className="w-5 h-5" />
              <span>Produtos</span>
            </Link>
            <Button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
