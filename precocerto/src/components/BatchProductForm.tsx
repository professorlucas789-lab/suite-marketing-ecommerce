import React, { useState } from "react";
import { Product, BusinessSettings } from "../types";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { calculateProductFields } from "../utils/pricing";

interface BatchProductItem {
  id: string;
  nome: string;
  categoria: string;
  quantidade: string;
  custoCompra: string;
  unidadeCompra: string;
}

interface BatchProductFormProps {
  onSave: (products: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">[]) => Promise<void>;
  onCancel: () => void;
  settings?: BusinessSettings | null;
}

export default function BatchProductForm({
  onSave,
  onCancel,
  settings,
}: BatchProductFormProps) {
  const [items, setItems] = useState<BatchProductItem[]>([
    { id: "1", nome: "", categoria: "", quantidade: "1", custoCompra: "", unidadeCompra: "unidade" },
  ]);

  const [costoTransporte, setCostoTransporte] = useState<string>("0");
  const [custoEmbalagem, setCustoEmbalagem] = useState<string>("0");
  const [outrosCustos, setOutrosCustos] = useState<string>("0");
  const [distribuicaoModo, setDistribuicaoModo] = useState<"quantidade" | "custo">("quantidade");
  const [margemDesejada, setMargemDesejada] = useState<string>("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adicionarItem = () => {
    const novoId = (Math.max(...items.map(i => parseInt(i.id) || 0), 0) + 1).toString();
    setItems([
      ...items,
      { id: novoId, nome: "", categoria: "", quantidade: "1", custoCompra: "", unidadeCompra: "unidade" },
    ]);
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

  const calcularCustosAdicionais = () => {
    const totalQtd = items.reduce((sum, item) => sum + (parseFloat(item.quantidade) || 0), 0);
    const totalCusto = items.reduce((sum, item) => sum + (parseFloat(item.custoCompra) || 0) * (parseFloat(item.quantidade) || 0), 0);

    const custos = {
      transporte: parseFloat(costoTransporte) || 0,
      embalagem: parseFloat(custoEmbalagem) || 0,
      outros: parseFloat(outrosCustos) || 0,
    };

    const totalCustosAdicionais = custos.transporte + custos.embalagem + custos.outros;

    return items.map(item => {
      const qtd = parseFloat(item.quantidade) || 0;
      const custoBase = (parseFloat(item.custoCompra) || 0) * qtd;

      let custoAdicionalDistribuido = 0;

      if (distribuicaoModo === "quantidade" && totalQtd > 0) {
        custoAdicionalDistribuido = (qtd / totalQtd) * totalCustosAdicionais;
      } else if (distribuicaoModo === "custo" && totalCusto > 0) {
        custoAdicionalDistribuido = (custoBase / totalCusto) * totalCustosAdicionais;
      }

      const custoTotal = custoBase + custoAdicionalDistribuido;
      const custoPorUnidade = custoTotal / qtd;

      return {
        nome: item.nome,
        categoria: item.categoria,
        quantidade: qtd,
        custoCompra: custoPorUnidade,
        margemDesejada: parseFloat(margemDesejada) || 30,
        custoAdicionalRateado: custoAdicionalDistribuido,
      };
    });
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      const custosAdicionais = calcularCustosAdicionais();

      const productsToSave: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">[] = custosAdicionais.map(
        (item, idx) => {
          // Distribuir custos adicionais em 3 partes iguais
          const custoTransporteUnit = item.custoAdicionalRateado / 3;
          const custoEmbalagemUnit = item.custoAdicionalRateado / 3;
          const outrosCustosUnit = item.custoAdicionalRateado / 3;

          const calculated = calculateProductFields({
            custoCompra: item.custoCompra,
            custoTransporte: custoTransporteUnit,
            custoEmbalagem: custoEmbalagemUnit,
            outrosCustos: outrosCustosUnit,
            margemDesejada: item.margemDesejada,
          });

          return {
            nome: item.nome,
            categoria: item.categoria,
            quantidade: item.quantidade,
            custoCompra: item.custoCompra,
            custoTransporte: custoTransporteUnit,
            custoEmbalagem: custoEmbalagemUnit,
            outrosCustos: outrosCustosUnit,
            margemDesejada: item.margemDesejada,
            precoVendaRecomendado: calculated.precoVendaRecomendado,
            tipoProduto: settings?.businessType || "outro",
            unidadeCompra: items[idx].unidadeCompra,
            unidadeVenda: "unidade",
            unidadesInternas: 1,
            venderEmbalagemInteira: false,
          };
        }
      );

      await onSave(productsToSave);
    } catch (error) {
      console.error("Erro ao salvar produtos em lote:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">📦 Cadastro em Lote</h1>
          <p className="text-xs text-slate-500">Adicione múltiplos produtos de uma compra/fatura</p>
        </div>
      </div>

      {/* Produtos */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Produtos</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2">Nome</th>
                <th className="text-left py-2 px-2">Categoria</th>
                <th className="text-left py-2 px-2">Qtd</th>
                <th className="text-left py-2 px-2">Unidade</th>
                <th className="text-left py-2 px-2">Custo Unit.</th>
                <th className="text-center py-2 px-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
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
                    <input
                      type="text"
                      value={item.categoria}
                      onChange={(e) => atualizarItem(item.id, "categoria", e.target.value)}
                      placeholder="Ex: Medicamentos"
                      className="w-full px-2 py-1 border rounded text-xs"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(item.id, "quantidade", e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs"
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
                      <option value="lâmina">Lâmina</option>
                      <option value="blister">Blister</option>
                      <option value="frasco">Frasco</option>
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      value={item.custoCompra}
                      onChange={(e) => atualizarItem(item.id, "custoCompra", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 border rounded text-xs"
                    />
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
              ))}
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

      {/* Custos Adicionais */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">💰 Custos Adicionais da Fatura</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
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
      </div>

      {/* Margem Desejada */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <label className="block text-sm font-bold text-slate-800 mb-2">Margem Desejada (%)</label>
        <input
          type="number"
          value={margemDesejada}
          onChange={(e) => setMargemDesejada(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {/* Ações */}
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
