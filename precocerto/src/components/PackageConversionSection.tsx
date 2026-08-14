/**
 * Package Conversion Section - Fase 3
 * UI component for configuring product packaging and unit conversion
 */

import React from "react";
import {
  calculatePackageConversion,
  getPackageOptions,
  PackageConversionResult,
} from "../utils/packageConversionCalculator";

interface PackageConversionSectionProps {
  // Input values
  tipoProduto: string;
  unidadeCompra: string;
  unidadeVenda: string;
  unidadesInternas: string;
  venderEmbalagemInteira: boolean;

  // Calculated values from phase 2
  custoCompra: number;
  quantidade: string;
  precoVendaRecomendado: number;
  margemDesejada: number;

  // Callbacks
  onUnidadeCompraChange: (value: string) => void;
  onUnidadeVendaChange: (value: string) => void;
  onUnidadesInternasChange: (value: string) => void;
  onVenderEmbalagemInteiraChange: (value: boolean) => void;

  // Optional: show conversion results
  showResults?: boolean;
}

export default function PackageConversionSection({
  tipoProduto,
  unidadeCompra,
  unidadeVenda,
  unidadesInternas,
  venderEmbalagemInteira,
  custoCompra,
  quantidade,
  precoVendaRecomendado,
  margemDesejada,
  onUnidadeCompraChange,
  onUnidadeVendaChange,
  onUnidadesInternasChange,
  onVenderEmbalagemInteiraChange,
  showResults = true,
}: PackageConversionSectionProps) {
  console.log('🔵 PackageConversionSection renderizando com props:', {
    tipoProduto,
    unidadeCompra,
    unidadeVenda,
    unidadesInternas,
    venderEmbalagemInteira,
  });

  // Get package options based on product type
  const packageOptions = getPackageOptions(tipoProduto);
  console.log('📦 Package options:', packageOptions);

  // Calculate conversion metrics
  const resultado = calculatePackageConversion({
    custoCompra,
    quantidade: parseFloat(quantidade) || 0,
    unidadeCompra,
    unidadeVenda,
    unidadesInternas: parseFloat(unidadesInternas) || 1,
    venderEmbalagemInteira,
    margemDesejada,
    precoVendaRecomendado,
  });

  return (
    <div className="space-y-6 border-t pt-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-800">
          📦 Configuração de Embalagem (Fase 3)
        </span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          Conversão de Unidades
        </span>
      </div>

      {/* Unit Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unidade de Compra */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unidade de Compra *
          </label>
          <select
            value={unidadeCompra}
            onChange={(e) => onUnidadeCompraChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {packageOptions.compra.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Unidade em que você compra o produto
          </p>
        </div>

        {/* Unidade de Venda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unidade de Venda *
          </label>
          <select
            value={unidadeVenda}
            onChange={(e) => onUnidadeVendaChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            {packageOptions.venda.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Unidade em que você vende ao cliente
          </p>
        </div>

        {/* Unidades por Embalagem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unidades por Embalagem *
          </label>
          <input
            type="number"
            value={unidadesInternas}
            onChange={(e) => onUnidadesInternasChange(e.target.value)}
            placeholder="Ex: 50"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Quantas {unidadeVenda || "unidades"} cabem em uma {unidadeCompra || "embalagem"}?
          </p>
        </div>

        {/* Modo de Venda */}
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={venderEmbalagemInteira}
              onChange={(e) => onVenderEmbalagemInteiraChange(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Vender embalagem inteira
            </span>
          </label>
          <p className="text-xs text-gray-500 ml-2">
            {venderEmbalagemInteira
              ? "Vende por caixa/embalagem"
              : "Vende por unidade individual"}
          </p>
        </div>
      </div>

      {/* Validation Messages */}
      {!resultado.isValid && resultado.validationMessages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">
            ⚠️ Erros de Validação:
          </h4>
          <ul className="space-y-1">
            {resultado.validationMessages.map((msg, idx) => (
              <li key={idx} className="text-sm text-red-700">
                • {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results Section */}
      {showResults && resultado.isValid && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">
            📊 Resultados da Conversão:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Per-Unit Metrics */}
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <h5 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                💰 Por {unidadeVenda || "Unidade"}
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Custo:</span>
                  <span className="font-semibold">Kz {resultado.custoRealUnidadeVenda.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-semibold text-green-600">
                    Kz {resultado.precoRecomendadoUnidadeVenda.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lucro:</span>
                  <span className="font-semibold text-green-600">
                    +Kz {resultado.lucroUnidadeVenda.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Margem:</span>
                  <span className="font-semibold text-blue-600">
                    {resultado.margemUnidadeVenda.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Total Batch Metrics */}
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <h5 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                📈 Total da Embalagem
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de Unidades:</span>
                  <span className="font-semibold">
                    {resultado.totalUnidadesVendaveis} {unidadeVenda || "un."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Receita Esperada:</span>
                  <span className="font-semibold text-green-600">
                    Kz {resultado.receitaTotalEsperada.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lucro Esperado:</span>
                  <span className="font-semibold text-green-600">
                    +Kz {resultado.lucroTotalEsperado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Margem Total:</span>
                  <span className="font-semibold text-blue-600">
                    {resultado.margemTotalEsperada.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
