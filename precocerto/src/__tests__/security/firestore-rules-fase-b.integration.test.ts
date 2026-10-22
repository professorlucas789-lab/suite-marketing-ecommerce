/**
 * FASE B — TESTES DAS FIRESTORE RULES (estrutura unificada de produtos)
 *
 * Cobre as regras de products/{id}/stock/{storeId}, movements, stock_archive,
 * sales (coleção raiz) e as coleções de backup da migração.
 *
 * EXECUTA contra o Firebase Local Emulator com firestore.rules REAL:
 *   npx firebase emulators:exec --only firestore --project precocerto-test \
 *     "npx vitest run src/__tests__/security/firestore-rules-fase-b"
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

const utilizadores: Record<string, { papel: string; lojas: string[]; ativo: boolean }> = {
  admin_1: { papel: 'admin', lojas: ['store_A', 'store_B'], ativo: true },
  manager_A: { papel: 'loja-manager', lojas: ['store_A'], ativo: true },
  func_A: { papel: 'funcionario', lojas: ['store_A'], ativo: true },
  func_A2: { papel: 'funcionario', lojas: ['store_A'], ativo: true },
  func_B: { papel: 'funcionario', lojas: ['store_B'], ativo: true },
  inativo_A: { papel: 'funcionario', lojas: ['store_A'], ativo: false },
};

const db = (uid: string) => testEnv.authenticatedContext(uid).firestore();

function stockValido(storeId: string, quantidade = 10) {
  return {
    storeId,
    quantidadeDisponível: quantidade,
    quantidadeVendida: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function vendaValida(storeId: string, userId: string, extra: Record<string, unknown> = {}) {
  return {
    storeId,
    userId,
    receiptNumber: 'R-1',
    productId: 'prod_1',
    quantity: 1,
    status: 'completed',
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

// Só corre com o emulador ativo (npm run test:rules); sem ele fica "skipped"
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('FASE B — Firestore Rules', () => {
  beforeAll(async () => {
    const rulesPath = path.join(__dirname, '../../..', 'firestore.rules');
    testEnv = await initializeTestEnvironment({
      projectId: 'precocerto-test-faseb',
      firestore: {
        rules: fs.readFileSync(rulesPath, 'utf-8'),
        host: 'localhost',
        port: 8080,
      },
    });

    await testEnv.withSecurityRulesDisabled(async context => {
      const admin = context.firestore();

      for (const [uid, dados] of Object.entries(utilizadores)) {
        await admin.collection('users').doc(uid).set({ id: uid, nome: uid, ...dados });
      }

      for (const n of [1, 2, 3]) {
        await admin.collection('products').doc(`prod_${n}`).set({
          nome: `Produto ${n}`,
          storeId: 'store_A',
          userId: 'manager_A',
        });
        await admin.doc(`products/prod_${n}/stock/store_A`).set(stockValido('store_A', 10));
      }
      await admin.doc('products/prod_1/stock/store_B').set(stockValido('store_B', 7));
      await admin.doc('products/prod_1/stock/store_A/movements/mov_1').set({
        type: 'IN', quantity: 1, reason: 'seed', userId: 'manager_A',
      });
      await admin.doc('sales/sale_A').set(vendaValida('store_A', 'func_A'));
      await admin.doc('sales/sale_B').set(vendaValida('store_B', 'func_B'));
      await admin.doc('products_backup/backup_x').set({ nome: 'x' });
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('products/{id}/stock/{storeId}', () => {
    it('membro da loja lê o stock da sua loja', async () => {
      await assertSucceeds(db('func_A').doc('products/prod_1/stock/store_A').get());
    });

    it('NÃO lê o stock de outra loja (isolamento entre lojas)', async () => {
      await assertFails(db('func_A').doc('products/prod_1/stock/store_B').get());
      await assertFails(db('func_B').doc('products/prod_1/stock/store_A').get());
    });

    it('anónimo e utilizador inativo não leem', async () => {
      await assertFails(testEnv.unauthenticatedContext().firestore().doc('products/prod_1/stock/store_A').get());
      await assertFails(db('inativo_A').doc('products/prod_1/stock/store_A').get());
    });

    it('membro cria stock da sua loja, de um produto dessa loja, com storeId igual ao do caminho', async () => {
      await testEnv.withSecurityRulesDisabled(async c => {
        await c.firestore().doc('products/prod_novo').set({ nome: 'Novo', storeId: 'store_A', userId: 'manager_A' });
      });
      await assertSucceeds(
        db('func_A').doc('products/prod_novo/stock/store_A').set(stockValido('store_A', 5))
      );
    });

    it('NÃO cria stock numa loja para um produto que pertence a outra loja (modelo de propriedade)', async () => {
      // admin_1 é membro de A e B: seria permitido sem a regra de propriedade
      await assertFails(
        db('admin_1').doc('products/prod_2/stock/store_B').set(stockValido('store_B', 5))
      );
    });

    it('NÃO cria stock para produto inexistente nem para produto sem storeId', async () => {
      await assertFails(db('func_A').doc('products/nao_existe/stock/store_A').set(stockValido('store_A', 5)));
      await testEnv.withSecurityRulesDisabled(async c => {
        await c.firestore().doc('products/prod_sem_loja').set({ nome: 'Sem loja' });
      });
      await assertFails(db('func_A').doc('products/prod_sem_loja/stock/store_A').set(stockValido('store_A', 5)));
    });

    it('NÃO cria stock com storeId diferente do caminho, em outra loja ou com quantidade inválida', async () => {
      await assertFails(db('func_A').doc('products/prod_x/stock/store_A').set(stockValido('store_B')));
      await assertFails(db('func_A').doc('products/prod_x/stock/store_B').set(stockValido('store_B')));
      await assertFails(db('func_A').doc('products/prod_x/stock/store_A').set(stockValido('store_A', -1)));
      await assertFails(
        db('func_A').doc('products/prod_x/stock/store_A').set({ ...stockValido('store_A'), quantidadeDisponível: '5' })
      );
    });

    it('membro atualiza stock (venda) mas não pode ficar negativo nem mudar de loja', async () => {
      const ref = db('func_A').doc('products/prod_1/stock/store_A');
      await assertSucceeds(ref.update({ quantidadeDisponível: 9 }));
      await assertFails(ref.update({ quantidadeDisponível: -1 }));
      await assertFails(ref.update({ storeId: 'store_B' }));
    });

    it('membro de outra loja NÃO atualiza', async () => {
      await assertFails(db('func_B').doc('products/prod_1/stock/store_A').update({ quantidadeDisponível: 0 }));
    });

    it('apagar: gerente e admin podem, funcionário e outra loja não', async () => {
      await assertFails(db('func_A').doc('products/prod_2/stock/store_A').delete());
      await assertFails(db('func_B').doc('products/prod_2/stock/store_A').delete());
      await assertSucceeds(db('manager_A').doc('products/prod_2/stock/store_A').delete());
      await assertSucceeds(db('admin_1').doc('products/prod_3/stock/store_A').delete());
    });
  });

  describe('movements e stock_archive', () => {
    it('movimento: cria em nome próprio; em nome de outro ou outra loja falha', async () => {
      const col = db('func_A').collection('products/prod_1/stock/store_A/movements');
      await assertSucceeds(col.add({ type: 'OUT', quantity: 1, reason: 'Venda', userId: 'func_A' }));
      await assertFails(col.add({ type: 'OUT', quantity: 1, reason: 'Venda', userId: 'manager_A' }));
      await assertFails(
        db('func_B').collection('products/prod_1/stock/store_A/movements')
          .add({ type: 'OUT', quantity: 1, reason: 'x', userId: 'func_B' })
      );
    });

    it('movimento é imutável (nem admin altera ou apaga) e só membros leem', async () => {
      await assertFails(db('admin_1').doc('products/prod_1/stock/store_A/movements/mov_1').update({ quantity: 99 }));
      await assertFails(db('admin_1').doc('products/prod_1/stock/store_A/movements/mov_1').delete());
      await assertSucceeds(db('func_A').doc('products/prod_1/stock/store_A/movements/mov_1').get());
      await assertFails(db('func_B').doc('products/prod_1/stock/store_A/movements/mov_1').get());
    });

    it('stock_archive: gerente cria; funcionário não; imutável', async () => {
      const arquivo = { ...stockValido('store_A'), archivedAt: new Date().toISOString() };
      await assertSucceeds(db('manager_A').collection('products/prod_1/stock_archive').add(arquivo));
      await assertFails(db('func_A').collection('products/prod_1/stock_archive').add(arquivo));
      await assertFails(db('manager_A').collection('products/prod_1/stock_archive').add({ ...arquivo, storeId: 'store_B' }));

      await testEnv.withSecurityRulesDisabled(async c => {
        await c.firestore().doc('products/prod_1/stock_archive/a1').set(arquivo);
      });
      await assertSucceeds(db('func_A').doc('products/prod_1/stock_archive/a1').get());
      await assertFails(db('admin_1').doc('products/prod_1/stock_archive/a1').update({ archivedAt: 'x' }));
      await assertFails(db('admin_1').doc('products/prod_1/stock_archive/a1').delete());
    });
  });

  describe('products (listagem da loja)', () => {
    it('consulta com filtro storeId da sua loja passa (getUnifiedProductsForStore)', async () => {
      await assertSucceeds(db('func_A').collection('products').where('storeId', '==', 'store_A').limit(10).get());
    });

    it('consulta sem filtro ou de outra loja falha', async () => {
      await assertFails(db('func_A').collection('products').get());
      await assertFails(db('func_A').collection('products').where('storeId', '==', 'store_B').get());
    });
  });

  describe('sales (coleção raiz)', () => {
    it('cria venda da sua loja em seu nome', async () => {
      await assertSucceeds(db('func_A').collection('sales').add(vendaValida('store_A', 'func_A')));
    });

    it('NÃO cria venda em nome de outro nem noutra loja', async () => {
      await assertFails(db('func_A').collection('sales').add(vendaValida('store_A', 'func_A2')));
      await assertFails(db('func_A').collection('sales').add(vendaValida('store_B', 'func_A')));
    });

    it('lê com filtro por storeId da sua loja; outra loja e consulta sem filtro falham', async () => {
      await assertSucceeds(db('func_A').collection('sales').where('storeId', '==', 'store_A').get());
      await assertFails(db('func_A').collection('sales').where('storeId', '==', 'store_B').get());
      await assertFails(db('func_A').collection('sales').get());
      await assertFails(db('func_A').collection('sales').where('receiptNumber', '==', 'R-1').get());
    });

    it('consulta de anulação (storeId + receiptNumber) passa; só receiptNumber falha', async () => {
      // Forma exata usada por cancelUnifiedSale
      await assertSucceeds(
        db('func_A').collection('sales').where('storeId', '==', 'store_A').where('receiptNumber', '==', 'R-1').get()
      );
      await assertFails(
        db('func_B').collection('sales').where('storeId', '==', 'store_A').where('receiptNumber', '==', 'R-1').get()
      );
    });

    it('anular: autor e admin podem; colega da loja não; storeId/userId imutáveis', async () => {
      await testEnv.withSecurityRulesDisabled(async c => {
        for (const id of ['an1', 'an2', 'an3']) {
          await c.firestore().doc(`sales/${id}`).set(vendaValida('store_A', 'func_A'));
        }
      });
      const anular = { status: 'cancelled', cancelledBy: 'x' };
      await assertSucceeds(db('func_A').doc('sales/an1').update(anular));
      await assertSucceeds(db('admin_1').doc('sales/an2').update(anular));
      await assertFails(db('func_A2').doc('sales/an3').update(anular));
      await assertFails(db('func_A').doc('sales/an3').update({ storeId: 'store_B' }));
      await assertFails(db('func_A').doc('sales/an3').update({ userId: 'func_A2' }));
    });

    it('apagar: só admin', async () => {
      await assertFails(db('func_A').doc('sales/sale_A').delete());
      await assertSucceeds(db('admin_1').doc('sales/sale_A').delete());
    });
  });

  describe('backups da migração', () => {
    it('nenhum cliente (nem admin) lê ou escreve', async () => {
      await assertFails(db('admin_1').doc('products_backup/backup_x').get());
      await assertFails(db('admin_1').doc('products_backup/backup_y').set({ a: 1 }));
      await assertFails(db('admin_1').doc('stores_products_backup/b').set({ a: 1 }));
    });
  });

  describe('fluxo real: venda em transação (limite de get() das regras)', () => {
    it('venda de 3 produtos numa única transação passa', async () => {
      // Repõe stock (os testes anteriores apagaram prod_2 e prod_3)
      await testEnv.withSecurityRulesDisabled(async c => {
        for (const n of [1, 2, 3]) {
          await c.firestore().doc(`products/prod_${n}/stock/store_A`).set(stockValido('store_A', 10));
        }
      });

      const firestore = db('func_A');
      await assertSucceeds(
        firestore.runTransaction(async txn => {
          const leituras = [];
          for (const n of [1, 2, 3]) {
            await txn.get(firestore.doc(`products/prod_${n}`));
            leituras.push(await txn.get(firestore.doc(`products/prod_${n}/stock/store_A`)));
          }
          leituras.forEach((snap, i) => {
            const n = i + 1;
            txn.update(snap.ref, { quantidadeDisponível: 9, lastUpdated: 'agora' });
            txn.set(firestore.collection('sales').doc(), vendaValida('store_A', 'func_A', { productId: `prod_${n}` }));
            txn.set(firestore.collection(`products/prod_${n}/stock/store_A/movements`).doc(), {
              type: 'OUT', quantity: 1, reason: 'Venda R-9', userId: 'func_A',
            });
          });
        })
      );

      let quantidade: unknown;
      await testEnv.withSecurityRulesDisabled(async c => {
        const snap = await c.firestore().doc('products/prod_3/stock/store_A').get();
        quantidade = snap.data()?.quantidadeDisponível;
      });
      expect(quantidade).toBe(9);
    });

    it('createUnifiedProduct: batch produto + stock passa', async () => {
      const firestore = db('manager_A');
      const batch = firestore.batch();
      batch.set(firestore.doc('products/prod_batch'), { nome: 'Novo', storeId: 'store_A', userId: 'manager_A' });
      batch.set(firestore.doc('products/prod_batch/stock/store_A'), stockValido('store_A', 4));
      await assertSucceeds(batch.commit());
    });
  });
});
