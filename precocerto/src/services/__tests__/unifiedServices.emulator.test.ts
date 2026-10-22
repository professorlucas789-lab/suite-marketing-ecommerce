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
  let createUnifiedProduct: any;
  let updateUnifiedProductStock: any;
  let archiveProductStock: any;
  let adjustProductStock: any;
  let transferProductStock: any;
  let recordPurchaseReceipt: any;
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
    ({ getUnifiedProductsForStore, createUnifiedProduct, updateUnifiedProductStock, archiveProductStock } =
      await import('../unifiedProductService'));
    ({ adjustProductStock, transferProductStock } = await import('../stockMovementService'));
    ({ recordPurchaseReceipt } = await import('../purchasingService'));

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

    it('guarda quem anulou e o motivo (o histórico mostra-os)', async () => {
      await stock('p1', 'store_A', 8, 2);
      await venda('s1', {});

      await cancelUnifiedSale('store_A', 'R-1', 'user_1', { cancelledByName: 'Maria Silva', reason: '  Venda em duplicado ' });

      const v = (await getDoc(doc(db, 'sales', 's1'))).data();
      expect(v).toMatchObject({
        status: 'cancelled',
        cancelledBy: 'user_1',
        cancelledByName: 'Maria Silva',
        cancellationReason: 'Venda em duplicado',
      });
    });

    it('sem opções, guarda nome e motivo vazios', async () => {
      await stock('p1', 'store_A', 8, 2);
      await venda('s1', {});

      await cancelUnifiedSale('store_A', 'R-1', 'user_1');

      expect((await getDoc(doc(db, 'sales', 's1'))).data()).toMatchObject({ cancelledByName: '', cancellationReason: '' });
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

  describe('modelo de propriedade (um produto pertence a uma loja)', () => {
    const dadosProduto = (extra: Record<string, unknown> = {}) => ({
      nome: 'Novo', categoria: 'Cat', quantidadeDisponível: 7, userId: 'u1', ...extra,
    });

    it('createUnifiedProduct cria o produto e o stock na loja indicada', async () => {
      const { productId } = await createUnifiedProduct('store_A', dadosProduto({ storeId: 'store_A' }));

      expect((await getDoc(doc(db, 'products', productId))).data()).toMatchObject({ storeId: 'store_A' });
      expect(await lerStock(productId)).toMatchObject({ storeId: 'store_A', quantidadeDisponível: 7 });
    });

    it('createUnifiedProduct preenche o storeId quando o produto não o traz', async () => {
      const { productId } = await createUnifiedProduct('store_A', dadosProduto());

      expect((await getDoc(doc(db, 'products', productId))).data()?.storeId).toBe('store_A');
    });

    it('createUnifiedProduct rejeita um produto de outra loja e não escreve nada', async () => {
      await expect(
        createUnifiedProduct('store_A', dadosProduto({ storeId: 'store_B' }))
      ).rejects.toThrow('pertence à loja store_B');

      expect((await getDocs(collection(db, 'products'))).size).toBe(0);
    });

    it('não vende na loja A um produto que pertence à loja B', async () => {
      await setDoc(doc(db, 'products', 'pB'), { nome: 'Da loja B', storeId: 'store_B', userId: 'u1' });
      await stock('pB', 'store_A', 10, 0);

      await expect(
        recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'pB', quantity: 1, unitPrice: 5 }])
      ).rejects.toThrow('pertence a outra loja');

      expect(await lerStock('pB')).toMatchObject({ quantidadeDisponível: 10 });
    });
  });

  describe('espelho de stock no documento do produto', () => {
    const produtoDoc = (id: string, extra: Record<string, unknown> = {}) =>
      setDoc(doc(db, 'products', id), { nome: `Produto ${id}`, categoria: 'Cat', storeId: 'store_A', userId: 'u1', custoCompra: 2, ...extra });
    const lerProduto = async (id: string) => (await getDoc(doc(db, 'products', id))).data();
    const contar = async (caminho: string) => (await getDocs(collection(db, caminho))).size;

    describe('venda e anulação', () => {
      it('a venda atualiza o stock da loja e o documento do produto, ao mesmo tempo', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, quantidadeVendida: 5 });
        await stock('p1', 'store_A', 10, 5);

        await recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 3, unitPrice: 5 }]);

        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 7, quantidadeVendida: 8 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 7, quantidadeVendida: 8 });
      });

      it('várias linhas do mesmo produto: o espelho fica com o valor final', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10 });
        await stock('p1', 'store_A', 10, 0);

        await recordUnifiedSaleTransaction('store_A', 'u1', [
          { productId: 'p1', quantity: 4, unitPrice: 5 },
          { productId: 'p1', quantity: 3, unitPrice: 5 },
        ]);

        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 3, quantidadeVendida: 7 });
      });

      it('produto só com stock no documento (sem entrada): vende a partir dele e cria a entrada', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, quantidadeVendida: 2 }); // como os 52 de produção

        await recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 4, unitPrice: 5 }]);

        expect(await lerStock('p1')).toMatchObject({ storeId: 'store_A', quantidadeDisponível: 6, quantidadeVendida: 6 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 6, quantidadeVendida: 6 });
      });

      it('sem entrada, também respeita o stock do documento (não vende a mais)', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 2 });

        await expect(
          recordUnifiedSaleTransaction('store_A', 'u1', [{ productId: 'p1', quantity: 3, unitPrice: 5 }])
        ).rejects.toThrow('Stock insuficiente');

        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 2 });
        expect(await lerStock('p1')).toBeUndefined();
      });

      it('a anulação repõe o stock da loja e o documento do produto', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 7, quantidadeVendida: 8 });
        await stock('p1', 'store_A', 7, 8);
        await venda('s1', { productId: 'p1', quantity: 3 });

        await cancelUnifiedSale('store_A', 'R-1', 'gerente_1');

        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10, quantidadeVendida: 5 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 10, quantidadeVendida: 5 });
      });

      it('anular uma venda antiga de um produto sem entrada de stock cria a entrada a partir do documento', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 7, quantidadeVendida: 8 });
        await venda('s1', { productId: 'p1', quantity: 3 });

        await cancelUnifiedSale('store_A', 'R-1', 'gerente_1');

        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 10, quantidadeVendida: 5 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 10, quantidadeVendida: 5 });
      });
    });

    describe('ajuste de stock (ecrã de gestão de stock)', () => {
      const ajuste = (extra: Record<string, unknown>) => ({
        productId: 'p1', storeId: 'store_A', adjustmentType: 'in', quantity: 5, reason: 'Contagem', userId: 'u1', ...extra,
      });

      it('entrada atualiza o stock, o espelho e regista o movimento', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, quantidadeVendida: 3 });
        await stock('p1', 'store_A', 10, 3);

        const movimento = await adjustProductStock(ajuste({ adjustmentType: 'in', quantity: 5 }));

        expect(movimento).toMatchObject({ stockBefore: 10, stockAfter: 15 });
        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 15, quantidadeVendida: 3 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 15, quantidadeVendida: 3 });
        expect((await getDoc(doc(db, 'stockMovements', movimento.id))).data()).toMatchObject({ movementType: 'in', quantity: 5 });
      });

      it('saída e correção funcionam; saída acima do stock é rejeitada sem escrever nada', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10 });
        await stock('p1', 'store_A', 10, 0);

        await adjustProductStock(ajuste({ adjustmentType: 'out', quantity: 4 }));
        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 6 });

        await adjustProductStock(ajuste({ adjustmentType: 'correction', quantity: 20 }));
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 20 });

        await expect(adjustProductStock(ajuste({ adjustmentType: 'out', quantity: 99 }))).rejects.toThrow('Stock insuficiente');
        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 20 });
        expect(await contar('stockMovements')).toBe(2);
      });

      it('produto só com stock no documento: ajusta a partir dele e cria a entrada', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10 });

        await adjustProductStock(ajuste({ adjustmentType: 'in', quantity: 5 }));

        expect(await lerStock('p1')).toMatchObject({ storeId: 'store_A', quantidadeDisponível: 15 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 15 });
      });

      it('recusa um produto de outra loja', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, storeId: 'store_B' });

        await expect(adjustProductStock(ajuste({}))).rejects.toThrow('não pertence à unidade atual');
      });
    });

    describe('transferência entre lojas', () => {
      const transferencia = (extra: Record<string, unknown> = {}) => ({
        productId: 'p1', sourceStoreId: 'store_A', destinationStoreId: 'store_B', quantity: 4, reason: 'Reposição',
        userId: 'admin_1', ...extra,
      });

      it('baixa a origem e cria um produto novo na loja de destino com o seu stock e espelho', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, quantidadeVendida: 2 });
        await stock('p1', 'store_A', 10, 2);

        const r = await transferProductStock(transferencia());

        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 6, quantidadeVendida: 2 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 6 });

        expect(await lerProduto(r.destinationProductId)).toMatchObject({
          storeId: 'store_B', userId: 'admin_1', quantidadeDisponivel: 4, quantidadeVendida: 0, transferSourceProductId: 'p1',
        });
        expect(await lerStock(r.destinationProductId, 'store_B')).toMatchObject({
          storeId: 'store_B', quantidadeDisponível: 4, quantidadeVendida: 0,
        });
        expect(await contar('stockMovements')).toBe(2);
      });

      it('stock insuficiente, mesma loja e produto de outra loja são rejeitados sem escrever nada', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 3 });
        await stock('p1', 'store_A', 3, 0);

        await expect(transferProductStock(transferencia())).rejects.toThrow('Stock insuficiente');
        await expect(transferProductStock(transferencia({ destinationStoreId: 'store_A' }))).rejects.toThrow('diferente da origem');
        await expect(transferProductStock(transferencia({ sourceStoreId: 'store_X' }))).rejects.toThrow('não pertence à unidade de origem');

        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 3 });
        expect((await getDocs(collection(db, 'products'))).size).toBe(1);
        expect(await contar('stockMovements')).toBe(0);
      });
    });

    describe('compras', () => {
      const compra = (linhas: Array<Record<string, unknown>>) => ({
        storeId: 'store_A', userId: 'u1', supplierId: 'forn1', invoiceNumber: 'F-1', invoiceDate: '2026-10-22',
        paymentStatus: 'pending', lines: linhas,
      });

      beforeEach(async () => {
        await setDoc(doc(db, 'suppliers', 'forn1'), { name: 'Fornecedor 1', storeId: 'store_A', status: 'active', currentPayable: 0 });
      });

      it('a compra aumenta o stock da loja e o espelho, e guarda os custos', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, quantidadeVendida: 4, custoCompra: 2, quantidade: 10 });
        await stock('p1', 'store_A', 10, 4);

        const recibo = await recordPurchaseReceipt(compra([{ productId: 'p1', quantity: 5, unitCost: 4 }]));

        expect(recibo.lines[0]).toMatchObject({ stockBefore: 10, stockAfter: 15 });
        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 15, quantidadeVendida: 4 });
        expect(await lerProduto('p1')).toMatchObject({
          quantidadeDisponivel: 15, quantidadeVendida: 4, quantidade: 15, fornecedor: 'Fornecedor 1', numeroFatura: 'F-1',
        });
      });

      it('o mesmo produto em duas linhas: saldos encadeados e um só valor final', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10 });
        await stock('p1', 'store_A', 10, 0);

        const recibo = await recordPurchaseReceipt(compra([
          { productId: 'p1', quantity: 5, unitCost: 4 },
          { productId: 'p1', quantity: 3, unitCost: 4 },
        ]));

        expect(recibo.lines.map((l: any) => [l.stockBefore, l.stockAfter])).toEqual([[10, 15], [15, 18]]);
        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 18 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 18 });
      });

      it('produto só com stock no documento: soma ao valor do documento e cria a entrada', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10 });

        await recordPurchaseReceipt(compra([{ productId: 'p1', quantity: 5, unitCost: 4 }]));

        expect(await lerStock('p1')).toMatchObject({ storeId: 'store_A', quantidadeDisponível: 15 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 15 });
      });
    });

    describe('atualizar, arquivar e criar', () => {
      it('updateUnifiedProductStock atualiza o stock e o espelho, mantém o vendido e rejeita negativos', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10, quantidadeVendida: 4 });
        await stock('p1', 'store_A', 10, 4);

        await updateUnifiedProductStock('p1', 'store_A', 25);

        expect(await lerStock('p1')).toMatchObject({ quantidadeDisponível: 25, quantidadeVendida: 4 });
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 25, quantidadeVendida: 4 });

        await expect(updateUnifiedProductStock('p1', 'store_A', -1)).rejects.toThrow('negativo');
        await expect(updateUnifiedProductStock('nao_existe', 'store_A', 1)).rejects.toThrow('não encontrado');
      });

      it('archiveProductStock arquiva a entrada, apaga-a e põe o espelho a zero', async () => {
        await produtoDoc('p1', { quantidadeDisponivel: 10 });
        await stock('p1', 'store_A', 10, 3);

        await archiveProductStock('p1', 'store_A');

        expect(await lerStock('p1')).toBeUndefined();
        expect(await lerProduto('p1')).toMatchObject({ quantidadeDisponivel: 0 });
        const arquivo = await getDocs(collection(db, 'products', 'p1', 'stock_archive'));
        expect(arquivo.size).toBe(1);
        expect(arquivo.docs[0].data()).toMatchObject({ storeId: 'store_A', quantidadeDisponível: 10 });
      });

      it('createUnifiedProduct escreve o espelho no documento do produto', async () => {
        const { productId } = await createUnifiedProduct('store_A', {
          nome: 'Novo', categoria: 'Cat', userId: 'u1', storeId: 'store_A', quantidadeDisponível: 7,
        });

        expect(await lerProduto(productId)).toMatchObject({ quantidadeDisponivel: 7, quantidadeVendida: 0 });
        expect(await lerStock(productId)).toMatchObject({ quantidadeDisponível: 7 });
      });
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
