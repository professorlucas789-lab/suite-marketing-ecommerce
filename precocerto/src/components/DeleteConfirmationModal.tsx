import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemName: string;
  itemType?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isDeleting?: boolean;
  dangerMessage?: string;
}

/**
 * Delete Confirmation Modal Component
 * Provides a safe way to confirm destructive actions
 * Fase 5A Item 5: Delete Confirmation
 */
export function DeleteConfirmationModal({
  isOpen,
  itemName,
  itemType = 'item',
  onConfirm,
  onCancel,
  isDeleting = false,
  dangerMessage
}: DeleteConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="alertdialog"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-red-50 dark:bg-red-950/20 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <h2
                  id="delete-modal-title"
                  className="text-lg font-semibold text-red-900 dark:text-red-300"
                >
                  Confirmar Exclusão
                </h2>
                <button
                  onClick={onCancel}
                  className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  aria-label="Fechar"
                  disabled={isDeleting}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                <p
                  id="delete-modal-description"
                  className="text-slate-700 dark:text-slate-300"
                >
                  Tem certeza de que deseja remover o {itemType}{' '}
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    "{itemName}"
                  </strong>
                  ?
                </p>

                {dangerMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ⚠️ {dangerMessage}
                    </p>
                  </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-11"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-300 border-t-white rounded-full animate-spin" />
                      Removendo...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Remover
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
