import React, { useEffect, useState, useMemo } from "react";
import { Product, BusinessSettings } from "../types";
import { formatKz, getPriceHealth } from "../utils";
import { getUniqueProductCategories } from "../utils/categorySelection";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Trash2,
  Edit3,
  Plus,
  ArrowUpDown,
  ChevronDown,
  FileText,
  AlertTriangle,
  Activity,
  Award,
  Copy,
  X // NOVO (Fase 5A Item 3 - Search enhancement)
} from "lucide-react";
import ProductDetailsModal from "./ProductDetailsModal";
import { SearchHighlight } from "./SearchHighlight"; // NOVO (Fase 5A Item 3)

interface ProductListProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onDuplicateProduct: (product: Product) => void;
  settings?: BusinessSettings | null;
  canManageProducts?: boolean;
}

type SortField = "nome" | "custoTotal" | "precoVendaRecomendado" | "lucroEstimado" | "margemReal" | "createdAt" | "roi";
type SortOrder = "asc" | "desc";

export default function ProductList({
  products,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onDuplicateProduct,
  settings,
  canManageProducts = true,
}: ProductListProps) {
  const [search, setSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // State for showing the simulator modal
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const categoryOptions = useMemo(() => getUniqueProductCategories(products), [products]);

  useEffect(() => {
    if (selectedCategory !== "all" && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categoryOptions, selectedCategory]);

  // Helper to get simple, professional packaging summary
  const getPackagingSummary = (product: Product) => {
    const qty = product.quantidade && product.quantidade > 0 ? product.quantidade : 1;
    const compra = `${qty} ${product.unidadeCompra || "unidade(s)"}`;
    const total = `${product.totalUnidadesVendaveis || qty} ${product.unidadeVenda || "unidade(s)"}`;
    
    if (product.venderEmbalagemInteira === false) {
      const conteudo = `${product.unidadesInternas || 1} ${product.unidadeVenda || "unidade(s)"} por ${product.unidadeCompra || "embalagem"}`;
      return {
        compra,
        conteudo,
        venda: `por ${product.unidadeVenda || "unidade"}`,
        totalVendivel: total
      };
    }
    
    return {
      compra,
      conteudo: null,
      venda: `por ${product.unidadeVenda || "unidade"}`,
      totalVendivel: total
    };
  };

  // Helper to get alerts for the active module
  const getProductAlerts = (product: Product) => {
    const alerts: { label: string; type: "error" | "warning" | "info" }[] = [];
    const today = new Date();

    // Farmácia alerts
    if (product.tipoProduto === "medicamento/farmácia" || product.farmaciaDataValidade) {
      if (product.farmaciaDataValidade) {
        const expiry = new Date(product.farmaciaDataValidade + "T23:59:59");
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          alerts.push({ label: "VENCIDO!", type: "error" });
        } else if (diffDays <= 90) {
          alerts.push({ label: `Expira em ${diffDays} dias`, type: "warning" });
        }
      }
      if (product.farmaciaNecessitaReceita === "sim") {
        alerts.push({ label: "Necessita Receita", type: "info" });
      }
    }

    // Cosméticos alerts
    if (product.validadeCosmetico) {
      const expiry = new Date(product.validadeCosmetico + "T23:59:59");
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        alerts.push({ label: "Vencido!", type: "error" });
      } else if (diffDays <= 90) {
        alerts.push({ label: `Validade: ${diffDays} dias`, type: "warning" });
      }
    }

    // Outros general warnings
    if (product.prazoGarantia !== undefined && product.prazoGarantia > 0) {
      alerts.push({ label: `Garantia: ${product.prazoGarantia} meses`, type: "info" });
    }

    if (product.quantidadeMinima !== undefined && product.quantidadeMinima > 100) {
      alerts.push({ label: `MOQ Alto (${product.quantidadeMinima} un.)`, type: "warning" });
    }

    return alerts;
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Helper function to calculate total cost for old/new models
  const calculateTotalCost = (p: Product) => {
    const q = p.quantidade && p.quantidade > 0 ? p.quantidade : 1;
    const baseUnitCost = ((p.custoCompra || 0) + 
      (p.custoTransporte || 0) + 
      (p.custoEmbalagem || 0) + 
      (p.outrosCustos || 0)) / q;

    const variablesAndFixedUnit = (p.comissaoVenda || 0) + 
      (p.taxaBancaria || 0) + 
      (p.taxaMarketplace || 0) + 
      (p.custoPublicidade || 0) + 
      (p.custoEntrega || 0) + 
      (p.combustivel || 0) + 
      (p.impostoTaxa || 0) + 
      (p.perdasDesperdicios || 0) + 
 
      (p.energia || 0) + 
      (p.internet || 0) + 
      (p.renda || 0) + 
      (p.salario || 0) + 
      (p.agua || 0) + 
      (p.contabilidade || 0) + 
      (p.seguranca || 0) + 
      (p.outrosCustosFixos || 0);

    return baseUnitCost + variablesAndFixedUnit;
  };

  // Filter and Search
  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch = 
          p.nome.toLowerCase().includes(search.toLowerCase()) ||
          p.fornecedor.toLowerCase().includes(search.toLowerCase());
        
        const matchesCategory = selectedCategory === "all" || p.categoria === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        let valueA: any = a[sortField];
        let valueB: any = b[sortField];

        if (sortField === "custoTotal") {
          valueA = calculateTotalCost(a);
          valueB = calculateTotalCost(b);
        }

        if (sortField === "createdAt") {
          valueA = new Date(a.createdAt || 0).getTime();
          valueB = new Date(b.createdAt || 0).getTime();
        }

        if (sortField === "roi") {
          valueA = a.roi || 0;
          valueB = b.roi || 0;
        }

        if (typeof valueA === "string") {
          return sortOrder === "asc" 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        }

        return sortOrder === "asc" 
          ? (valueA || 0) - (valueB || 0) 
          : (valueB || 0) - (valueA || 0);
      });
  }, [products, search, selectedCategory, sortField, sortOrder]);

  return (
    <div id="product-list-container" className="space-y-6">
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Produtos Cadastrados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-sans">Visualize, ordene e simule preços para cada um dos seus produtos.</p>
        </div>
        {canManageProducts && (
          <button
            id="list-add-product-button"
            onClick={onAddProduct}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={18} />
            <span>Cadastrar Novo</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
              <Search size={18} />
            </span>
            <input
              id="product-search-input"
              type="text"
              placeholder="Pesquisar por nome do produto ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-slate-800 dark:text-slate-100"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                title="Limpar pesquisa"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative md:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              <Filter size={16} />
            </span>
            <select
              id="product-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all text-slate-800 dark:text-slate-100 appearance-none cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 dark:text-slate-500">
              <ChevronDown size={16} />
            </span>
          </div>
        </div>

        {/* NOVO (Fase 5A Item 3): Results counter and filters info */}
        {(search || selectedCategory !== "all") && (
          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>
              {filteredAndSortedProducts.length} de {products.length} produtos
              {search && ` encontrados para "${search}"`}
              {selectedCategory !== "all" && ` em "${selectedCategory}"`}
            </span>
            {(search || selectedCategory !== "all") && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main content list */}
      {filteredAndSortedProducts.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort("nome")}>
                      <div className="flex items-center gap-1">
                        <span>Produto / Fornecedor</span>
                        <ArrowUpDown size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                    <th className="py-4 px-4">Categoria</th>
                    <th className="py-4 px-4">Resumo da Embalagem</th>
                    <th className="py-4 px-4">Stock</th>
                    <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort("custoTotal")}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Custo por Unidade</span>
                        <ArrowUpDown size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                    <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort("precoVendaRecomendado")}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Preço de Venda</span>
                        <ArrowUpDown size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                    <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort("lucroEstimado")}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Lucro (Un. / Lote)</span>
                        <ArrowUpDown size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                    <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort("margemReal")}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Margem Real</span>
                        <ArrowUpDown size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                    <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort("roi")}>
                      <div className="flex items-center justify-end gap-1">
                        <span>ROI %</span>
                        <ArrowUpDown size={12} className="text-slate-400 dark:text-slate-500" />
                      </div>
                    </th>
                    <th className="py-4 px-4 text-center">Saúde</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredAndSortedProducts.map((product) => {
                    const totalCost = calculateTotalCost(product);
                    const health = getPriceHealth(product.lucroEstimado, product.margemReal);
                    const qComprada = product.quantidade && product.quantidade > 0 ? product.quantidade : 1;
                    const qDisponivel = product.quantidadeDisponivel !== undefined ? product.quantidadeDisponivel : qComprada;
                    const qVendida = product.quantidadeVendida !== undefined ? product.quantidadeVendida : 0;

                    const custoPorUnidadeVenda = product.custoRealUnidadeVenda !== undefined 
                      ? product.custoRealUnidadeVenda 
                      : totalCost;

                    const precoRecomendado = product.venderEmbalagemInteira === false && product.precoRecomendadoUnidadeVenda !== undefined
                      ? product.precoRecomendadoUnidadeVenda
                      : product.precoVendaRecomendado;

                    const lucroPorUnidade = product.venderEmbalagemInteira === false && product.lucroUnidadeVenda !== undefined
                      ? product.lucroUnidadeVenda
                      : product.lucroEstimado;

                    const lucroTotalEsperado = product.lucroTotalEsperado !== undefined
                      ? product.lucroTotalEsperado
                      : (product.lucroEstimado * qComprada);

                    const summary = getPackagingSummary(product);
                    const alerts = getProductAlerts(product);

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all border-b border-slate-100 dark:border-slate-800/50">
                        {/* Produto / Fornecedor */}
                        <td className="py-4 px-6 min-w-[200px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <SearchHighlight text={product.nome} search={search} className="font-semibold text-slate-800 dark:text-slate-100" />
                            {product.tipoProduto === "medicamento/farmácia" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                Medicamento
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Fornecedor: <span className="font-medium text-slate-600 dark:text-slate-300">{product.fornecedor || "Não especificado"}</span>
                          </div>
                          
                          {/* Alerts */}
                          {alerts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {alerts.map((al, idx) => {
                                const bgStyle = 
                                  al.type === "error" ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30" :
                                  al.type === "warning" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" :
                                  "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30";
                                return (
                                  <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${bgStyle} whitespace-nowrap`}>
                                    <AlertTriangle size={10} /> {al.label}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md inline-block">
                            {product.categoria || "Outros"}
                          </span>
                        </td>

                        {/* Resumo da Embalagem */}
                        <td className="py-4 px-4 min-w-[190px]">
                          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-400 dark:text-slate-500 font-sans">Compra:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{summary.compra}</span>
                            </div>
                            {summary.conteudo && (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-400 dark:text-slate-500 font-sans">Conteúdo:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{summary.conteudo}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-400 dark:text-slate-500 font-sans">Venda:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{summary.venda}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 font-bold text-emerald-600 dark:text-emerald-450 border-t border-slate-100 dark:border-slate-800/60 pt-1 mt-1">
                              <span className="text-slate-400 dark:text-slate-500 font-sans font-normal">Total vendável:</span>
                              <span className="underline decoration-dotted decoration-emerald-550/30">{summary.totalVendivel}</span>
                            </div>
                          </div>
                        </td>

                        {/* Stock */}
                        <td className="py-4 px-4 min-w-[130px]">
                          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-400 dark:text-slate-500 font-sans">Comp:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{qComprada}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                              <span className="text-slate-400 dark:text-slate-500 font-sans">Disp:</span>
                              <span className="font-bold">{qDisponivel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-indigo-600 dark:text-indigo-400">
                              <span className="text-slate-400 dark:text-slate-500 font-sans">Vend:</span>
                              <span className="font-bold">{qVendida}</span>
                            </div>
                          </div>
                        </td>

                        {/* Custo por unidade de venda */}
                        <td className="py-4 px-4 text-right font-mono text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">
                          {formatKz(custoPorUnidadeVenda)}
                        </td>

                        {/* Preço de venda */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {formatKz(precoRecomendado)}
                        </td>

                        {/* Lucro */}
                        <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap">
                          <div className="font-bold text-emerald-600 dark:text-emerald-450">+{formatKz(lucroPorUnidade)}</div>
                          {qComprada > 1 && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Lote: +{formatKz(lucroTotalEsperado)}</div>
                          )}
                        </td>

                        {/* Margem */}
                        <td className="py-4 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {product.margemReal.toFixed(1)}%
                        </td>

                        {/* ROI */}
                        <td className="py-4 px-4 text-right font-mono font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {(product.roi || 0).toFixed(1)}%
                        </td>

                        {/* Saúde */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.bgClass}`}>
                            {health.label}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`view-details-${product.id}`}
                              onClick={() => setViewingProduct(product)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Ver Detalhes"
                            >
                              <FileText size={16} />
                            </button>
                            {canManageProducts && (
                              <>
                                <button
                                  id={`edit-product-${product.id}`}
                                  onClick={() => onEditProduct(product)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                  title="Editar Produto"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  id={`duplicate-product-${product.id}`}
                                  onClick={() => onDuplicateProduct(product)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                  title="Duplicar Produto"
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  id={`delete-product-${product.id}`}
                                  onClick={() => setDeleteConfirmId(product.id || null)}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Excluir Produto"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="lg:hidden space-y-4">
            {filteredAndSortedProducts.map((product) => {
              const totalCost = calculateTotalCost(product);
              const health = getPriceHealth(product.lucroEstimado, product.margemReal);
              const qComprada = product.quantidade && product.quantidade > 0 ? product.quantidade : 1;
              const qDisponivel = product.quantidadeDisponivel !== undefined ? product.quantidadeDisponivel : qComprada;
              const qVendida = product.quantidadeVendida !== undefined ? product.quantidadeVendida : 0;

              const precoRecomendado = product.venderEmbalagemInteira === false && product.precoRecomendadoUnidadeVenda !== undefined
                ? product.precoRecomendadoUnidadeVenda
                : product.precoVendaRecomendado;

              const lucroPorUnidade = product.venderEmbalagemInteira === false && product.lucroUnidadeVenda !== undefined
                ? product.lucroUnidadeVenda
                : product.lucroEstimado;

              const lucroTotalEsperado = product.lucroTotalEsperado !== undefined
                ? product.lucroTotalEsperado
                : (product.lucroEstimado * qComprada);

              const alerts = getProductAlerts(product);

              return (
                <div 
                  key={product.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center flex-wrap gap-1.5">
                        <SearchHighlight text={product.nome} search={search} className="text-inherit" />
                        {product.tipoProduto === "medicamento/farmácia" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            Medicamento
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fornecedor: {product.fornecedor || "Não especificado"}</p>
                      
                      {/* Alerts for mobile */}
                      {alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {alerts.map((al, idx) => {
                            const bgStyle = 
                              al.type === "error" ? "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30" :
                              al.type === "warning" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" :
                              "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30";
                            return (
                              <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${bgStyle}`}>
                                <AlertTriangle size={10} /> {al.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                      {product.categoria || "Outros"}
                    </span>
                  </div>

                  {/* Calculations breakdown for mobile */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Stock:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Comp: {qComprada} | Disp: {qDisponivel} | Vend: {qVendida}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Preço Recomendado:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{formatKz(precoRecomendado)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Lucro por Unidade:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatKz(lucroPorUnidade)}</span>
                    </div>
                    {qComprada > 1 && (
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                        <span>Lucro Total Lote:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatKz(lucroTotalEsperado)}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer stats and actions */}
                  <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex justify-between items-center">
                      <span className={`border px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${health.bgClass}`}>
                        <span>Margem: {product.margemReal.toFixed(1)}%</span>
                        <span className="text-[10px] opacity-75">({health.label})</span>
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      <button
                        id={`view-details-mobile-${product.id}`}
                        onClick={() => setViewingProduct(product)}
                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                        title="Ver Detalhes"
                      >
                        <FileText size={14} />
                        <span>Ver Detalhes</span>
                      </button>
                      {canManageProducts && (
                        <>
                          <button
                            id={`edit-product-mobile-${product.id}`}
                            onClick={() => onEditProduct(product)}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 size={14} />
                            <span>Editar</span>
                          </button>
                          <button
                            id={`duplicate-product-mobile-${product.id}`}
                            onClick={() => onDuplicateProduct(product)}
                            className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                            title="Duplicar"
                          >
                            <Copy size={14} />
                            <span>Duplicar</span>
                          </button>
                          <button
                            id={`delete-product-mobile-${product.id}`}
                            onClick={() => setDeleteConfirmId(product.id || null)}
                            className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer"
                            title="Apagar"
                          >
                            <Trash2 size={14} />
                            <span>Apagar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div id="no-search-results-state" className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum produto corresponde aos critérios de pesquisa.</p>
          <button 
            id="clear-filters-button"
            onClick={() => { setSearch(""); setSelectedCategory("all"); }}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold underline mt-2 cursor-pointer"
          >
            Limpar Filtros e Pesquisa
          </button>
        </div>
      )}

      {/* View Product Details & Simulator Modal */}
      <AnimatePresence>
        {viewingProduct && (
          <ProductDetailsModal
            product={viewingProduct}
            onClose={() => setViewingProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div id="delete-modal-overlay" className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              id="delete-modal-box"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-800 shadow-xl space-y-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Apagar Produto?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-sans">
                    Esta ação é permanente e apagará permanentemente este produto e todos os cálculos associados a ele.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="cancel-delete-btn"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="confirm-delete-btn"
                  onClick={() => {
                    if (deleteConfirmId) {
                      onDeleteProduct(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  Apagar Produto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
