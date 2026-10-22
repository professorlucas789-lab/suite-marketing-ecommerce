// @vitest-environment node
/**
 * Testes de integração dos serviços unificados contra o Firebase Emulator
 * (SDK modular real, transações reais).
 *
 * Só corre com o emulador ativo (variável FIRESTORE_EMULATOR_HOST definida):
 *   npx firebase emulators:exec --only firestore --project precocerto-test \
 *     "npx vitest run src/services/__tests__/unifiedServices.emulator"
 *
 * As Security Rules são testadas em src/__tests__/security (estes testes
 * usam regras abertas para isolar a lógica dos serviços).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

const emulador = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = 'precocerto-test-servicos';

vi.mock('../../firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const app = initializeApp({ projectId: 'precocerto-test-servicos' }, 'servicos-test');
  const db = getFirestore(app);
  if (host) {
    const [h, p] = host.split(':');
    connectFirestoreEmulator(db, h, Number(p));
  }
  return { db };
});

describe.skipIf(!emulador)('Serviços unificados (emulador)', () => {
  let db: any;
  let setDoc: any;
  let doc: any;
  let getDoc: any;
  let getDocs: any;
  let collection: any;
  let cancelUnifiedSale: any;
  let recordUnifiedSaleTransaction: any;
  let getUnifiedProductsForStore: any;
  let limparEmulador: () => Promise<void>;

  beforeAll(async () => {
    // Regras abertas só para este projeto de teste (o emulador aplicaria as
    // firestore.rules reais por omissão)
    const { initializeTestEnvironment } = await import('@firebase/rules-unit-testing');
    const [host, port] = (emulador as string).split(':');
    const testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: 'rules_version = "2"; service cloud.firestore { match /databases/{d}/documents { match /{x=**} { allow read, write: if true; } } }',
        host,
        port: Number(port),
      },
    });
    await testEnv.cleanup();

    ({ db } = await import('../../firebase'));
    ({ setDoc, doc, getDoc, getDocs, collection } = await import('firebase/firestore'));
    ({ cancelUnifiedSale, recordUnifiedSaleTransaction } = await import('../unifiedSalesService'));
    ({ getUnifiedProductsForStore } = await import('../unifiedProductService'));

    limparEmulador = async () => {
      await fetch(`http://${emulador}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
        method: 'DELETE',
      });
    };
  });

  beforeEach(async () => {
    await limparEmulador();
  });

  afterAll(async () => {
    if (emulador) await limparEmulador();
  });

  const venda = (id: string, extra: Record<string, unknown>) =>
    setDoc(doc(db, 'sales', id), {
      storeId: 'store_A',
      receiptNumber: 'R-1',
      productId: 'p1',
      quantity: 2,
      status: 'completed',
      ...extra,
    });

  const stock = (productId: string, storeId: string, quantidadeDisponível: number, quantidadeVendida = 0) =>
    setDoc(doc(db, 'products', productId, 'stock', storeId), { storeId, quantidadeDisponível, quantidadeVendida });

  const lerStock = async (productId: string, storeId = 'store_A') =>
    (await getDoc(doc(db, 'products', productId, 'stock', storeId))).data();

  describe('cancelUnifiedSale', () => {
    it('anula recibo com várias linhas e repõe o stock de cada produto', async () => {
      await stock('p1', 'store_A', 8, 2);
      await stock('p2', 'store_A', 5, 3);
      await venda('s1', { productId: 'p1', quantity: 2 });
      await venda('s2', { productId: 'p2', quantity: 3 });

      await cancelUnifiedSale('store_A', 'R-1', 'gerente_1');

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10, quantidadeVendida: 0 });
      expect(await lerStock('p2')).toMatchObject({ quantidadeDisponível: 8, quantidadeVendida: 0 });
      for (const id of ['s1', 's2']) {
        const v = (await getDoc(doc(db, 'sales', id))).data();
        expect(v).toMatchObject({ status: 'cancelled', cancelledBy: 'gerente_1' });
      }
    });

    it('soma as quantidades quando o mesmo produto tem várias linhas', async () => {
      await stock('p1', 'store_A', 4, 6);
      await venda('s1', { quantity: 2 });
      await venda('s2', { quantity: 4 });

      await cancelUnifiedSale('store_A', 'R-1', 'gerente_1');

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10, quantidadeVendida: 0 });
    });

    it('segunda anulação falha e não repõe o stock outra vez', async () => {
      await stock('p1', 'store_A', 8, 2);
      await venda('s1', {});

      await cancelUnifiedSale('store_A', 'R-1', 'gerente_1');
      await expect(cancelUnifiedSale('store_A', 'R-1', 'gerente_1')).rejects.toThrow('já foi anulado');

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10 });
    });

    it('anulações simultâneas só repõem o stock uma vez', async () => {
      await stock('p1', 'store_A', 8, 2);
      await venda('s1', {});

      const resultados = await Promise.allSettled([
        cancelUnifiedSale('store_A', 'R-1', 'a'),
        cancelUnifiedSale('store_A', 'R-1', 'b'),
      ]);

      expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10 });
    });

    it('não anula recibo de outra loja (mesmo número de recibo)', async () => {
      await stock('p1', 'store_B', 8, 2);
      await venda('sB', { storeId: 'store_B' });

      await expect(cancelUnifiedSale('store_A', 'R-1', 'gerente_1')).rejects.toThrow('Recibo não encontrado');

      expect(await lerStock('p1', 'store_B')).toMatchObject({ quantidadeDisponível: 8 });
      expect((await getDoc(doc(db, 'sales', 'sB'))).data()?.status).toBe('completed');
    });

    it('exige storeId', async () => {
      await expect(cancelUnifiedSale('', 'R-1', 'x')).rejects.toThrow('Loja obrigatória');
    });
  });

  describe('recordUnifiedSaleTransaction', () => {
    const produto = (id: string, extra: Record<string, unknown> = {}) =>
      setDoc(doc(db, 'products', id), { nome: `Produto ${id}`, categoria: 'Cat', storeId: 'store_A', userId: 'u1', custoCompra: 2, ...extra });

    const vendasDaLoja = async () => (await getDocs(collection(db, 'sales'))).docs.map((d: any) => d.data());
    const movimentos = async (productId: string) =>
      (await getDocs(collection(db, 'products', productId, 'stock', 'store_A', 'movements'))).docs.map((d: any) => d.data());

    it('venda simples: baixa o stock e acumula quantidadeVendida a partir do stock da loja', async () => {
      await produto('p1');
      await stock('p1', 'store_A', 10, 5);

      const recibo = await recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 3, unitPrice: 5 }]);

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 7, quantidadeVendida: 8 });
      const vendas = await vendasDaLoja();
      expect(vendas).toHaveLength(1);
      expect(vendas[0]).toMatchObject({ productId: 'p1', quantity: 3, stockBefore: 10, stockAfter: 7, status: 'completed' });
      const movs = await movimentos('p1');
      expect(movs).toHaveLength(1);
      expect(movs[0]).toMatchObject({ type: 'OUT', quantity: 3 });
      expect(recibo.subtotal).toBe(15);
    });

    it('várias vendas seguidas acumulam quantidadeVendida', async () => {
      await produto('p1');
      await stock('p1', 'store_A', 10, 0);

      await recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 2, unitPrice: 5 }]);
      await recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 3, unitPrice: 5 }]);

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 5, quantidadeVendida: 5 });
    });

    it('venda com vários produtos atualiza cada stock', async () => {
      await produto('p1');
      await produto('p2');
      await stock('p1', 'store_A', 10, 0);
      await stock('p2', 'store_A', 4, 1);

      const recibo = await recordUnifiedSaleTransaction('store_A', 'u1', [
        { productId: 'p1', quantity: 2, unitPrice: 5 },
        { productId: 'p2', quantity: 4, unitPrice: 3 },
      ]);

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 8, quantidadeVendida: 2 });
      expect(await lerStock('p2')).toMatchObject({ quantidadeDisponível: 0, quantidadeVendida: 5 });
      expect(recibo.items).toHaveLength(2);
      expect(recibo.subtotal).toBe(22);
    });

    it('duas linhas do mesmo produto: stock final correto e saldos encadeados', async () => {
      await produto('p1');
      await stock('p1', 'store_A', 10, 0);

      await recordUnifiedSaleTransaction('store_A', 'u1', [
        { productId: 'p1', quantity: 4, unitPrice: 5 },
        { productId: 'p1', quantity: 3, unitPrice: 5 },
      ]);

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 3, quantidadeVendida: 7 });
      const vendas = (await vendasDaLoja()).sort((a: any, b: any) => b.stockBefore - a.stockBefore);
      expect(vendas.map((v: any) => [v.stockBefore, v.stockAfter])).toEqual([[10, 6], [6, 3]]);
    });

    it('rejeita se a soma das linhas do mesmo produto excede o stock (sem escrever nada)', async () => {
      await produto('p1');
      await stock('p1', 'store_A', 5, 0);

      await expect(
        recordUnifiedSaleTransaction('store_A', 'u1', [
          { productId: 'p1', quantity: 3, unitPrice: 5 },
          { productId: 'p1', quantity: 3, unitPrice: 5 },
        ])
      ).rejects.toThrow('Stock insuficiente');

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 5, quantidadeVendida: 0 });
      expect(await vendasDaLoja()).toHaveLength(0);
    });

    it('rejeita se faltar stock num dos produtos e não altera os outros', async () => {
      await produto('p1');
      await produto('p2');
      await stock('p1', 'store_A', 10, 0);
      await stock('p2', 'store_A', 1, 0);

      await expect(
        recordUnifiedSaleTransaction('store_A', 'u1', [
          { productId: 'p1', quantity: 2, unitPrice: 5 },
          { productId: 'p2', quantity: 2, unitPrice: 5 },
        ])
      ).rejects.toThrow('Stock insuficiente');

      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10 });
      expect(await vendasDaLoja()).toHaveLength(0);
    });

    it('rejeita quantidade inválida (zero, negativa, NaN)', async () => {
      await produto('p1');
      await stock('p1', 'store_A', 10, 0);

      for (const quantity of [0, -2, NaN]) {
        await expect(
          recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity, unitPrice: 5 }])
        ).rejects.toThrow('Quantidade inválida');
      }
      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10 });
    });

    it('duas vendas simultâneas que juntas excedem o stock: só uma passa', async () => {
      await produto('p1');
      await stock('p1', 'store_A', 5, 0);

      const resultados = await Promise.allSettled([
        recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 3, unitPrice: 5 }]),
        recordUnifiedSaleTransaction('store_A', 'u2', [{ productId: 'p1', quantity: 3, unitPrice: 5 }]),
      ]);

      expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 2, quantidadeVendida: 3 });
    });

    it('rejeita produto inexistente e produto sem stock na loja', async () => {
      await produto('p1');
      await expect(
        recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'nao_existe', quantity: 1, unitPrice: 5 }])
      ).rejects.toThrow('Produto não encontrado');
      await expect(
        recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 1, unitPrice: 5 }])
      ).rejects.toThrow('Stock insuficiente');
    });
  });

  describe('getUnifiedProductsForStore', () => {
    beforeEach(async () => {
      for (const [id, storeId] of [['p1', 'store_A'], ['p2', 'store_A'], ['p3', 'store_A'], ['pB', 'store_B']]) {
        await setDoc(doc(db, 'products', id), { nome: id, storeId, userId: 'u' });
      }
      await stock('p1', 'store_A', 10);
      await stock('p2', 'store_A', 4);
    });

    it('devolve só os produtos da loja, com o stock de cada um', async () => {
      const resultado = await getUnifiedProductsForStore('store_A');

      expect(resultado.map((r: any) => r.product.id).sort()).toEqual(['p1', 'p2', 'p3']);
      const p1 = resultado.find((r: any) => r.product.id === 'p1');
      expect(p1.stock.quantidadeDisponível).toBe(10);
      // Produto sem entrada de stock na loja: stock a zero
      expect(resultado.find((r: any) => r.product.id === 'p3').stock.quantidadeDisponível).toBe(0);
    });

    it('não devolve produtos de outra loja', async () => {
      const resultado = await getUnifiedProductsForStore('store_B');
      expect(resultado.map((r: any) => r.product.id)).toEqual(['pB']);
    });

    it('respeita o limite', async () => {
      const resultado = await getUnifiedProductsForStore('store_A', 2);
      expect(resultado).toHaveLength(2);
    });
  });
});
