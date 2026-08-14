import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../types';
import { calculateProductFields } from '../utils/pricing';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Product[]) => Promise<void>;
}

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  [key: string]: keyof Product | 'skip';
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  'nome': 'nome',
  'name': 'nome',
  'product': 'nome',
  'produto': 'nome',
  'custodecompra': 'custoCompra',
  'custo_compra': 'custoCompra',
  'custo': 'custoCompra',
  'cost': 'custoCompra',
  'custotransporte': 'custoTransporte',
  'custo_transporte': 'custoTransporte',
  'transporte': 'custoTransporte',
  'shipping': 'custoTransporte',
  'custoembalagem': 'custoEmbalagem',
  'custo_embalagem': 'custoEmbalagem',
  'embalagem': 'custoEmbalagem',
  'packaging': 'custoEmbalagem',
  'outroscustos': 'outrosCustos',
  'outros_custos': 'outrosCustos',
  'outros': 'outrosCustos',
  'other_costs': 'outrosCustos',
  'categoria': 'categoria',
  'category': 'categoria',
  'cat': 'categoria',
};

/**
 * Modal para importação em lote de produtos via CSV
 * Suporta mapeamento automático de colunas e validação
 */
export function ImportCSVModal({ isOpen, onClose, onImport }: ImportCSVModalProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'importing'>('select');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV válido');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('Arquivo CSV está vazio');
          return;
        }

        setCsvData(results.data as CSVRow[]);
        autoMapColumns(results.data as CSVRow[]);
        setError(null);
        setStep('preview');
      },
      error: (error) => {
        setError(`Erro ao ler CSV: ${error.message}`);
      },
    });
  };

  const autoMapColumns = (data: CSVRow[]) => {
    if (data.length === 0) return;

    const mapping: ColumnMapping = {};
    const firstRow = data[0];

    Object.keys(firstRow).forEach((col) => {
      const normalized = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      mapping[col] = DEFAULT_COLUMN_MAPPING[normalized] || 'skip';
    });

    setColumnMapping(mapping);
  };

  const handleColumnMappingChange = (csvCol: string, productField: keyof Product | 'skip') => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvCol]: productField,
    }));
  };

  const validateAndConvertRow = (row: CSVRow, index: number): Product | null => {
    try {
      const baseProduct: Record<string, any> = {
        id: `import-${Date.now()}-${index}`,
      };

      // Mapear colunas
      Object.entries(columnMapping).forEach(([csvCol, productField]: [string, any]) => {
        const cellValue = row[csvCol];
        if (productField === 'skip' || !cellValue) return;

        const value = String(cellValue).trim() || '';
        if (!value) return;

        if (productField === 'nome' || productField === 'categoria') {
          baseProduct[productField] = value;
        } else if (productField !== 'skip') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error(`Valor inválido para ${productField}: "${value}"`);
          }
          if (numValue < 0) {
            throw new Error(`Valor negativo para ${productField}: ${numValue}`);
          }
          baseProduct[productField] = numValue;
        }
      });

      const product: Partial<Product> = baseProduct;

      // Validação obrigatória
      if (!product.nome) {
        throw new Error('Nome do produto é obrigatório');
      }
      if (product.custoCompra === undefined || product.custoCompra === null) {
        throw new Error('Custo de compra é obrigatório');
      }

      // Calcular campos de preço
      const priceFields = calculateProductFields({
        custoCompra: product.custoCompra || 0,
        custoTransporte: product.custoTransporte || 0,
        custoEmbalagem: product.custoEmbalagem || 0,
        outrosCustos: product.outrosCustos || 0,
        margemDesejada: 20, // Default 20%
      });

      return {
        ...product,
        ...priceFields,
      } as Product;
    } catch (err) {
      console.error(`Erro na linha ${index + 1}: ${err}`);
      return null;
    }
  };

  const handleImport = async () => {
    try {
      setStep('importing');
      const validProducts: Product[] = [];
      const errors: string[] = [];

      csvData.forEach((row, index) => {
        const product = validateAndConvertRow(row, index);
        if (product) {
          validProducts.push(product);
        } else {
          errors.push(`Linha ${index + 1}: Dados inválidos`);
        }
      });

      if (validProducts.length === 0) {
        setError('Nenhum produto válido para importar');
        setStep('preview');
        return;
      }

      // Importar produtos
      await onImport(validProducts);

      setImportStats({
        success: validProducts.length,
        failed: errors.length,
      });

      // Limpar após sucesso
      setTimeout(() => {
        onClose();
        setStep('select');
        setCsvData([]);
        setColumnMapping({});
        setError(null);
      }, 2000);
    } catch (err) {
      setError(`Erro ao importar: ${err}`);
      setStep('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Importar Produtos</h2>
            <p className="text-gray-600 text-sm">Carregue um arquivo CSV com seus produtos</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select File */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="font-semibold text-lg mb-2">Selecione um arquivo CSV</h3>
                <p className="text-gray-600 text-sm mb-4">
                  ou arraste e solte aqui
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Escolher Arquivo
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Formato do CSV</h4>
                <p className="text-sm text-blue-800 font-mono mb-2">
                  nome, custoCompra, custoTransporte, custoEmbalagem, outrosCustos, categoria
                </p>
                <p className="text-sm text-blue-800">
                  As colunas serão mapeadas automaticamente. Você pode revisar o mapeamento antes de importar.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview & Map Columns */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Mapeamento de Colunas</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.keys(csvData[0] || {}).map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <label className="flex-1 text-sm text-gray-700 font-medium">
                        {col}
                      </label>
                      <select
                        value={columnMapping[col] || 'skip'}
                        onChange={(e) =>
                          handleColumnMappingChange(col, e.target.value as any)
                        }
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="skip">Ignorar</option>
                        <option value="nome">Nome do Produto</option>
                        <option value="custoCompra">Custo de Compra</option>
                        <option value="custoTransporte">Custo de Transporte</option>
                        <option value="custoEmbalagem">Custo de Embalagem</option>
                        <option value="outrosCustos">Outros Custos</option>
                        <option value="categoria">Categoria</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Preview de Dados</h3>
                <div className="bg-gray-50 border rounded-lg overflow-x-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200 sticky top-0">
                      <tr>
                        {Object.keys(csvData[0] || {}).map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-semibold text-xs">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-100">
                          {Object.keys(row).map((col) => (
                            <td key={col} className="px-3 py-2 text-xs">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Mostrando 5 de {csvData.length} linhas
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Importação Concluída</h3>
              <p className="text-gray-600 mb-4">
                {importStats.success} produtos importados com sucesso
                {importStats.failed > 0 && ` (${importStats.failed} com erro)`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancelar
          </button>
          {step === 'preview' && (
            <button
              onClick={handleImport}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Importar {csvData.length} Produtos
            </button>
          )}
          {step === 'select' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Selecionar Arquivo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
