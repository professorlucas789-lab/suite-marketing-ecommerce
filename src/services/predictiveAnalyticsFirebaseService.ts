/**
 * Serviço de Persistência em Firestore
 * FASE 7: Integração com Firebase
 *
 * Salva e recupera análises preditivas do Firestore
 * com listeners em tempo real
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  DemandForecast,
  SalesAnomaly,
  AutoReorderRecommendation,
  ExecutiveDashboard,
} from '../types/analytics';

/**
 * Serviço para persistência de análises preditivas
 */
export class PredictiveAnalyticsFirebaseService {
  /**
   * Salvar previsão de demanda
   */
  static async saveForecast(forecast: DemandForecast): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'stores', forecast.storeId, 'predictions'),
        {
          ...forecast,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Erro ao salvar previsão:', error);
      throw error;
    }
  }

  /**
   * Salvar múltiplas previsões (batch)
   */
  static async saveForecastsBatch(
    storeId: string,
    forecasts: DemandForecast[]
  ): Promise<number> {
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      forecasts.forEach((forecast) => {
        const docRef = doc(
          collection(db, 'stores', storeId, 'predictions')
        );
        batch.set(docRef, {
          ...forecast,
          createdAt: now,
          updatedAt: now,
        });
      });

      await batch.commit();
      return forecasts.length;
    } catch (error) {
      console.error('Erro ao salvar previsões em batch:', error);
      throw error;
    }
  }

  /**
   * Obter previsão de um produto
   */
  static async getForecast(
    storeId: string,
    productId: string,
    limit: number = 1
  ): Promise<DemandForecast[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'predictions'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limit)
        .map((doc) => doc.data() as DemandForecast);
    } catch (error) {
      console.error('Erro ao obter previsão:', error);
      return [];
    }
  }

  /**
   * Obter todas as previsões da loja
   */
  static async getAllForecasts(storeId: string): Promise<DemandForecast[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'predictions'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as DemandForecast);
    } catch (error) {
      console.error('Erro ao obter todas as previsões:', error);
      return [];
    }
  }

  /**
   * Listener em tempo real para previsões
   */
  static listenForecasts(
    storeId: string,
    callback: (forecasts: DemandForecast[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'stores', storeId, 'predictions'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const forecasts = snapshot.docs.map((doc) => doc.data() as DemandForecast);
        callback(forecasts);
      },
      (error) => {
        console.error('Erro no listener de previsões:', error);
        onError?.(error as Error);
      }
    );
  }

  // ============= ANOMALIAS =============

  /**
   * Salvar anomalia
   */
  static async saveAnomaly(anomaly: SalesAnomaly): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'stores', anomaly.storeId, 'anomalyHistory'),
        {
          ...anomaly,
          createdAt: Timestamp.now(),
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Erro ao salvar anomalia:', error);
      throw error;
    }
  }

  /**
   * Reconhecer/resolver anomalia
   */
  static async acknowledgeAnomaly(
    storeId: string,
    anomalyId: string,
    notes?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'stores', storeId, 'anomalyHistory', anomalyId);
      await updateDoc(docRef, {
        acknowledged: true,
        acknowledgedAt: Timestamp.now(),
        notes,
      });
    } catch (error) {
      console.error('Erro ao reconhecer anomalia:', error);
      throw error;
    }
  }

  /**
   * Obter anomalias não reconhecidas
   */
  static async getUnacknowledgedAnomalies(storeId: string): Promise<SalesAnomaly[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'anomalyHistory'),
        where('acknowledged', '==', false),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as SalesAnomaly);
    } catch (error) {
      console.error('Erro ao obter anomalias não reconhecidas:', error);
      return [];
    }
  }

  /**
   * Obter anomalias críticas
   */
  static async getCriticalAnomalies(storeId: string): Promise<SalesAnomaly[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'anomalyHistory'),
        where('severity', '==', 'CRITICAL'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as SalesAnomaly);
    } catch (error) {
      console.error('Erro ao obter anomalias críticas:', error);
      return [];
    }
  }

  /**
   * Listener em tempo real para anomalias
   */
  static listenAnomalies(
    storeId: string,
    callback: (anomalies: SalesAnomaly[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'stores', storeId, 'anomalyHistory'),
      where('acknowledged', '==', false),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const anomalies = snapshot.docs.map((doc) => doc.data() as SalesAnomaly);
        callback(anomalies);
      },
      (error) => {
        console.error('Erro no listener de anomalias:', error);
        onError?.(error as Error);
      }
    );
  }

  // ============= REABASTECIMENTO =============

  /**
   * Salvar recomendação de reabastecimento
   */
  static async saveReorderRecommendation(
    recommendation: AutoReorderRecommendation
  ): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'stores', recommendation.storeId, 'reorderRecommendations'),
        {
          ...recommendation,
          createdAt: Timestamp.now(),
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Erro ao salvar recomendação de reabastecimento:', error);
      throw error;
    }
  }

  /**
   * Obter recomendações urgentes
   */
  static async getUrgentReorders(storeId: string): Promise<AutoReorderRecommendation[]> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'reorderRecommendations'),
        where('implemented', '==', false),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => doc.data() as AutoReorderRecommendation)
        .filter((r) => r.recommendedUrgency !== 'planned');
    } catch (error) {
      console.error('Erro ao obter recomendações urgentes:', error);
      return [];
    }
  }

  /**
   * Marcar reabastecimento como implementado
   */
  static async markReorderAsImplemented(
    storeId: string,
    reorderId: string,
    implementedQuantity: number
  ): Promise<void> {
    try {
      const docRef = doc(db, 'stores', storeId, 'reorderRecommendations', reorderId);
      await updateDoc(docRef, {
        implemented: true,
        implementedQuantity,
        implementedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erro ao marcar reabastecimento como implementado:', error);
      throw error;
    }
  }

  // ============= DASHBOARD EXECUTIVO =============

  /**
   * Salvar dashboard executivo
   */
  static async saveDashboard(dashboard: ExecutiveDashboard): Promise<void> {
    try {
      const docRef = doc(
        db,
        'stores',
        dashboard.storeId,
        'executiveDashboard',
        new Date().toISOString().split('T')[0] // YYYY-MM-DD
      );

      await updateDoc(docRef, {
        ...dashboard,
        updatedAt: Timestamp.now(),
      }).catch(async () => {
        // Se não existir, criar
        await updateDoc(docRef, {
          ...dashboard,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });
    } catch (error) {
      console.error('Erro ao salvar dashboard executivo:', error);
      throw error;
    }
  }

  /**
   * Obter dashboard executivo mais recente
   */
  static async getLatestDashboard(storeId: string): Promise<ExecutiveDashboard | null> {
    try {
      const q = query(
        collection(db, 'stores', storeId, 'executiveDashboard'),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      return snapshot.docs[0].data() as ExecutiveDashboard;
    } catch (error) {
      console.error('Erro ao obter dashboard executivo:', error);
      return null;
    }
  }

  /**
   * Listener em tempo real para dashboard
   */
  static listenDashboard(
    storeId: string,
    callback: (dashboard: ExecutiveDashboard | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'stores', storeId, 'executiveDashboard'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback(null);
        } else {
          callback(snapshot.docs[0].data() as ExecutiveDashboard);
        }
      },
      (error) => {
        console.error('Erro no listener do dashboard:', error);
        onError?.(error as Error);
      }
    );
  }

  /**
   * Limpar dados antigos (manutenção)
   * Remove previsões e anomalias com mais de N dias
   */
  static async cleanOldData(storeId: string, retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      // Limpar previsões antigas
      const forecastsQ = query(
        collection(db, 'stores', storeId, 'predictions'),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate))
      );

      const forecastSnapshots = await getDocs(forecastsQ);
      for (const doc of forecastSnapshots.docs) {
        await updateDoc(doc.ref, { archived: true });
        deletedCount++;
      }

      // Limpar anomalias antigas reconhecidas
      const anomaliesQ = query(
        collection(db, 'stores', storeId, 'anomalyHistory'),
        where('acknowledged', '==', true),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate))
      );

      const anomalySnapshots = await getDocs(anomaliesQ);
      for (const doc of anomalySnapshots.docs) {
        await updateDoc(doc.ref, { archived: true });
        deletedCount++;
      }

      console.log(`Limpeza concluída: ${deletedCount} documentos marcados como arquivo`);
      return deletedCount;
    } catch (error) {
      console.error('Erro ao limpar dados antigos:', error);
      throw error;
    }
  }
}
