/**
 * MigrationPanel Component
 * Painel para gerenciar migração de dados (categorias)
 * NOVO (Fase 15): UI para migração
 */

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Database,
  Download,
  RefreshCw,
  Loader2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMigration } from '../hooks/useMigration';

export default function MigrationPanel() {
  const {
    loading,
    error,
    isMigrating,
    report,
    validationResult,
    migrate,
    validate,
    clearReport,
    downloadReport,
  } = useMigration();

  if (!report && !validationResult && !error && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-start gap-4">
          <Database className="w-8 h-8 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />

          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
              🔄 Migração de Categorias (Fase 15)
            </h3>

            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Sincronizar suas categorias de lojas individuais para um sistema global compartilhado.
              Isto permite que alterações de categoria se reflitam instantaneamente em TODAS as suas lojas.
            </p>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-semibold">
                ℹ️ O que vai acontecer:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✅ Categorias locais de cada loja migradas para escopo global</li>
                <li>✅ Produtos atualizados para referenciar categorias globais</li>
                <li>✅ Sincronização automática entre lojas (tempo real)</li>
                <li>✅ Compatibilidade retroativa mantida</li>
              </ul>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => migrate()}
                disabled={loading || isMigrating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Iniciar Migração
                  </>
                )}
              </button>

              <button
                onClick={() => validate()}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Validar Dados
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* RELATÓRIO DE MIGRAÇÃO */}
      {report && (
        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-4 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                ✅ Migração Concluída com Sucesso!
              </h4>
            </div>
          </div>

          {/* Estatísticas */}
          {report.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {report.stats.totalStores}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lojas Processadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {report.stats.totalCategoriesMigrated}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categorias Migradas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {report.stats.totalProductsUpdated}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Produtos Atualizados</p>
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${
                    report.stats.failedMigrations.length === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {report.stats.failedMigrations.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Erros</p>
              </div>
            </div>
          )}

          {/* Relatório em Texto */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-600 dark:text-gray-400 max-h-96 overflow-y-auto whitespace-pre-wrap">
            {report.text}
          </div>

          {/* Ações */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <button
              onClick={() => downloadReport()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Fazer Download
            </button>

            <button
              onClick={() => validate()}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Validar Integridade
                </>
              )}
            </button>

            <button
              onClick={() => clearReport()}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* RESULTADO DE VALIDAÇÃO */}
      {validationResult && (
        <div
          className={`p-6 rounded-lg border ${
            validationResult.isValid
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}
        >
          <div className="flex items-start gap-4 mb-4">
            {validationResult.isValid ? (
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h4
                className={`font-semibold text-lg ${
                  validationResult.isValid
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-yellow-900 dark:text-yellow-100'
                }`}
              >
                {validationResult.isValid ? '✅ Validação OK' : '⚠️ Problemas Detectados'}
              </h4>
            </div>
          </div>

          {validationResult.orphanedProducts?.length > 0 && (
            <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-red-600 dark:text-red-400 mb-2">
                🔴 {validationResult.orphanedProducts.length} Produtos Órfãos:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {validationResult.orphanedProducts.slice(0, 5).map((product: string) => (
                  <li key={product}>• {product}</li>
                ))}
                {validationResult.orphanedProducts.length > 5 && (
                  <li>... e {validationResult.orphanedProducts.length - 5} mais</li>
                )}
              </ul>
            </div>
          )}

          {validationResult.inconsistencies?.length > 0 && (
            <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                ⚠️ {validationResult.inconsistencies.length} Inconsistências:
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {validationResult.inconsistencies.slice(0, 5).map((inconsistency: string) => (
                  <li key={inconsistency}>• {inconsistency}</li>
                ))}
                {validationResult.inconsistencies.length > 5 && (
                  <li>... e {validationResult.inconsistencies.length - 5} mais</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => clearReport()}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* ERRO */}
      {error && (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">❌ Erro</h4>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={() => clearReport()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
