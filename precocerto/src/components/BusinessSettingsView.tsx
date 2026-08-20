import React, { useState, useEffect } from "react";
import { BusinessSettings } from "../types";
import { businessModuleRegistry } from "../modules/business-types";
import { getOperationalUnitLabel } from "../utils/businessUnitMapping";
import { motion } from "motion/react";
import { 
  Building2, 
  Coins, 
  Globe, 
  Languages, 
  Palette, 
  Calendar, 
  Hash, 
  Image as ImageIcon, 
  Save, 
  Plus, 
  Trash2,
  HelpCircle,
  Check
} from "lucide-react";

interface BusinessSettingsViewProps {
  settings: BusinessSettings | null;
  onSave: (settingsData: Omit<BusinessSettings, "userId" | "id">) => Promise<void>;
}

export default function BusinessSettingsView({ settings, onSave }: BusinessSettingsViewProps) {
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("farmacia");
  const [currency, setCurrency] = useState("Kz");
  const [country, setCountry] = useState("Angola");
  const [language, setLanguage] = useState("Português");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("emerald-600");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [numberFormat, setNumberFormat] = useState("1.234,56");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || "");
      setBusinessType(settings.businessType || "farmacia");
      setCurrency(settings.currency || "Kz");
      setCountry(settings.country || "Angola");
      setLanguage(settings.language || "Português");
      setLogoUrl(settings.logoUrl || "");
      setPrimaryColor(settings.primaryColor || "emerald-600");
      setDateFormat(settings.dateFormat || "DD/MM/YYYY");
      setNumberFormat(settings.numberFormat || "1.234,56");
      setCustomCategories(settings.customCategories || []);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        companyName,
        businessType,
        currency,
        country,
        language,
        logoUrl,
        primaryColor,
        dateFormat,
        numberFormat,
        customCategories
      });
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !customCategories.includes(trimmed)) {
      setCustomCategories([...customCategories, trimmed]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (indexToRemove: number) => {
    setCustomCategories(customCategories.filter((_, idx) => idx !== indexToRemove));
  };

  const currentModule = businessModuleRegistry.getModuleById(businessType);

  const colorOptions = [
    { name: "Esmeralda", value: "emerald-600", bg: "bg-emerald-600" },
    { name: "Azul", value: "blue-600", bg: "bg-blue-600" },
    { name: "Âmbar", value: "amber-600", bg: "bg-amber-600" },
    { name: "Rosa", value: "pink-600", bg: "bg-pink-600" },
    { name: "Roxo", value: "purple-600", bg: "bg-purple-600" },
    { name: "Turquesa", value: "teal-600", bg: "bg-teal-600" },
    { name: "Ciano", value: "cyan-600", bg: "bg-cyan-600" },
    { name: "Laranja", value: "orange-600", bg: "bg-orange-600" },
    { name: "Carmesim", value: "red-600", bg: "bg-red-600" },
    { name: "Cinza Slate", value: "slate-600", bg: "bg-slate-600" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            Configurações da Unidade de Negócio
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Configure o módulo, moeda, categorias e identidade da loja/unidade atualmente selecionada.
          </p>
          {settings?.storeName && (
            <div className="mt-2 space-y-0.5">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Unidade atual: {settings.storeName}
              </p>
              {(settings.businessGroupName || settings.businessSegmentName || settings.unitType) && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {settings.businessGroupName || "Grupo"} · {settings.businessSegmentName || "Segmento"} · {getOperationalUnitLabel(settings.unitType)}
                </p>
              )}
            </div>
          )}
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 self-start md:self-center bg-${currentModule.color || 'emerald-600'} text-white shadow-xs`}>
          <span>Módulo Ativo: {currentModule.name}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grid of basic settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Sessão A: Identificação & Tipo */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Building2 size={16} className="text-slate-400" />
              Empresa e Tipo de Atividade
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                Nome Comercial da Unidade <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Farmácia Central, Papelaria Kilamba"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                Módulo da Unidade Atual <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
              >
                {businessModuleRegistry.getAllModules().map((mod) => (
                  <option key={mod.id} value={mod.id}>{mod.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 italic">
                Esta opção afeta a loja/unidade atual. Outras unidades mantêm o seu próprio módulo.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                Logotipo URL (Opcional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <ImageIcon size={14} />
                </span>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Sessão B: Regionalização & Localização */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Globe size={16} className="text-slate-400" />
              Regionalização e Formatos
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                  País <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Angola"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                  Moeda <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Coins size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="Kz"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                Idioma <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Languages size={14} />
                </span>
                <input
                  type="text"
                  required
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Português"
                  className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                  Formato de Data
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-350 mb-1.5">
                  Formato Numérico
                </label>
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                >
                  <option value="1.234,56">1.234,56 (Vírgula)</option>
                  <option value="1,234.56">1,234.56 (Ponto)</option>
                  <option value="1 234,56">1 234,56 (Espaço)</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Sessão C: Cor de Identidade Visual */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Palette size={16} className="text-slate-400" />
            Cor Principal da Identidade
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Escolha uma cor de destaque para colorir botões, indicadores de dashboard e badges no sistema.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {colorOptions.map((col) => (
              <button
                key={col.value}
                type="button"
                onClick={() => setPrimaryColor(col.value)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  primaryColor === col.value
                    ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/60 shadow-xs"
                    : "border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-md ${col.bg} shrink-0`} />
                <span className="truncate text-slate-700 dark:text-slate-300">{col.name}</span>
                {primaryColor === col.value && (
                  <Check size={12} className="text-slate-900 dark:text-white ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sessão D: Categorias Dinâmicas Personalizadas (Fase 12) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Plus size={16} className="text-slate-400" />
            Categorias Personalizadas (Módulo {currentModule.name})
          </h3>
          
          <div className="space-y-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              O módulo possui categorias padrão ({currentModule.categories.length} originais), mas você pode adicionar categorias personalizadas que serão preservadas.
            </p>

            {/* Input to add category */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Ex: Suplementos Whey, Moda Verão"
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            {/* List of active categories */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Categorias do Sistema Ativas
              </span>
              
              <div className="flex flex-wrap gap-1.5">
                {/* Original categories (cannot delete, read-only) */}
                {currentModule.categories.map((cat) => (
                  <span 
                    key={cat} 
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-lg select-none cursor-not-allowed"
                    title="Categoria original do sistema (não pode ser excluída)"
                  >
                    {cat} <span className="text-[9px] opacity-70">(Original)</span>
                  </span>
                ))}

                {/* Custom categories */}
                {customCategories.map((cat, idx) => (
                  <span 
                    key={`${cat}-${idx}`} 
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-1.5"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(idx)}
                      className="text-emerald-500 hover:text-rose-500 dark:text-emerald-400 dark:hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <HelpCircle size={14} />
            <span>Campos com * são obrigatórios. Os dados são sincronizados na nuvem.</span>
          </div>

          <div className="flex items-center gap-3">
            {showSuccessMsg && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={14} />
                Salvo com sucesso!
              </span>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all cursor-pointer"
            >
              {isSubmitting ? "Salvando..." : "Salvar Configurações"}
              <Save size={14} />
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
