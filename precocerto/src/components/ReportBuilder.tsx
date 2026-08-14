import React, { useState, useMemo, useCallback } from 'react';
import { Product } from '../types';
import { Download, Plus, X, FileJson, FileSpreadsheet, FileText, Filter } from 'lucide-react';

interface ReportColumn {
  id: string;
  label: string;
  key: keyof Product | 'custoTotal';
  enabled: boolean;
  sortable?: boolean;
}

interface ReportFilter {
  id: string;
  type: 'category' | 'priceRange' | 'marginRange' | 'roiRange';
  value: any;
}

interface ReportBuilderProps {
  products: Product[];
  onGenerateReport: (config: ReportConfig) => void;
  onExport?: (config: ReportConfig, format: 'excel' | 'pdf') => void;
}

export interface ReportConfig {
  title: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  sortBy?: keyof Product;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Componente construtor de relatórios personalizados
 * Permite ao utilizador criar relatórios customizados
 * Fase 5B Item 3: Custom Reports
 * Performance optimized with React.memo and useCallback
 */
function ReportBuilderComponent({
  products,
  onGenerateReport,
  onExport
}: ReportBuilderProps) {
  const [reportTitle, setReportTitle] = useState('Relatório de Produtos');
  const [selectedColumns, setSelectedColumns] = useState<ReportColumn[]>([
    { id: 'nome', label: 'Nome', key: 'nome', enabled: true, sortable: true },
    { id: 'categoria', label: 'Categoria', key: 'categoria', enabled: true, sortable: true },
    { id: 'custoCompra', label: 'Custo', key: 'custoCompra', enabled: true, sortable: true },
    { id: 'precoVendaRecomendado', label: 'Preço', key: 'precoVendaRecomendado', enabled: true, sortable: true },
    { id: 'margemReal', label: 'Margem %', key: 'margemReal', enabled: true, sortable: true },
  ]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState<keyof Product>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter form state
  const [filterType, setFilterType] = useState<'category' | 'priceRange' | 'marginRange' | 'roiRange'>('category');
  const [categoryValue, setCategoryValue] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [marginMin, setMarginMin] = useState('');
  const [marginMax, setMarginMax] = useState('');
  const [roiMin, setRoiMin] = useState('');
  const [roiMax, setRoiMax] = useState('');

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [products]);

  const availableColumns: ReportColumn[] = [
    { id: 'nome', label: 'Nome do Produto', key: 'nome', enabled: false, sortable: true },
    { id: 'categoria', label: 'Categoria', key: 'categoria', enabled: false, sortable: true },
    { id: 'custoCompra', label: 'Custo de Compra', key: 'custoCompra', enabled: false, sortable: true },
    { id: 'custoTransporte', label: 'Custo Transporte', key: 'custoTransporte', enabled: false },
    { id: 'custoEmbalagem', label: 'Custo Embalagem', key: 'custoEmbalagem', enabled: false },
    { id: 'custoTotal', label: 'Custo Total', key: 'custoTotal', enabled: false, sortable: true },
    { id: 'precoVendaRecomendado', label: 'Preço de Venda', key: 'precoVendaRecomendado', enabled: false, sortable: true },
    { id: 'lucroEstimado', label: 'Lucro Estimado', key: 'lucroEstimado', enabled: false, sortable: true },
    { id: 'margemReal', label: 'Margem Real %', key: 'margemReal', enabled: false, sortable: true },
    { id: 'roi', label: 'ROI %', key: 'roi', enabled: false, sortable: true },
  ];

  const toggleColumn = useCallback((columnId: string) => {
    setSelectedColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      )
    );
  }, []);

  const addColumn = useCallback((columnId: string) => {
    setSelectedColumns(prev => {
      const availableCol = availableColumns.find(c => c.id === columnId);
      if (availableCol && !prev.find(c => c.id === columnId)) {
        return [...prev, { ...availableCol, enabled: true }];
      }
      return prev;
    });
  }, [availableColumns]);

  const removeColumn = useCallback((columnId: string) => {
    setSelectedColumns(prev => prev.filter(col => col.id !== columnId));
  }, []);

  const addFilter = useCallback(() => {
    let newFilter: ReportFilter | null = null;
    const filterId = `${filterType}-${Date.now()}`;

    switch (filterType) {
      case 'category':
        if (categoryValue) {
          newFilter = {
            id: filterId,
            type: 'category',
            value: categoryValue
          };
          setCategoryValue('');
        }
        break;
      case 'priceRange':
        if (priceMin !== '' && priceMax !== '') {
          newFilter = {
            id: filterId,
            type: 'priceRange',
            value: { min: parseFloat(priceMin), max: parseFloat(priceMax) }
          };
          setPriceMin('');
          setPriceMax('');
        }
        break;
      case 'marginRange':
        if (marginMin !== '' && marginMax !== '') {
          newFilter = {
            id: filterId,
            type: 'marginRange',
            value: { min: parseFloat(marginMin), max: parseFloat(marginMax) }
          };
          setMarginMin('');
          setMarginMax('');
        }
        break;
      case 'roiRange':
        if (roiMin !== '' && roiMax !== '') {
          newFilter = {
            id: filterId,
            type: 'roiRange',
            value: { min: parseFloat(roiMin), max: parseFloat(roiMax) }
          };
          setRoiMin('');
          setRoiMax('');
        }
        break;
    }

    if (newFilter) {
      setFilters([...filters, newFilter]);
    }
  }, [
    filterType,
    categoryValue,
    priceMin,
    priceMax,
    marginMin,
    marginMax,
    roiMin,
    roiMax,
    filters
  ]);

  const removeFilter = useCallback((filterId: string) => {
    setFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const handleGenerateReport = useCallback(() => {
    onGenerateReport({
      title: reportTitle,
      columns: selectedColumns.filter(c => c.enabled),
      filters,
      sortBy,
      sortOrder
    });
  }, [reportTitle, selectedColumns, filters, sortBy, sortOrder, onGenerateReport]);

  return (
    <div className="space-y-6">
      {/* Título do Relatório */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Título do Relatório
        </label>
        <input
          type="text"
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
          placeholder="Ex: Relatório de Produtos - Janeiro 2024"
        />
      </div>

      {/* Seleção de Colunas */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Selecionar Colunas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {selectedColumns.map(col => (
            <div
              key={col.id}
              className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800"
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={col.enabled}
                  onChange={() => toggleColumn(col.id)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {col.label}
                </span>
              </label>
              <button
                onClick={() => removeColumn(col.id)}
                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                title="Remover coluna"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Colunas Disponíveis */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            Adicionar mais colunas:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableColumns
              .filter(col => !selectedColumns.find(sc => sc.id === col.id))
              .map(col => (
                <button
                  key={col.id}
                  onClick={() => addColumn(col.id)}
                  className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  {col.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} />
            Filtros
          </div>
        </h3>

        {/* Filtros Aplicados */}
        {filters.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Filtros Aplicados:
            </p>
            <div className="space-y-2">
              {filters.map(filter => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg"
                >
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    {filter.type === 'category' && `Categoria: ${filter.value}`}
                    {filter.type === 'priceRange' && `Preço: ${filter.value.min} - ${filter.value.max}`}
                    {filter.type === 'marginRange' && `Margem: ${filter.value.min}% - ${filter.value.max}%`}
                    {filter.type === 'roiRange' && `ROI: ${filter.value.min}% - ${filter.value.max}%`}
                  </div>
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                    title="Remover filtro"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar Novo Filtro */}
        <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Filtro:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="category">Categoria</option>
              <option value="priceRange">Faixa de Preço</option>
              <option value="marginRange">Faixa de Margem</option>
              <option value="roiRange">Faixa de ROI</option>
            </select>
          </div>

          {/* Campos específicos por tipo de filtro */}
          {filterType === 'category' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Selecionar Categoria:
              </label>
              <select
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Selecione uma categoria --</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'priceRange' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priceMin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preço Mínimo:
                </label>
                <input
                  id="priceMin"
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="priceMax" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preço Máximo:
                </label>
                <input
                  id="priceMax"
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {filterType === 'marginRange' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="marginMin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Margem Mínima (%):
                </label>
                <input
                  id="marginMin"
                  type="number"
                  value={marginMin}
                  onChange={(e) => setMarginMin(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="marginMax" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Margem Máxima (%):
                </label>
                <input
                  id="marginMax"
                  type="number"
                  value={marginMax}
                  onChange={(e) => setMarginMax(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {filterType === 'roiRange' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="roiMin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  ROI Mínimo (%):
                </label>
                <input
                  id="roiMin"
                  type="number"
                  value={roiMin}
                  onChange={(e) => setRoiMin(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>
              <div>
                <label htmlFor="roiMax" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  ROI Máximo (%):
                </label>
                <input
                  id="roiMax"
                  type="number"
                  value={roiMax}
                  onChange={(e) => setRoiMax(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <button
            onClick={addFilter}
            className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Adicionar Filtro
          </button>
        </div>
      </div>

      {/* Ordenação */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Ordenação
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ordenar por:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as keyof Product)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="nome">Nome</option>
              <option value="categoria">Categoria</option>
              <option value="custoCompra">Custo</option>
              <option value="precoVendaRecomendado">Preço</option>
              <option value="margemReal">Margem</option>
              <option value="roi">ROI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Direção:
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="asc">Crescente (A-Z)</option>
              <option value="desc">Decrescente (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumo e Botões */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6">
        <div className="mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>{selectedColumns.filter(c => c.enabled).length}</strong> colunas selecionadas
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>{products.length}</strong> produtos no relatório
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={selectedColumns.filter(c => c.enabled).length === 0}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Gerar
          </button>

          {onExport && (
            <>
              <button
                onClick={() => onExport({
                  title: reportTitle,
                  columns: selectedColumns.filter(c => c.enabled),
                  filters,
                  sortBy,
                  sortOrder
                }, 'excel')}
                disabled={selectedColumns.filter(c => c.enabled).length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileSpreadsheet size={18} />
                Excel
              </button>

              <button
                onClick={() => onExport({
                  title: reportTitle,
                  columns: selectedColumns.filter(c => c.enabled),
                  filters,
                  sortBy,
                  sortOrder
                }, 'pdf')}
                disabled={selectedColumns.filter(c => c.enabled).length === 0}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized ReportBuilder component
 * Prevents unnecessary re-renders when props haven't changed
 */
export const ReportBuilder = React.memo(ReportBuilderComponent);
