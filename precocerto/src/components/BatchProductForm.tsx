import React, { useEffect, useMemo, useState } from "react";
import { Product, BusinessSettings } from "../types";
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { calculateProductFields } from "../utils/pricing";
import { calculateProductPricesWithCategoryMargin } from "../utils/categoryUtils";
import { useCategories } from "../hooks/useCategories";
import { useGlobalCategories } from "../hooks/useGlobalCategories"; // NOVO (Fase 14)
import { useMarkupTable } from "../hooks/useMarkupTable";
import { useStore } from "../contexts/StoreContext";
import { formatKz } from "../utils";
import type { CategoryMarginConfig } from "../types/category";
import { markupToMarginCategory } from "../utils/markupCategoryAdapter";
import { selectMarginCategories } from "../utils/categorySelection";

interface BatchProductItem {
  id: string;
  nome: string;
  categoria: string;
  categoryId: string;
  quantidade: string;
  custoCompra: string;
  unidadeCompra: string;
  margemDesejada: string;
}

interface BatchProductFormProps {
  onSave: (products: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">[]) => Promise<void>;
  onCancel: () => void;
  settings?: BusinessSettings | null;
}

const createEmptyItem = (id: string, category?: CategoryMarginConfig): BatchProductItem => ({
  id,
  nome: "",
  categoria: category?.name || "",
  categoryId: category?.id || "",
  quantidade: "1",
  custoCompra: "",
  unidadeCompra: "unidade",
  margemDesejada: category?.marginRules.baseMargin.toString() || "30",
});

export default function BatchProductForm({
  onSave,
  onCancel,
  settings,
}: BatchProductFormProps) {
  const { currentStore, userStores } = useStore();
  const categoryStoreId = currentStore?.storeId || userStores[0]?.id || "";
  const storeName = currentStore?.storeName || userStores[0]?.nome;

  // NOVO (Fase 14): Usar categorias globais sincronizadas entre lojas
  const { categories: globalCategories, loading: globalLoading } = useGlobalCategories();

  // NOVO (Fase 2): Categories and margin management (fallback local)
  const { categories: storedCategories, loading: categoriesLoading } = useCategories({ storeId: categoryStoreId });
  const { markups, loading: markupsLoading } = useMarkupTable({ storeId: categoryStoreId });
  const markupCategories = useMemo(
    () =>
      markups
        .filter((markup) => markup.ativo !== false)
        .map((markup) => markupToMarginCategory(markup, settings?.businessType || "outro")),
    [markups, settings?.businessType]
  );

  // Preferir categorias globais apenas quando pertencem ao tipo de negócio atual.
  const categories = useMemo(
    () => selectMarginCategories(globalCategories, markupCategories, storedCategories, settings?.businessType || "outro"),
    [globalCategories, markupCategories, storedCategories, settings?.businessType]
  );
  const marginCategoriesLoading = globalLoading || markupsLoading || (markupCategories.length === 0 && categoriesLoading);

  const [items, setItems] = useState<BatchProductItem[]>([createEmptyItem("1")]);
  const [fornecedor, setFornecedor] = useState("");
  const [numeroFatura, setNumeroFatura] = useState("");
  const [dataEmissaoFatura, setDataEmissaoFatura] = useState("");
  const [costoTransporte, setCostoTransporte] = useState<string>("0");
  const [custoEmbalagem, setCustoEmbalagem] = useState<string>("0");
  const [outrosCustos, setOutrosCustos] = useState<string>("0");
  const [distribuicaoModo, setDistribuicaoModo] = useState<"quantidade" | "custo">("quantidade");
  const [margemDesejada, setMargemDesejada] = useState<string>("30");
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categories.length === 0) return;

