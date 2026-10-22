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
    ({ cancelUnifiedSale } = await import('../unifiedSalesService'));
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
