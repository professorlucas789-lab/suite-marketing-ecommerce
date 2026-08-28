/**
 * Serviço de Dashboard Executivo
 * Agregação de métricas de negócio para proprietários de loja
 * NOVO (Phase 17): Dashboard com KPIs, tendências e alertas críticos
 */

import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';

export interface KPI {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  icon: string;
}

export interface SalesMetric {
  date: string;
  revenue: number;
  units: number;
  orders: number;
  avgOrderValue: number;
}

export interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  units: number;
  margin: number;
  status: 'good' | 'warning' | 'critical';
}

export interface TopCategory {
  id: string;
  name: string;
  revenue: number;
  growth: number;
  products: number;
}

export interface CriticalAlert {
  type: 'expiry' | 'stock' | 'margin';
  severity: 'critical' | 'warning' | 'info';
  productName: string;
  message: string;
  timestamp: Date;
  actionUrl: string;
}

export interface ExecutiveDashboardMetrics {
  kpis: KPI[];
  salesTrend: SalesMetric[];
  topProducts: TopProduct[];
  topCategories: TopCategory[];
  criticalAlerts: CriticalAlert[];
  storeHealth: {
    overall: number; // 0-100%
    categories: {
      products: number;
      alerts: number;
      stock: number;
      margins: number;
    };
  };
  periodComparison: {
    current: {
      revenue: number;
      orders: number;
      avgMargin: number;
    };
    previous: {
      revenue: number;
      orders: number;
      avgMargin: number;
    };
    growth: {
      revenue: number;
      orders: number;
      margin: number;
    };
  };
}

export class ExecutiveDashboardService {
  /**
   * Obter métricas completas do dashboard executivo
   */
  static async getExecutiveDashboardMetrics(
    storeId: string,
    daysBack: number = 30
  ): Promise<ExecutiveDashboardMetrics> {
    const metrics: ExecutiveDashboardMetrics = {
      kpis: [],
      salesTrend: [],
      topProducts: [],
      topCategories: [],
      criticalAlerts: [],
      storeHealth: {
        overall: 0,
        categories: { products: 0, alerts: 0, stock: 0, margins: 0 },
      },
      periodComparison: {
        current: { revenue: 0, orders: 0, avgMargin: 0 },
        previous: { revenue: 0, orders: 0, avgMargin: 0 },
        growth: { revenue: 0, orders: 0, margin: 0 },
      },
    };

    try {
      console.log(`📊 Obtendo métricas executivas para loja: ${storeId}`);

      // Calcular datas
      const now = new Date();
      const currentPeriodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const previousPeriodStart = new Date(
        currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000
      );

      // 1. Obter KPIs principais
      metrics.kpis = await this.getKPIs(storeId, currentPeriodStart, previousPeriodStart);

      // 2. Obter tendência de vendas
      metrics.salesTrend = await this.getSalesTrend(storeId, currentPeriodStart, daysBack);

      // 3. Obter top produtos
      metrics.topProducts = await this.getTopProducts(storeId, currentPeriodStart);

      // 4. Obter top categorias
      metrics.topCategories = await this.getTopCategories(storeId, currentPeriodStart);

      // 5. Obter alertas críticos
      metrics.criticalAlerts = await this.getCriticalAlerts(storeId);

      // 6. Calcular saúde da loja
      metrics.storeHealth = await this.calculateStoreHealth(storeId);

      // 7. Comparação entre períodos
      metrics.periodComparison = await this.getPeriodComparison(
        storeId,
        currentPeriodStart,
        previousPeriodStart
      );

      console.log(`✅ Métricas executivas obtidas com sucesso`);

      return metrics;
    } catch (error) {
      console.error('❌ Erro ao obter métricas executivas:', error);
      throw error;
    }
  }