    setItems((currentItems) => {
      let changed = false;
      const defaultCategory = categories[0];
      const nextItems = currentItems.map((item) => {
        if (item.categoryId && categories.some((category) => category.id === item.categoryId)) {
          return item;
        }

        changed = true;
        return {
          ...item,
          categoria: defaultCategory.name,
          categoryId: defaultCategory.id,
          margemDesejada: defaultCategory.marginRules.baseMargin.toString(),
        };
      });

      return changed ? nextItems : currentItems;
    });
  }, [categories]);

  const adicionarItem = () => {
    const novoId = (Math.max(...items.map(i => parseInt(i.id) || 0), 0) + 1).toString();
    setItems([...items, createEmptyItem(novoId, categories[0])]);
  };

  const removerItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const atualizarItem = (id: string, campo: keyof BatchProductItem, valor: string) => {
    setItems(
      items.map(item =>
        item.id === id ? { ...item, [campo]: valor } : item
      )
    );
  };

  const atualizarCategoriaItem = (id: string, categoryId: string) => {
    const selected = categories.find(category => category.id === categoryId);
    setItems(
      items.map(item =>
        item.id === id
          ? {
              ...item,
              categoryId,
              categoria: selected?.name || "",
              margemDesejada: selected?.marginRules.baseMargin.toString() || "",
            }
          : item
      )
    );
  };

  const calculatedItems = useMemo(() => {
    const totalQtd = items.reduce((sum, item) => sum + (parseFloat(item.quantidade) || 0), 0);
    const totalCusto = items.reduce((sum, item) => {
      const qtd = parseFloat(item.quantidade) || 0;
      const custoUnitario = parseFloat(item.custoCompra) || 0;
      return sum + custoUnitario * qtd;
    }, 0);

    const custos = {
      transporte: parseFloat(costoTransporte) || 0,
      embalagem: parseFloat(custoEmbalagem) || 0,
      outros: parseFloat(outrosCustos) || 0,
    };

    return items.map(item => {
      const quantidade = parseFloat(item.quantidade) || 0;
      const custoUnitario = parseFloat(item.custoCompra) || 0;
      const custoBaseTotal = custoUnitario * quantidade;
      const share = distribuicaoModo === "quantidade"
        ? (totalQtd > 0 ? quantidade / totalQtd : 0)
        : (totalCusto > 0 ? custoBaseTotal / totalCusto : 0);
      const selectedCategory = categories.find(category => category.id === item.categoryId);
      const margem = selectedCategory?.marginRules.baseMargin ?? (parseFloat(item.margemDesejada || margemDesejada) || 30);

      const custoTransporteRateado = custos.transporte * share;
      const custoEmbalagemRateado = custos.embalagem * share;
      const outrosCustosRateado = custos.outros * share;

      const baseInput = {
        quantidade,
        modoCalculo: "manual" as const,
        custoCompra: custoUnitario,
        custoTransporte: custoTransporteRateado,
        custoTransporteTipo: "lote" as const,
        custoEmbalagem: custoEmbalagemRateado,
        custoEmbalagemTipo: "lote" as const,
        outrosCustos: outrosCustosRateado,
        outrosCustosTipo: "lote" as const,
      };

      const calculated = selectedCategory
        ? calculateProductPricesWithCategoryMargin(baseInput, selectedCategory)
        : calculateProductFields({ ...baseInput, margemDesejada: margem });

      return {
        ...item,
        quantidadeNumber: quantidade,
        custoCompraNumber: custoUnitario,
        categoriaFinal: selectedCategory?.name || item.categoria,
        categoryIdFinal: selectedCategory?.id || item.categoryId || undefined,
        margemFinal: margem,
        custoTransporteRateado,
        custoEmbalagemRateado,
        outrosCustosRateado,
        selectedCategory,
        calculated,
      };
    });
  }, [items, costoTransporte, custoEmbalagem, outrosCustos, distribuicaoModo, margemDesejada, categories]);

  const resumo = useMemo(() => {
    return calculatedItems.reduce(
      (acc, item) => ({
        investimento: acc.investimento + ((item.custoCompraNumber || 0) * (item.quantidadeNumber || 0)) + item.custoTransporteRateado + item.custoEmbalagemRateado + item.outrosCustosRateado,
        receita: acc.receita + (item.calculated.receitaTotalEsperada || item.calculated.loteVendaTotal || 0),
        lucro: acc.lucro + (item.calculated.lucroTotalEsperado || item.calculated.loteLucroTotal || 0),
      }),
      { investimento: 0, receita: 0, lucro: 0 }
    );
  }, [calculatedItems]);

  const handleSave = async () => {
    try {
      setValidationError("");

      if (!fornecedor.trim()) {
        setValidationError("O fornecedor da fatura é obrigatório.");
        return;
      }

      if (!numeroFatura.trim()) {
        setValidationError("O nº da fatura é obrigatório.");
        return;
      }

      if (!dataEmissaoFatura.trim()) {
        setValidationError("A data de emissão da fatura é obrigatória.");
        return;
      }

      if (!categoryStoreId) {
        setValidationError("Não foi possível identificar a loja atual. Recarregue a aplicação e tente novamente.");
        return;
      }

      const fallbackMargin = parseFloat(margemDesejada);
      if (categories.length === 0 && (isNaN(fallbackMargin) || fallbackMargin < 0 || fallbackMargin >= 100)) {
        setValidationError("A margem desejada deve ser um número entre 0 e 99.9%.");
        return;
      }

      for (const item of calculatedItems) {
        if (!item.nome.trim()) {
          setValidationError("Todos os produtos devem ter nome.");
          return;
        }

        if (item.quantidadeNumber <= 0) {
          setValidationError(`A quantidade de "${item.nome}" deve ser maior que zero.`);
          return;
        }

        if (isNaN(item.custoCompraNumber) || item.custoCompraNumber <= 0) {
          setValidationError(`O custo unitário de "${item.nome}" deve ser maior que zero.`);
          return;
        }

        // Verificar se as categorias ainda estão a carregar
        if (marginCategoriesLoading) {
          setValidationError("Aguarde o carregamento das categorias. Tente novamente em alguns segundos.");
          return;
        }

        // Validar seleção de categoria (apenas se categorias carregaram)
        if (categories.length > 0 && !item.categoryIdFinal) {
          setValidationError(`Selecione a categoria com margens para "${item.nome}".`);
          return;
        }

        if (categories.length === 0 && !item.categoriaFinal.trim()) {
          setValidationError(`Informe a categoria de "${item.nome}".`);
          return;
        }
      }

      setIsSubmitting(true);

      const productsToSave: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">[] = calculatedItems.map(
        (item) => ({
          nome: item.nome.trim(),
          categoria: item.categoriaFinal.trim(),
          fornecedor: fornecedor.trim(),
          numeroFatura: numeroFatura.trim(),
          dataEmissaoFatura,
          storeId: categoryStoreId,
          storeName,
          categoryId: item.categoryIdFinal,
          quantidade: item.quantidadeNumber,
          quantidadeVendida: 0,
          quantidadeDisponivel: item.quantidadeNumber,
          custoCompra: item.custoCompraNumber,
          custoTransporte: item.custoTransporteRateado,
          custoTransporteTipo: "lote",
          custoEmbalagem: item.custoEmbalagemRateado,
          custoEmbalagemTipo: "lote",
          outrosCustos: item.outrosCustosRateado,
          outrosCustosTipo: "lote",
          margemDesejada: item.margemFinal,
          margemAplicada: item.margemFinal,
          precoVendaRecomendado: item.calculated.precoVendaRecomendado,
          lucroEstimado: item.calculated.lucroEstimado,
          margemReal: item.calculated.margemReal,
          roi: item.calculated.roi,
          custoTotalReal: item.calculated.custoTotalReal,
          tipoProduto: settings?.businessType || "outro",
          unidadeMedida: item.unidadeCompra,
          modoCalculo: "manual",
          unidadeCompra: item.unidadeCompra,
          unidadeVenda: "unidade",
          unidadesInternas: 1,
          venderEmbalagemInteira: true,
          totalUnidadesVendaveis: item.calculated.totalUnidadesVendaveis,
          custoRealUnidadeVenda: item.calculated.custoRealUnidadeVenda,
          precoRecomendadoUnidadeVenda: item.calculated.precoRecomendadoUnidadeVenda,
          lucroUnidadeVenda: item.calculated.lucroUnidadeVenda,
          receitaTotalEsperada: item.calculated.receitaTotalEsperada,
          lucroTotalEsperado: item.calculated.lucroTotalEsperado,
          loteCustoTotal: item.calculated.loteCustoTotal,
          loteVendaTotal: item.calculated.loteVendaTotal,
          loteLucroTotal: item.calculated.loteLucroTotal,
          observacoes: "Produto cadastrado em lote",
        })
      );

      await onSave(productsToSave);
    } catch (error) {
      console.error("Erro ao salvar produtos em lote:", error);
      const message = error instanceof Error ? error.message : "Erro ao salvar produtos em lote.";
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cadastro em Lote</h1>
          <p className="text-xs text-slate-500">Adicione vários produtos usando a margem da categoria configurada.</p>
        </div>
      </div>

      {validationError && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Dados da Fatura</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Fornecedor</label>
            <input
              type="text"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Ex: Armazém Central"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nº da Fatura</label>
            <input
              type="text"
              value={numeroFatura}
              onChange={(e) => setNumeroFatura(e.target.value)}
              placeholder="Ex: FT 2026/001"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Data de Emissão</label>
            <input
              type="date"
              value={dataEmissaoFatura}
              onChange={(e) => setDataEmissaoFatura(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Produtos</h2>
            <p className="text-xs text-slate-500 mt-1">
              {categories.length > 0
                ? "Cada produto deve usar uma Categoria (com Margens)."
                : "Nenhuma categoria com margem foi encontrada; use a categoria manual e a margem padrão."}
            </p>
          </div>
          {categories.length > 0 && (
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-semibold">
              {categories.length} categoria(s) carregada(s)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2">Nome</th>
                <th className="text-left py-2 px-2">Categoria (com Margens)</th>
                <th className="text-left py-2 px-2">Margem</th>
                <th className="text-left py-2 px-2">Qtd</th>
                <th className="text-left py-2 px-2">Unidade</th>
                <th className="text-left py-2 px-2">Custo Unit.</th>
                <th className="text-left py-2 px-2">Preço Rec.</th>
                <th className="text-center py-2 px-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const preview = calculatedItems.find(calculated => calculated.id === item.id);

                return (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.nome}
                        onChange={(e) => atualizarItem(item.id, "nome", e.target.value)}
                        placeholder="Ex: Paracetamol"
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    </td>
                    <td className="py-3 px-2">
                      {marginCategoriesLoading ? (
                        <select disabled className="w-full px-2 py-1 border rounded text-xs bg-slate-100 text-slate-500">
                          <option>Carregando categorias...</option>
                        </select>
                      ) : categories.length > 0 ? (
                        <select
                          value={item.categoryId}
                          onChange={(e) => atualizarCategoriaItem(item.id, e.target.value)}
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          <option value="">Selecionar categoria</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name} - {category.marginRules.baseMargin}%
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={item.categoria}
                          onChange={(e) => atualizarItem(item.id, "categoria", e.target.value)}
                          placeholder="Ex: Medicamentos"
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {preview?.selectedCategory ? (
                        <div className="text-xs leading-tight">
                          <span className="font-bold text-emerald-700">{preview.selectedCategory.marginRules.baseMargin}%</span>
                          <span className="block text-[10px] text-slate-500">
                            {preview.selectedCategory.marginRules.minMargin}% - {preview.selectedCategory.marginRules.maxMargin}%
                          </span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={item.margemDesejada}
                          onChange={(e) => atualizarItem(item.id, "margemDesejada", e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-xs"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(item.id, "quantidade", e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-xs"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={item.unidadeCompra}
                        onChange={(e) => atualizarItem(item.id, "unidadeCompra", e.target.value)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      >
                        <option value="unidade">Unidade</option>
                        <option value="caixa">Caixa</option>
                        <option value="kg">Kg</option>
                        <option value="litro">Litro</option>
                        <option value="lamina">Lamina</option>
                        <option value="blister">Blister</option>
                        <option value="frasco">Frasco</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.custoCompra}
                        onChange={(e) => atualizarItem(item.id, "custoCompra", e.target.value)}
                        placeholder="0.00"
                        className="w-28 px-2 py-1 border rounded text-xs"
                      />
                    </td>
                    <td className="py-3 px-2 font-mono text-xs text-slate-700">
                      {formatKz(preview?.calculated.precoVendaRecomendado || 0)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={adicionarItem}
          className="mt-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100"
        >
          <Plus size={16} /> Adicionar Produto
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Custos Adicionais da Fatura</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Transporte (Kz)</label>
            <input
              type="number"
              value={costoTransporte}
              onChange={(e) => setCostoTransporte(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Embalagem (Kz)</label>
            <input
              type="number"
              value={custoEmbalagem}
              onChange={(e) => setCustoEmbalagem(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Outros (Kz)</label>
            <input
              type="number"
              value={outrosCustos}
              onChange={(e) => setOutrosCustos(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Rateio por:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={distribuicaoModo === "quantidade"}
                  onChange={() => setDistribuicaoModo("quantidade")}
                />
                <span className="text-sm">Quantidade</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={distribuicaoModo === "custo"}
                  onChange={() => setDistribuicaoModo("custo")}
                />
                <span className="text-sm">Custo Total</span>
              </label>
            </div>
          </div>

          {categories.length === 0 && (
            <div className="w-full md:w-56">
              <label className="block text-xs font-medium text-slate-700 mb-1">Margem padrão (%)</label>
              <input
                type="number"
                value={margemDesejada}
                onChange={(e) => setMargemDesejada(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900 text-white rounded-lg p-4">
          <p className="text-xs text-slate-400">Investimento estimado</p>
          <p className="font-mono font-bold mt-1">{formatKz(resumo.investimento)}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg p-4">
          <p className="text-xs text-slate-400">Receita prevista</p>
          <p className="font-mono font-bold mt-1">{formatKz(resumo.receita)}</p>
        </div>
        <div className="bg-slate-900 text-white rounded-lg p-4">
          <p className="text-xs text-slate-400">Lucro previsto</p>
          <p className="font-mono font-bold mt-1">{formatKz(resumo.lucro)}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save size={16} /> {isSubmitting ? "Salvando..." : "Guardar Produtos"}
        </button>
      </div>
    </div>
  );
}
