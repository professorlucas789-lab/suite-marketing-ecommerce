/**
 * useMigration Hook
 * Hook para gerenciar migração de dados do lado do cliente
 * NOVO (Fase 15): Migração de categorias
 *
 * Uso:
 * const { migrate, validate, report, loading, error } = useMigration();
 *
 * await migrate(); // Triggerar migração
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  migrateUserCategoriesToGlobal,
  validateMigrationIntegrity,
  generateMigrationReport,
} from '../services/dataMigrationService';

interface MigrationReport {
  text: string;
  stats?: any;
}

interface UseMigrationReturn {
  loading: boolean;
  error: string | null;
  isMigrating: boolean;
  report: MigrationReport | null;
  validationResult: any | null;

  // Ações
  migrate: () => Promise<void>;
  validate: () => Promise<void>;
  clearReport: () => void;
  downloadReport: () => void;
}

export function useMigration(): UseMigrationReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);

  // Triggerar migração de categorias
  const migrate = useCallback(async () => {
    if (!user?.id) {
      setError('Utilizador não autenticado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsMigrating(true);

      console.log('🔄 Iniciando migração de categorias...');

      const stats = await migrateUserCategoriesToGlobal(user.id);
      const reportText = generateMigrationReport(stats);

      setReport({
        text: reportText,
        stats,
      });

      console.log('✅ Migração concluída com sucesso');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao migrar dados';
      setError(errorMsg);
      console.error('❌ Erro durante migração:', err);
    } finally {
      setLoading(false);
      setIsMigrating(false);
    }
  }, [user?.id]);

  // Validar integridade dos dados
  const validate = useCallback(async () => {
    if (!user?.id) {
      setError('Utilizador não autenticado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Validando integridade dos dados...');

      const result = await validateMigrationIntegrity(user.id);
      setValidationResult(result);

      if (result.isValid) {
        console.log('✅ Validação OK - Sem problemas detectados');
      } else {
        console.warn('⚠️ Problemas detectados durante validação');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao validar dados';
      setError(errorMsg);
      console.error('❌ Erro durante validação:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Limpar relatório
  const clearReport = useCallback(() => {
    setReport(null);
    setValidationResult(null);
    setError(null);
  }, []);

  // Fazer download do relatório
  const downloadReport = useCallback(() => {
    if (!report) return;

    const element = document.createElement('a');
    const file = new Blob([report.text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `migration-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [report]);

  return {
    loading,
    error,
    isMigrating,
    report,
    validationResult,
    migrate,
    validate,
    clearReport,
    downloadReport,
  };
}
