/**
 * Stock unificado — leitura e escrita partilhadas (FASE B)
 *
 * Fonte de verdade: products/{id}/stock/{storeId}.
 * Espelho: o documento do produto (quantidadeDisponivel / quantidadeVendida) é
 * atualizado NA MESMA transação ou batch. Como um produto pertence a uma só loja
 * (Product.storeId), o espelho é sempre igual ao stock da loja proprietária.
 * Assim, os ecrãs e serviços que ainda leem o stock do documento do produto
 * (Dashboard, detalhes, alertas, estatísticas, exportações) ficam corretos.
 *
 * Produtos ainda sem entrada de stock (criados por importação ou antes da
 * migração) usam o valor do documento como ponto de partida e a entrada de stock
 * é criada na primeira escrita.
 */

import type { DocumentReference } from 'firebase/firestore';

/** Subconjunto comum a Transaction e WriteBatch */
export interface EscritorFirestore {
  set: (ref: DocumentReference<any>, data: any) => unknown;
  update: (ref: DocumentReference<any>, data: any) => unknown;
}

export interface StockLido {
  disponivel: number;
  vendida: number;
  /** false quando a entrada products/{id}/stock/{loja} ainda não existe */
  existe: boolean;
}

function numeroNaoNegativo(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Stock atual de um produto numa loja: a entrada de stock, se existir; senão o
 * documento do produto, com a regra da app antiga (quantidadeDisponivel ?? quantidade ?? 0).
 */
export function lerStockAtual(
  produto: Record<string, any> | undefined | null,
  stock: Record<string, any> | undefined | null
): StockLido {
  if (stock) {
    return {
      disponivel: numeroNaoNegativo(stock.quantidadeDisponível),
      vendida: numeroNaoNegativo(stock.quantidadeVendida),
      existe: true,
    };
  }

  const dados = produto ?? {};
  return {
    disponivel: numeroNaoNegativo(dados.quantidadeDisponivel ?? dados.quantidadeDisponível ?? dados.quantidade),
    vendida: numeroNaoNegativo(dados.quantidadeVendida),
    existe: false,
  };
}

export interface EscritaStock {
  productRef: DocumentReference<any>;
  stockRef: DocumentReference<any>;
  /** Dados atuais do produto; undefined se o documento não existe */
  produto?: Record<string, any> | null;
  storeId: string;
  existiaStock: boolean;
  disponivel: number;
  vendida: number;
  timestamp: string;
  /** Campos extra na entrada de stock (ex.: lastMovementAt) */
  extraStock?: Record<string, unknown>;
  /** Campos extra no documento do produto (ex.: custos numa compra) */
  extraProduto?: Record<string, unknown>;
}

/**
 * Escreve o stock da loja e o espelho no documento do produto.
 * Chamar DEPOIS de todas as leituras da transação.
 */
export function aplicarEscritaStock(escritor: EscritorFirestore, e: EscritaStock): void {
  const dadosStock = {
    storeId: e.storeId,
    quantidadeDisponível: e.disponivel,
    quantidadeVendida: e.vendida,
    lastUpdated: e.timestamp,
    ...e.extraStock,
  };

  if (e.existiaStock) {
    escritor.update(e.stockRef, dadosStock);
  } else {
    escritor.set(e.stockRef, dadosStock);
  }

  if (!e.produto) return; // produto apagado: só existe a entrada de stock

  // O espelho só vale para a loja proprietária (um produto sem loja é tratado como dela)
  const espelhar = !e.produto.storeId || e.produto.storeId === e.storeId;

  if (espelhar) {
    escritor.update(e.productRef, {
      quantidadeDisponivel: e.disponivel,
      quantidadeVendida: e.vendida,
      updatedAt: e.timestamp,
      dataAtualizacao: e.timestamp,
      ...e.extraProduto,
    });
  } else if (e.extraProduto) {
    escritor.update(e.productRef, { ...e.extraProduto, updatedAt: e.timestamp, dataAtualizacao: e.timestamp });
  }
}
