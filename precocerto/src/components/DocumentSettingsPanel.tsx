import React, { useState } from "react";
import { Settings, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DocumentSettings {
  emissionType: "fatura" | "recibo";
  requiresCustomer: boolean;
  requiresNIF: boolean;
  autoNumbering: boolean;
  documentPrefix: string;
  observationRequired: boolean;
}

interface DocumentSettingsPanelProps {
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function DocumentSettingsPanel({
  settings,
  onSettingsChange,
  isExpanded = false,
  onToggleExpand,
}: DocumentSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSettingChange = <K extends keyof DocumentSettings>(
    key: K,
    value: DocumentSettings[K]
  ) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-white text-sm font-medium transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Definições</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 max-w-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          Definições de Emissão
        </h3>
        <button
          onClick={onToggleExpand}
          className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          Fechar
        </button>
      </div>

      <div className="space-y-4">
        {/* Tipo de Emissão */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Tipo de Emissão
          </label>
          <div className="flex gap-2">
            {["fatura", "recibo"].map((type) => (
              <button
                key={type}
                onClick={() =>
                  handleSettingChange(
                    "emissionType",
                    type as "fatura" | "recibo"
                  )
                }
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  localSettings.emissionType === type
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {type === "fatura" ? "Fatura" : "Recibo"}
              </button>
            ))}
          </div>
        </div>

        {/* Prefixo do Documento */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Prefixo do Documento
          </label>
          <input
            type="text"
            value={localSettings.documentPrefix}
            onChange={(e) =>
              handleSettingChange("documentPrefix", e.target.value.toUpperCase())
            }
            placeholder="Ex: FAT, REC, ORC"
            maxLength={3}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="text-xs text-slate-500 mt-1">
            Máximo 3 caracteres (será seguido de número sequencial)
          </p>
        </div>

        {/* Checkbox: Numeração Automática */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoNumbering"
            checked={localSettings.autoNumbering}
            onChange={(e) =>
              handleSettingChange("autoNumbering", e.target.checked)
            }
            className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
          />
          <label
            htmlFor="autoNumbering"
            className="text-sm text-slate-300 cursor-pointer flex-1"
          >
            Numeração Automática
          </label>
        </div>

        {/* Checkbox: Requer Cliente */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="requiresCustomer"
            checked={localSettings.requiresCustomer}
            onChange={(e) =>
              handleSettingChange("requiresCustomer", e.target.checked)
            }
            className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
          />
          <label
            htmlFor="requiresCustomer"
            className="text-sm text-slate-300 cursor-pointer flex-1"
          >
            Requer Cliente
          </label>
        </div>

        {/* Checkbox: Requer NIF */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="requiresNIF"
            checked={localSettings.requiresNIF}
            onChange={(e) => handleSettingChange("requiresNIF", e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
          />
          <label
            htmlFor="requiresNIF"
            className="text-sm text-slate-300 cursor-pointer flex-1"
          >
            Requer NIF do Cliente
          </label>
        </div>

        {/* Checkbox: Observação Obrigatória */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="observationRequired"
            checked={localSettings.observationRequired}
            onChange={(e) =>
              handleSettingChange("observationRequired", e.target.checked)
            }
            className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
          />
          <label
            htmlFor="observationRequired"
            className="text-sm text-slate-300 cursor-pointer flex-1"
          >
            Observação Obrigatória
          </label>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mt-4">
          <p className="text-xs text-blue-300">
            💡 As definições escolhidas determinarão quais campos são obrigatórios
            ao finalizar a venda.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
