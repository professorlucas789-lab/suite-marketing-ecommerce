/**
 * Serviço de Alertas Automáticos
 * Verifica produtos em risco (vencimento próximo, stock baixo, etc.)
 * Dispara notificações para gerentes de loja
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

interface AlertCheckResult {
  checksRun: number;
  alertsTriggered: number;
  errors: string[];
}

export class AutomatedAlertsService {
  private static db = getFirestore();
  private static EXPIRY_THRESHOLDS = {
    CRITICAL: 7, // < 7 dias
    WARNING: 30, // < 30 dias
    INFO: 60, // < 60 dias
  };

  /**
   * Executar verificação completa de alertas para uma loja
   */
  static async runFullAlertCheck(storeId: string): Promise<AlertCheckResult> {
    const result: AlertCheckResult = {
      checksRun: 0,
      alertsTriggered: 0,
      errors: [],
    };

    try {
      console.log(`🔍 Executando verificação de alertas para loja: ${storeId}`);

      // 1. Verificar produtos com validade próxima
      try {
        const expiryAlertsCount = await this.checkExpiringProducts(storeId);
        result.checksRun++;
        result.alertsTriggered += expiryAlertsCount;
        console.log(`  ✅ Verificação de validade: ${expiryAlertsCount} alertas`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push(`Validade: ${errorMsg}`);
        console.error(`  ❌ Erro ao verificar validade:`, error);
      }

      // 2. Verificar produtos com stock baixo
      try {
        const stockAlertsCount = await this.checkLowStockProducts(storeId);
        result.checksRun++;
        result.alertsTriggered += stockAlertsCount;
        console.log(`  ✅ Verificação de stock: ${stockAlertsCount} alertas`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push(`Stock: ${errorMsg}`);
        console.error(`  ❌ Erro ao verificar stock:`, error);
      }

      // 3. Verificar anomalias de margens
      try {
        const marginAlertsCount = await this.checkAnomalousMargins(storeId);
        result.checksRun++;
        result.alertsTriggered += marginAlertsCount;
        console.log(`  ✅ Verificação de margens: ${marginAlertsCount} alertas`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push(`Margens: ${errorMsg}`);
        console.error(`  ❌ Erro ao verificar margens:`, error);
      }

      return result;
    } catch (error) {
      console.error(`❌ Erro crítico ao executar verificação de alertas:`, error);
      throw error;
    }
  }

  /**
   * Verificar produtos com data de validade próxima
   */
  private static async checkExpiringProducts(storeId: string): Promise<number> {
    let alertsTriggered = 0;

    try {
      const now = new Date();
      const criticalDate = new Date(now.getTime() + this.EXPIRY_THRESHOLDS.CRITICAL * 24 * 60 * 60 * 1000);
      const warningDate = new Date(now.getTime() + this.EXPIRY_THRESHOLDS.WARNING * 24 * 60 * 60 * 1000);
      const infoDate = new Date(now.getTime() + this.EXPIRY_THRESHOLDS.INFO * 24 * 60 * 60 * 1000);

      // Buscar produtos com validade definida
      const productsSnapshot = await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('produtos')
        .where('dataValidade', '>', now.toISOString())
        .where('dataValidade', '<=', infoDate.toISOString())
        .get();

      console.log(
        `    📦 Encontrados ${productsSnapshot.docs.length} produtos com validade próxima`
      );

      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();
        const expiryDate = new Date(product.dataValidade);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        let severity: 'CRITICAL' | 'WARNING' | 'INFO' = 'INFO';
        if (daysUntilExpiry <= this.EXPIRY_THRESHOLDS.CRITICAL) {
          severity = 'CRITICAL';
        } else if (daysUntilExpiry <= this.EXPIRY_THRESHOLDS.WARNING) {
          severity = 'WARNING';
        }

        // Criar ou atualizar alerta
        const alertRef = this.db
          .collection('lojas')
          .doc(storeId)
          .collection('expiryAlerts')
          .doc(productDoc.id);

        const existingAlert = await alertRef.get();

        if (!existingAlert.exists || existingAlert.data()?.severity !== severity) {
          await alertRef.set(
            {
              productId: productDoc.id,
              productName: product.name,
              daysUntilExpiry,
              severity,
              expiryDate: product.dataValidade,
              createdAt: existingAlert.exists ? existingAlert.data()?.createdAt : Timestamp.now(),
              updatedAt: Timestamp.now(),
              acknowledged: false,
            },
            { merge: true }
          );

          alertsTriggered++;
          console.log(
            `      🔔 Alerta [${severity}]: "${product.name}" vence em ${daysUntilExpiry} dias`
          );
        }
      }
    } catch (error) {
      console.error(`    ❌ Erro ao verificar produtos com validade:`, error);
      throw error;
    }

    return alertsTriggered;
  }

  /**
   * Verificar produtos com stock baixo
   */
  private static async checkLowStockProducts(storeId: string): Promise<number> {
    let alertsTriggered = 0;

    try {
      // Buscar configurações de alertas de stock para a loja
      const configSnapshot = await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('stockAlertConfigs')
        .get();

      if (configSnapshot.empty) {
        console.log('    ℹ️  Nenhuma configuração de alerta de stock encontrada');
        return 0;
      }

      console.log(`    📋 Encontradas ${configSnapshot.docs.length} configurações de alerta`);

      for (const configDoc of configSnapshot.docs) {
        const config = configDoc.data();

        try {
          // Buscar produtos que correspondem à configuração
          let query = this.db
            .collection('lojas')
            .doc(storeId)
            .collection('produtos');

          if (config.productId) {
            query = query.where('id', '==', config.productId);
          } else if (config.categoryId) {
            query = query.where('categoryId', '==', config.categoryId);
          }

          const productsSnapshot = await query.get();

          for (const productDoc of productsSnapshot.docs) {
            const product = productDoc.data();
            const currentStock = product.quantidadeDisponível || 0;

            if (currentStock < config.minQuantity) {
              // Criar ou atualizar alerta
              const alertRef = this.db
                .collection('lojas')
                .doc(storeId)
                .collection('stockAlerts')
                .doc(productDoc.id);

              const existingAlert = await alertRef.get();

              if (
                !existingAlert.exists ||
                existingAlert.data()?.currentStock !== currentStock
              ) {
                await alertRef.set(
                  {
                    productId: productDoc.id,
                    productName: product.name,
                    currentStock,
                    minQuantity: config.minQuantity,
                    reorderQuantity: config.reorderQuantity,
                    createdAt: existingAlert.exists
                      ? existingAlert.data()?.createdAt
                      : Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    acknowledged: false,
                  },
                  { merge: true }
                );

                alertsTriggered++;
                console.log(
                  `      🔔 Stock baixo: "${product.name}" (${currentStock}/${config.minQuantity})`
                );
              }
            }
          }
        } catch (error) {
          console.error(`    ⚠️  Erro ao verificar configuração:`, error);
        }
      }
    } catch (error) {
      console.error(`    ❌ Erro ao verificar stock baixo:`, error);
      throw error;
    }

    return alertsTriggered;
  }

  /**
   * Verificar anomalias de margens de lucro
   */
  private static async checkAnomalousMargins(storeId: string): Promise<number> {
    let alertsTriggered = 0;

    try {
      // Buscar produtos com margin negativa ou muito baixa
      const productsSnapshot = await this.db
        .collection('lojas')
        .doc(storeId)
        .collection('produtos')
        .get();

      const MARGIN_THRESHOLD = 0.05; // 5% mínimo de margem
      const lastCheckDate = new Date();
      lastCheckDate.setDate(lastCheckDate.getDate() - 1); // Último dia

      console.log(`    📊 Verificando ${productsSnapshot.docs.length} produtos para margens`);

      for (const productDoc of productsSnapshot.docs) {
        const product = productDoc.data();

        // Calcular margem
        const costPrice = product.custoProd || 0;
        const salePrice = product.preco || 0;
        const margin = costPrice > 0 ? (salePrice - costPrice) / costPrice : 0;

        if (margin < MARGIN_THRESHOLD) {
          const alertRef = this.db
            .collection('lojas')
            .doc(storeId)
            .collection('marginAlerts')
            .doc(productDoc.id);

          const existingAlert = await alertRef.get();

          if (!existingAlert.exists || existingAlert.data()?.margin !== margin) {
            await alertRef.set(
              {
                productId: productDoc.id,
                productName: product.name,
                costPrice,
                salePrice,
                margin: Math.round(margin * 10000) / 100, // Percentual com 2 casas decimais
                createdAt: existingAlert.exists
                  ? existingAlert.data()?.createdAt
                  : Timestamp.now(),
                updatedAt: Timestamp.now(),
                acknowledged: false,
              },
              { merge: true }
            );

            alertsTriggered++;
            console.log(
              `      ⚠️  Margem baixa: "${product.name}" (${Math.round(margin * 10000) / 100}%)`
            );
          }
        }
      }
    } catch (error) {
      console.error(`    ❌ Erro ao verificar margens:`, error);
      throw error;
    }

    return alertsTriggered;
  }
}
