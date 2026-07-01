export interface Product {
  id: string
  userId: string
  name: string
  category: string
  supplier: string | null
  costOfPurchase: number
  transportCost: number
  packagingCost: number
  otherCosts: number
  desiredMargin: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface DashboardStats {
  totalProducts: number
  totalCost: number
  totalSaleValue: number
  totalEstimatedProfit: number
  averageMargin: number
}
