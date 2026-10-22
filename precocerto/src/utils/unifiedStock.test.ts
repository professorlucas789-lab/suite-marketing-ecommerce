import { describe, it, expect } from 'vitest';
import { lerStockAtual, aplicarEscritaStock } from './unifiedStock';

describe('lerStockAtual', () => {
  it('usa a entrada de stock quando existe, ignorando o documento do produto', () => {
    const r = lerStockAtual(
      { quantidadeDisponivel: 99, quantidadeVendida: 99 },
      { quantidadeDisponível: 7, quantidadeVendida: 3 }
    );
    expect(r).toEqual({ disponivel: 7, vendida: 3, existe: true });
  });

  it('sem entrada, usa o documento com a regra da app antiga (quantidadeDisponivel ?? quantidade ?? 0)', () => {
    expect(lerStockAtual({ quantidadeDisponivel: 5, quantidade: 30 }, null)).toMatchObject({ disponivel: 5, existe: false });
    expect(lerStockAtual({ quantidade: 30 }, undefined)).toMatchObject({ disponivel: 30 });
    expect(lerStockAtual({ quantidadeDisponivel: 0, quantidade: 30 }, null)).toMatchObject({ disponivel: 0 });
    expect(lerStockAtual({ quantidadeDisponível: 8 }, null)).toMatchObject({ disponivel: 8 });
    expect(lerStockAtual({}, null)).toEqual({ disponivel: 0, vendida: 0, existe: false });
    expect(lerStockAtual(undefined, null)).toEqual({ disponivel: 0, vendida: 0, existe: false });
  });

  it('valores negativos, inválidos ou em texto: negativos e inválidos valem 0; texto numérico é aceite', () => {
    expect(lerStockAtual({ quantidadeDisponivel: -4 }, null).disponivel).toBe(0);
    expect(lerStockAtual({ quantidadeDisponivel: 'abc' }, null).disponivel).toBe(0);
    expect(lerStockAtual({ quantidadeDisponivel: '15' }, null).disponivel).toBe(15);
    expect(lerStockAtual(null, { quantidadeDisponível: -1, quantidadeVendida: NaN }).disponivel).toBe(0);
  });
});

describe('aplicarEscritaStock', () => {
  const refStock = { path: 'products/p/stock/s' } as any;
  const refProduto = { path: 'products/p' } as any;

  function escritorFalso() {
    const chamadas: Array<{ op: 'set' | 'update'; path: string; dados: any }> = [];
    return {
      chamadas,
      set: (ref: any, dados: any) => chamadas.push({ op: 'set', path: ref.path, dados }),
      update: (ref: any, dados: any) => chamadas.push({ op: 'update', path: ref.path, dados }),
    };
  }

  const base = { productRef: refProduto, stockRef: refStock, storeId: 's', disponivel: 6, vendida: 4, timestamp: 'T' };

  it('entrada existente: update do stock e do espelho no produto', () => {
    const e = escritorFalso();
    aplicarEscritaStock(e, { ...base, produto: { storeId: 's' }, existiaStock: true, extraStock: { lastMovementAt: 'T' } });

    expect(e.chamadas).toEqual([
      { op: 'update', path: 'products/p/stock/s', dados: { storeId: 's', quantidadeDisponível: 6, quantidadeVendida: 4, lastUpdated: 'T', lastMovementAt: 'T' } },
      { op: 'update', path: 'products/p', dados: { quantidadeDisponivel: 6, quantidadeVendida: 4, updatedAt: 'T', dataAtualizacao: 'T' } },
    ]);
  });

  it('sem entrada: cria-a (set) e espelha', () => {
    const e = escritorFalso();
    aplicarEscritaStock(e, { ...base, produto: { storeId: 's' }, existiaStock: false });

    expect(e.chamadas[0]).toMatchObject({ op: 'set', path: 'products/p/stock/s' });
    expect(e.chamadas[1]).toMatchObject({ op: 'update', path: 'products/p' });
  });

  it('não espelha quando a loja não é a proprietária do produto', () => {
    const e = escritorFalso();
    aplicarEscritaStock(e, { ...base, produto: { storeId: 'outra' }, existiaStock: true });

    expect(e.chamadas).toHaveLength(1);
    expect(e.chamadas[0].path).toBe('products/p/stock/s');
  });

  it('produto apagado: só escreve a entrada de stock', () => {
    const e = escritorFalso();
    aplicarEscritaStock(e, { ...base, produto: undefined, existiaStock: true });

    expect(e.chamadas).toHaveLength(1);
  });

  it('campos extra do produto (ex.: custos de uma compra) vão junto com o espelho', () => {
    const e = escritorFalso();
    aplicarEscritaStock(e, { ...base, produto: { storeId: 's' }, existiaStock: true, extraProduto: { custoCompra: 9 } });

    expect(e.chamadas[1].dados).toMatchObject({ quantidadeDisponivel: 6, custoCompra: 9 });
  });

  it('com loja diferente mas campos extra: aplica só os campos extra, sem espelhar o stock', () => {
    const e = escritorFalso();
    aplicarEscritaStock(e, { ...base, produto: { storeId: 'outra' }, existiaStock: true, extraProduto: { custoCompra: 9 } });

    expect(e.chamadas[1].dados).toMatchObject({ custoCompra: 9 });
    expect(e.chamadas[1].dados).not.toHaveProperty('quantidadeDisponivel');
  });
});
