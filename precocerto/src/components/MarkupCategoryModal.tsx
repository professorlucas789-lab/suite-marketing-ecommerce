/**
 * MarkupCategoryModal Component
 * Modal para editar/criar categorias de markup
 * Com cálculo automático de margem real
 */

import React, { useState, useEffect } from 'react';
import { MarkupCategory } from '../types/markup';
import { calcularMargemReal } from '../types/markup';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface MarkupCategoryModalProps {
  isOpen: boolean;
  markup?: MarkupCategory | null;
  onClose: () => void;
  onSave: (markupId: string | undefined, data: any) => Promise<void>;
}

export const MarkupCategoryModal: React.FC<MarkupCategoryModalProps> = ({
  isOpen,
  markup,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    markupMinimo: 0,
    markupMedio: 0,
    markupAlto: 0,
    markupPadrao: 'medio' as const,
    criterioUso: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Calcular margem real com base no markup padrão
  const getMarkupValue = () => {
    switch (formData.markupPadrao) {
      case 'minimo':
        return formData.markupMinimo;
      case 'alto':
        return formData.markupAlto;
      default:
        return formData.markupMedio;
    }
  };

  const margemReal = calcularMargemReal(getMarkupValue());

  // Preencher form com dados existentes
  useEffect(() => {
    if (markup) {
      setFormData({
        name: markup.name,
        markupMinimo: markup.markupMinimo,
        markupMedio: markup.markupMedio,
        markupAlto: markup.markupAlto,
        markupPadrao: markup.markupPadrao,
        criterioUso: markup.criterioUso || '',
      });
    } else {
      setFormData({
        name: '',
        markupMinimo: 0,
        markupMedio: 0,
        markupAlto: 0,
        markupPadrao: 'medio',
        criterioUso: '',
      });
    }
    setError(null);
  }, [markup, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('markup')) {
      // Validar numérico
      const numValue = value === '' ? 0 : parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        setError('Valores de markup devem ser números não-negativos');
        return;
      }
      setError(null);
    }

    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('markup') ? parseFloat(value) : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (formData.markupMinimo < 0 || formData.markupMedio < 0 || formData.markupAlto < 0) {
      setError('Valores de markup não podem ser negativos');
      return false;
    }

    // Validar ordem: Mínimo <= Médio <= Alto
    if (
      formData.markupMinimo > formData.markupMedio ||
      formData.markupMedio > formData.markupAlto
    ) {
      setError('Ordem inválida: Mínimo ≤ Médio ≤ Alto');
      return false;
    }

    if (!formData.markupPadrao) {
      setError('Markup padrão é obrigatório');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await onSave(markup?.id, formData);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {markup ? '✏️ Editar Markup' : '➕ Novo Markup'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </motion.div>
                )}

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ex: Paracetamol português"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-colors"
                  />
                </div>

                {/* Critério de Uso */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Critério de Uso (Opcional)
                  </label>
                  <textarea
                    name="criterioUso"
                    value={formData.criterioUso}
                    onChange={handleChange}
                    placeholder="ex: Usar Mínimo quando há muita concorrência, Alto quando procura está elevada"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-colors resize-none"
                  />
                </div>

                {/* Markups */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Mínimo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Markup Mínimo (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="markupMinimo"
                        value={formData.markupMinimo}
                        onChange={handleChange}
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">%</span>
                    </div>
                  </div>

                  {/* Médio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Markup Médio (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="markupMedio"
                        value={formData.markupMedio}
                        onChange={handleChange}
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-colors"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">%</span>
                    </div>
                  </div>

                  {/* Alto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Markup Alto (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="markupAlto"
                        value={formData.markupAlto}
                        onChange={handleChange}
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 transition-colors"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                </div>

                {/* Markup Padrão + Margem Real */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Padrão */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Markup Padrão *
                    </label>
                    <select
                      name="markupPadrao"
                      value={formData.markupPadrao}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 transition-colors"
                    >
                      <option value="minimo">Mínimo ({formData.markupMinimo}%)</option>
                      <option value="medio">Médio ({formData.markupMedio}%)</option>
                      <option value="alto">Alto ({formData.markupAlto}%)</option>
                    </select>
                  </div>

                  {/* Margem Real (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Margem Real Padrão
                    </label>
                    <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white font-semibold flex items-center">
                      {margemReal.toFixed(2)}%
                      <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">(calculada automaticamente)</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>Markup vs Margem Real:</strong> O markup é aplicado sobre o custo. A margem real é calculada
                    sobre o preço de venda.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    Fórmula: Margem Real = (Markup / (100 + Markup)) × 100
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {markup ? 'Guardar Alterações' : 'Criar Categoria'}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
