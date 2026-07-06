'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface CSVImportProps {
  userId: string
  onImportSuccess: () => void
}

export function CSVImport({ userId, onImportSuccess }: CSVImportProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV vazio ou inválido')
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const products = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 3) continue

      const product: any = {}
      headers.forEach((header, index) => {
        product[header] = values[index]
      })

      products.push({
        name: product.produto || product.name || `Produto ${i}`,
        category: product.categoria || product.category || 'Geral',
        supplier: product.fornecedor || product.supplier || null,
        costOfPurchase: parseFloat(product['custo de compra'] || product['cost_of_purchase'] || '0') || 0,
        transportCost: parseFloat(product['custo de transporte'] || product['transport_cost'] || '0') || 0,
        packagingCost: parseFloat(product['custo de embalagem'] || product['packaging_cost'] || '0') || 0,
        otherCosts: parseFloat(product['outros custos'] || product['other_costs'] || '0') || 0,
        desiredMargin: parseFloat(product['margem desejada'] || product['desired_margin'] || '20') || 20,
        notes: product.notas || product.notes || null,
      })
    }

    return products
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setIsImporting(true)

    try {
      const content = await file.text()
      const products = parseCSV(content)

      if (products.length === 0) {
        setError('Nenhum produto válido encontrado no arquivo')
        return
      }

      const supabase = createClient()
      const productsToInsert = products.map(p => ({
        ...p,
        user_id: userId,
      }))

      const { error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert)

      if (insertError) {
        setError(`Erro ao importar: ${insertError.message}`)
        return
      }

      alert(`${products.length} produto(s) importado(s) com sucesso!`)
      onImportSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isImporting}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="bg-purple-600 hover:bg-purple-700 w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isImporting ? 'Importando...' : 'Importar CSV'}
        </Button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
