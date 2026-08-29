import React from "react";
import { Trash2, Edit2, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  hasIVA?: boolean;
  ivaPercentage?: number;
}

interface DocumentItemsTabProps {
  items: SaleItem[];
  onRemoveItem: (index: number) => void;
  onUpdateItem?: (index: number, quantity: number, unitPrice: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function DocumentItemsTab({
  items,
  onRemoveItem,
  onUpdateItem,
  isExpanded = true,
  onToggleExpand,
}: DocumentItemsTabProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editValues, setEditValues] = React.useState({ quantity: 0, unitPrice: 0 });

  const handleEditStart = (index: number, item: SaleItem) => {
    setEditingIndex(index);
    setEditValues({ quantity: item.quantity, unitPrice: item.unitPrice });
  };

  const handleEditSave = (index: number) => {
    if (onUpdateItem) {
      onUpdateItem(index, editValues.quantity, editValues.unitPrice);
    }
    setEditingIndex(null);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-white text-sm font-medium transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Itens ({items.length})</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Copy className="w-4 h-4 text-slate-400" />
          Itens da Venda ({items.length})
        </h3>
        <button
          onClick={onToggleExpand}
          className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          Fechar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          Nenhum item adicionado ainda
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start justify-between p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{item.productName}</p>

                  {editingIndex === index ? (
                    <div className="mt-2 flex gap-2 items-center">
                      <input
                        type="number"
                        value={editValues.quantity}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            quantity: parseFloat(e.target.value),
                          })
                        }
                        placeholder="Qtd"
                        className="w-16 px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500 text-xs">×</span>
                      <input
                        type="number"
                        value={editValues.unitPrice}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            unitPrice: parseFloat(e.target.value),
                          })
                        }
                        placeholder="Preço"
                        className="flex-1 px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleEditSave(index)}
                        className="px-2 py-1 bg-emerald-600/50 hover:bg-emerald-600 text-white text-xs rounded transition-colors"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="text-right ml-3 flex-shrink-0">
                  <p className="font-semibold text-emerald-400 text-sm">
                    ${item.subtotal.toFixed(2)}
                  </p>
                  {item.hasIVA && (
                    <p className="text-xs text-yellow-400">IVA: {item.ivaPercentage}%</p>
                  )}
                </div>

                <div className="flex gap-2 ml-3 flex-shrink-0">
                  {editingIndex !== index && onUpdateItem && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditStart(index, item)}
                      className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-blue-400" />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onRemoveItem(index)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
