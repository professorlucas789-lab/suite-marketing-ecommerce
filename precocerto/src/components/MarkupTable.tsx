/**
 * MarkupTable Component
 * Tabela de visualização e edição de categorias de markup
 * Tabela de Aplicação de Markup em Produtos Farmacêuticos
 */

import React, { useState } from 'react';
import { MarkupCategory } from '../types/markup';
import { motion } from 'motion/react';
import { Edit2, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { MarkupCategoryModal } from './MarkupCategoryModal';

interface MarkupTableProps {
  markups: MarkupCategory[];
  loading: boolean;
  error?: string | null;
  onUpdate: (markupId: string, updates: any) => Promise<void>;
  onCreate: (data: any) => Promise<void>;
  onDelete: (markupId: string) => Promise<void>;
  enableScopeSelection?: boolean;
  currentStoreName?: string;
}

export const MarkupTable: React.FC<MarkupTableProps> = ({
  markups,
  loading,
  error,
  onUpdate,
  onCreate,
  onDelete,
  enableScopeSelection = false,
  currentStoreName,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingMarkup, setEditingMarkup] = useState<MarkupCategory | null>(null);
  const [selectedTab, setSelectedTab] = useState<'ativo' | 'inativo'>('ativo');
  const [deleting, setDeleting] = useState<string | null>(null);

  const activeMarkups = markups.filter(m => m.ativo);
  const inactiveMarkups = markups.filter(m => !m.ativo);
  const displayMarkups = selectedTab === 'ativo' ? activeMarkups : inactiveMarkups;

  const handleEdit = (markup: MarkupCategory) => {
    setEditingMarkup(markup);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingMarkup(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingMarkup(null);
  };

  const handleDelete = async (markupId: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta categoria?')) return;

    try {
      setDeleting(markupId);
      await onDelete(markupId);
    } finally {
      setDeleting(null);
    }
  };

  const handleModalSave = async (markupId: string | undefined, data: any) => {
    if (editingMarkup && markupId) {
      await onUpdate(markupId, data);
      return;
    }

    await onCreate(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Carregando markups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4"
      >
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200">Erro ao carregar</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📊 Tabela de Markup
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {activeMarkups.length} categorias ativas • {inactiveMarkups.length} inativas
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Markup
        </motion.button>
      </div>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedTab('ativo')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'ativo'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          ✅ Ativo ({activeMarkups.length})
        </button>
        <button
          onClick={() => setSelectedTab('inativo')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'inativo'
              ? 'border-red-600 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          🗑️ Inativo ({inactiveMarkups.length})
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Categoria
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Mínimo
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Médio
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Alto
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Padrão
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Margem Real
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {displayMarkups.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                  <p>Nenhuma categoria de markup {selectedTab === 'ativo' ? 'ativa' : 'inativa'}</p>
                </td>
              </tr>
            ) : (
              displayMarkups.map((markup) => (
                <motion.tr
                  key={markup.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Categoria */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{markup.name}</p>
                      {markup.criterioUso && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {markup.criterioUso}
                        </p>
                      )}
                      <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        markup.scope === 'businessType'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {markup.scope === 'businessType' ? 'Todas as farmácias' : 'Local'}
                      </span>
                    </div>
                  </td>

                  {/* Mínimo */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
                      {markup.markupMinimo}%
                    </span>
                  </td>

                  {/* Médio */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 rounded-full text-sm font-medium">
                      {markup.markupMedio}%
                    </span>
                  </td>

                  {/* Alto */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200 rounded-full text-sm font-medium">
                      {markup.markupAlto}%
                    </span>
                  </td>

                  {/* Padrão */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 rounded-full text-sm font-medium capitalize">
                      {markup.markupPadrao}
                    </span>
                  </td>

                  {/* Margem Real */}
                  <td className="px-6 py-4 text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {markup.margemRealPadrao?.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      margem real
                    </p>
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(markup)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(markup.id)}
                        disabled={deleting === markup.id}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deleting === markup.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de edição/criação */}
      {showModal && (
        <MarkupCategoryModal
          isOpen={showModal}
          markup={editingMarkup}
          onClose={handleModalClose}
          onSave={handleModalSave}
          enableScopeSelection={enableScopeSelection}
          currentStoreName={currentStoreName}
        />
      )}
    </div>
  );
};