  /**
   * Obter KPIs principais
   */
  private static async getKPIs(
    storeId: string,
    currentStart: Date,
    previousStart: Date
  ): Promise<KPI[]> {
    const kpis: KPI[] = [];

    try {
      // Receita atual vs período anterior
      const currentSales = await this.getSalesData(storeId, currentStart);
      const previousSales = await this.getSalesData(storeId, previousStart);

      const revenueChange =
        previousSales.totalRevenue > 0
          ? ((currentSales.totalRevenue - previousSales.totalRevenue) / previousSales.totalRevenue) *
            100
          : 0;

      kpis.push({
        label: 'Receita Total',
        value: Math.round(currentSales.totalRevenue),
        unit: '€',
        trend: revenueChange >= 0 ? 'up' : 'down',
        percentageChange: Math.round(revenueChange * 100) / 100,
        icon: '💰',
      });

      // Número de pedidos
      const ordersChange =
        previousSales.totalOrders > 0
          ? ((currentSales.totalOrders - previousSales.totalOrders) / previousSales.totalOrders) *
            100
          : 0;

      kpis.push({
        label: 'Pedidos',
        value: currentSales.totalOrders,
        unit: 'un',
        trend: ordersChange >= 0 ? 'up' : 'down',
        percentageChange: Math.round(ordersChange * 100) / 100,
        icon: '📦',
      });

      // Margem média
      kpis.push({
        label: 'Margem Média',
        value: Math.round(currentSales.avgMargin * 100),
        unit: '%',
        trend: currentSales.avgMargin >= 20 ? 'up' : 'stable',
        percentageChange: 0,
        icon: '📊',
      });

      // Ticket médio
      const avgTicketCurrent =
        currentSales.totalOrders > 0 ? currentSales.totalRevenue / currentSales.totalOrders : 0;
      const avgTicketPrevious =
        previousSales.totalOrders > 0 ? previousSales.totalRevenue / previousSales.totalOrders : 0;
      const ticketChange =
        avgTicketPrevious > 0 ? ((avgTicketCurrent - avgTicketPrevious) / avgTicketPrevious) * 100 : 0;

      kpis.push({
        label: 'Ticket Médio',
        value: Math.round(avgTicketCurrent * 100) / 100,
        unit: '€',
        trend: ticketChange >= 0 ? 'up' : 'down',
        percentageChange: Math.round(ticketChange * 100) / 100,
        icon: '💳',
      });
    } catch (error) {
      console.error('❌ Erro ao obter KPIs:', error);
    }

    return kpis;
  }

  /**
   * Obter dados de vendas para um período
   */
  private static async getSalesData(storeId: string, startDate: Date) {
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalMargin = 0;
    let marginCount = 0;

    try {
      const salesQuery = query(
        collection(db, 'lojas', storeId, 'sales'),
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );

      const salesSnapshot = await getDocs(salesQuery);

      for (const saleDoc of salesSnapshot.docs) {
        const sale = saleDoc.data();
        totalRevenue += sale.totalPrice || 0;
        totalOrders++;

        if (sale.margemReal !== undefined) {
          totalMargin += sale.margemReal;
          marginCount++;
        }
      }
    } catch (error) {
      console.error('❌ Erro ao obter dados de vendas:', error);
    }

    return {
      totalRevenue,
      totalOrders,
      avgMargin: marginCount > 0 ? totalMargin / marginCount : 0,
    };
  }

  /**
   * Obter tendência de vendas (últimos X dias)
   */
  private static async getSalesTrend(
    storeId: string,
    startDate: Date,
    daysBack: number
  ): Promise<SalesMetric[]> {
    const trend: Record<string, SalesMetric> = {};

    try {
      // Inicializar dias
      for (let i = 0; i < daysBack; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        trend[dateStr] = {
          date: dateStr,
          revenue: 0,
          units: 0,
          orders: 0,
          avgOrderValue: 0,
        };
      }

      // Buscar vendas
      const salesQuery = query(
        collection(db, 'lojas', storeId, 'sales'),
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );

      const salesSnapshot = await getDocs(salesQuery);

      for (const saleDoc of salesSnapshot.docs) {
        const sale = saleDoc.data();
        const dateStr = sale.date || new Date().toISOString().split('T')[0];

        if (trend[dateStr]) {
          trend[dateStr].revenue += sale.totalPrice || 0;
          trend[dateStr].units += sale.quantity || 1;
          trend[dateStr].orders++;
        }
      }

      // Calcular ticket médio
      for (const dateStr in trend) {
        if (trend[dateStr].orders > 0) {
          trend[dateStr].avgOrderValue =
            Math.round((trend[dateStr].revenue / trend[dateStr].orders) * 100) / 100;
        }
      }

      return Object.values(trend).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('❌ Erro ao obter tendência de vendas:', error);
      return [];
    }
  }

  /**
   * Obter top 5 produtos
   */
  private static async getTopProducts(storeId: string, startDate: Date): Promise<TopProduct[]> {
    const products: Record<string, TopProduct> = {};

    try {
      const salesQuery = query(
        collection(db, 'lojas', storeId, 'sales'),
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );

      const salesSnapshot = await getDocs(salesQuery);

      for (const saleDoc of salesSnapshot.docs) {
        const sale = saleDoc.data();

        if (!products[sale.productId]) {
          products[sale.productId] = {
            id: sale.productId,
            name: sale.productName || 'Produto desconhecido',
            revenue: 0,
            units: 0,
            margin: sale.margemReal || 0,
            status: 'good' as const,
          };
        }

        products[sale.productId].revenue += sale.totalPrice || 0;
        products[sale.productId].units += sale.quantity || 1;
      }

      // Ordenar por receita e pegar top 5
      return Object.values(products)
        .map((p) => ({
          ...p,
          status: (p.margin >= 30 ? 'good' : p.margin >= 15 ? 'warning' : 'critical') as TopProduct['status'],
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    } catch (error) {
      console.error('❌ Erro ao obter top produtos:', error);
      return [];
    }
  }

  /**
   * Obter top categorias
   */
  private static async getTopCategories(storeId: string, startDate: Date): Promise<TopCategory[]> {
    const categories: Record<string, TopCategory> = {};

    try {
      const salesQuery = query(
        collection(db, 'lojas', storeId, 'sales'),
        where('timestamp', '>=', Timestamp.fromDate(startDate))
      );

      const salesSnapshot = await getDocs(salesQuery);

      for (const saleDoc of salesSnapshot.docs) {
        const sale = saleDoc.data();

        if (sale.categoryName) {
          if (!categories[sale.categoryName]) {
            categories[sale.categoryName] = {
              id: sale.categoryName,
              name: sale.categoryName,
              revenue: 0,
              growth: 0,
              products: 0,
            };
          }

          categories[sale.categoryName].revenue += sale.totalPrice || 0;
        }
      }

      return Object.values(categories)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    } catch (error) {
      console.error('❌ Erro ao obter top categorias:', error);
      return [];
    }
  }

  /**
   * Obter alertas críticos
   */
  private static async getCriticalAlerts(storeId: string): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = [];

    try {
      // Alertas de validade crítica
      const expiryAlertsQuery = query(
        collection(db, 'lojas', storeId, 'expiryAlerts'),
        where('severity', '==', 'CRITICAL'),
        limit(3)
      );

      const expiryAlerts = await getDocs(expiryAlertsQuery);
      for (const alertDoc of expiryAlerts.docs) {
        const alert = alertDoc.data();
        alerts.push({
          type: 'expiry',
          severity: 'critical',
          productName: alert.productName,
          message: `Vence em ${alert.daysUntilExpiry} dias`,
          timestamp: alert.updatedAt?.toDate() || new Date(),
          actionUrl: `/produtos/${alert.productId}`,
        });
      }

      // Alertas de stock crítico
      const stockAlertsQuery = query(
        collection(db, 'lojas', storeId, 'stockAlerts'),
        limit(3)
      );

      const stockAlerts = await getDocs(stockAlertsQuery);
      for (const alertDoc of stockAlerts.docs) {
        const alert = alertDoc.data();
        alerts.push({
          type: 'stock',
          severity: alert.currentStock === 0 ? 'critical' : 'warning',
          productName: alert.productName,
          message: `Stock: ${alert.currentStock}/${alert.minQuantity}`,
          timestamp: alert.updatedAt?.toDate() || new Date(),
          actionUrl: `/produtos/${alert.productId}`,
        });
      }

      // Alertas de margem crítica
      const marginAlertsQuery = query(
        collection(db, 'lojas', storeId, 'marginAlerts'),
        limit(3)
      );

      const marginAlerts = await getDocs(marginAlertsQuery);
      for (const alertDoc of marginAlerts.docs) {
        const alert = alertDoc.data();
        alerts.push({
          type: 'margin',
          severity: alert.margin < 0 ? 'critical' : 'warning',
          productName: alert.productName,
          message: `Margem: ${alert.margin.toFixed(2)}%`,
          timestamp: alert.updatedAt?.toDate() || new Date(),
          actionUrl: `/produtos/${alert.productId}`,
        });
      }

      return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
    } catch (error) {
      console.error('❌ Erro ao obter alertas críticos:', error);
      return [];
    }
  }

  /**
   * Calcular saúde geral da loja
   */
  private static async calculateStoreHealth(storeId: string) {
    let products = 0;
    let alerts = 0;
    let stock = 0;
    let margins = 0;

    try {
      // Contar produtos
      const productsSnapshot = await getDocs(
        collection(db, 'lojas', storeId, 'produtos')
      );
      products = Math.min(100, productsSnapshot.docs.length * 10); // Max 100 pontos

      // Contar alertas
      const expiryAlertsSnapshot = await getDocs(
        collection(db, 'lojas', storeId, 'expiryAlerts')
      );
      const stockAlertsSnapshot = await getDocs(
        collection(db, 'lojas', storeId, 'stockAlerts')
      );
      const totalAlerts = expiryAlertsSnapshot.size + stockAlertsSnapshot.size;
      alerts = Math.max(0, 100 - totalAlerts * 5); // Cada alerta reduz 5 pontos

      // Saúde de stock
      let lowStockCount = 0;
      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();
        if (product.quantidadeDisponível < product.quantidadeMinima || 0) {
          lowStockCount++;
        }
      }
      stock = Math.max(0, 100 - (lowStockCount / Math.max(1, productsSnapshot.size)) * 50);

      // Saúde de margens
      let lowMarginCount = 0;
      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();
        const margin = product.custoProd > 0
          ? ((product.preco - product.custoProd) / product.custoProd) * 100
          : 0;
        if (margin < 15) {
          lowMarginCount++;
        }
      }
      margins = Math.max(0, 100 - (lowMarginCount / Math.max(1, productsSnapshot.size)) * 50);
    } catch (error) {
      console.error('❌ Erro ao calcular saúde da loja:', error);
    }

    const overall = Math.round((products + alerts + stock + margins) / 4);

    return {
      overall,
      categories: {
        products: Math.round(products),
        alerts: Math.round(alerts),
        stock: Math.round(stock),
        margins: Math.round(margins),
      },
    };
  }

  /**
   * Comparação entre períodos
   */
  private static async getPeriodComparison(
    storeId: string,
    currentStart: Date,
    previousStart: Date
  ) {
    const current = await this.getSalesData(storeId, currentStart);
    const previous = await this.getSalesData(storeId, previousStart);

    return {
      current: {
        revenue: Math.round(current.totalRevenue),
        orders: current.totalOrders,
        avgMargin: Math.round(current.avgMargin * 100) / 100,
      },
      previous: {
        revenue: Math.round(previous.totalRevenue),
        orders: previous.totalOrders,
        avgMargin: Math.round(previous.avgMargin * 100) / 100,
      },
      growth: {
        revenue:
          previous.totalRevenue > 0
            ? Math.round(
                ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 10000
              ) / 100
            : 0,
        orders:
          previous.totalOrders > 0
            ? Math.round(
                ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 10000
              ) / 100
            : 0,
        margin: Math.round((current.avgMargin - previous.avgMargin) * 100) / 100,
      },
    };
  }
}
