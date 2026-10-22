import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import {
  executeMigrationPhaseB,
  rollbackMigration,
} from '../migrationPhaseB';

/**
 * Firestore em memória, só com a superfície usada pela migração
 * (doc, collection, listDocuments, where, getAll, batch).
 */
class FirestoreFalso {
  dados = new Map<string, Record<string, unknown>>();
  tamanhosLotes: number[] = [];

  doc(caminho: string) {
    const id = caminho.split('/').pop() as string;
    return {
      id,
      path: caminho,
      collection: (nome: string) => this.collection(`${caminho}/${nome}`),
    };
  }

  collection(caminho: string) {
    const filhos = () =>
      [...this.dados.keys()].filter(
        k => k.startsWith(`${caminho}/`) && k.slice(caminho.length + 1).split('/').length === 1
      );
    const montar = (caminhos: string[]) => {
      const docs = caminhos.map(k => ({
        id: k.split('/').pop() as string,
        ref: this.doc(k),
        data: () => this.dados.get(k) as Record<string, unknown>,
      }));
      return { docs, empty: docs.length === 0, size: docs.length };
    };

    return {
      get: async () => montar(filhos()),
      listDocuments: async () => {
        const ids = new Set<string>();
        for (const k of this.dados.keys()) {
          if (k.startsWith(`${caminho}/`)) ids.add(k.slice(caminho.length + 1).split('/')[0]);
        }
        return [...ids].map(id => this.doc(`${caminho}/${id}`));
      },
      where: (campo: string, _op: string, valor: unknown) => ({
        get: async () => montar(filhos().filter(k => this.dados.get(k)?.[campo] === valor)),
      }),
    };
  }

  async getAll(...refs: { path: string }[]) {
    return refs.map(ref => ({
      ref,
      exists: this.dados.has(ref.path),
      data: () => this.dados.get(ref.path),
    }));
  }

  batch() {
    const operacoes: Array<() => void> = [];
    return {
      set: (ref: { path: string }, dados: Record<string, unknown>) => {
        if (Object.values(dados).some(v => v === undefined)) {
          throw new Error('Valor undefined não permitido');
        }
        operacoes.push(() => this.dados.set(ref.path, dados));
      },
      delete: (ref: { path: string }) => {
        operacoes.push(() => this.dados.delete(ref.path));
      },
      commit: async () => {
        this.tamanhosLotes.push(operacoes.length);
        operacoes.forEach(op => op());
      },
    };
  }

  semear(caminho: string, dados: Record<string, unknown>) {
    this.dados.set(caminho, dados);
  }
}

function criarCenario() {
  const fs = new FirestoreFalso();
  fs.semear('stores/s1', { nome: 'Loja 1' });
  fs.semear('stores/s2', { nome: 'Loja 2' });
  fs.semear('products/p1', { nome: 'Paracetamol', storeId: 's1' });
  fs.semear('products/p2', { nome: 'Ibuprofeno', storeId: 's1' });
  fs.semear('stores/s1/products/p1', { quantidadeDisponível: 50, quantidadeVendida: 10, lastMovementAt: 'T1' });
  fs.semear('stores/s1/products/p2', { quantidadeDisponível: 30 });
  fs.semear('stores/s2/products/p1', { quantidadeDisponível: 75, quantidadeVendida: 20 });
  return fs;
}

const comoDb = (fs: FirestoreFalso) => fs as unknown as Firestore;

describe('migrationPhaseB (Admin SDK)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('cria o stock novo por loja com os dados de origem', async () => {
    const fs = criarCenario();
    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.status).toBe('completed');
    expect(report.productsProcessed).toBe(2);
    expect(report.storesProcessed).toBe(2);
    expect(report.stockEntriesMigrated).toBe(3);

    expect(fs.dados.get('products/p1/stock/s1')).toMatchObject({
      storeId: 's1',
      quantidadeDisponível: 50,
      quantidadeVendida: 10,
      lastMovementAt: 'T1',
      migratedFrom: 'stores/s1/products/p1',
      migrationBackupId: report.backupId,
    });
    expect(fs.dados.get('products/p2/stock/s1')).toMatchObject({ quantidadeDisponível: 30, quantidadeVendida: 0 });
    expect(fs.dados.get('products/p1/stock/s2')).toMatchObject({ quantidadeDisponível: 75 });
  });

  it('não grava lastMovementAt quando a origem não o tem (Admin SDK rejeita undefined)', async () => {
    const fs = criarCenario();
    await executeMigrationPhaseB(comoDb(fs));

    expect(fs.dados.get('products/p2/stock/s1')).not.toHaveProperty('lastMovementAt');
  });

  it('cria backup antes de migrar e não altera a estrutura antiga', async () => {
    const fs = criarCenario();
    const antes = JSON.stringify([...fs.dados.entries()]);
    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(fs.dados.get(`products_backup/${report.backupId}_p1`)).toMatchObject({
      nome: 'Paracetamol',
      originalId: 'p1',
      backupId: report.backupId,
    });
    expect(fs.dados.get(`stores_products_backup/${report.backupId}_s1_p1`)).toMatchObject({
      storeId: 's1',
      productId: 'p1',
      quantidadeDisponível: 50,
    });

    const estruturaAntiga = [...fs.dados.entries()].filter(
      ([k]) => !k.includes('/stock/') && !k.includes('_backup/')
    );
    expect(JSON.stringify(estruturaAntiga)).toBe(antes);
  });

  it('dry-run não escreve nada', async () => {
    const fs = criarCenario();
    const tamanho = fs.dados.size;
    const report = await executeMigrationPhaseB(comoDb(fs), { dryRun: true });

    expect(report.status).toBe('completed');
    expect(report.dryRun).toBe(true);
    expect(report.stockEntriesMigrated).toBe(3);
    expect(fs.dados.size).toBe(tamanho);
    expect(fs.tamanhosLotes).toHaveLength(0);
  });

  it('não sobrescreve stock já existente e avisa quando difere da origem', async () => {
    const fs = criarCenario();
    fs.semear('products/p1/stock/s1', { storeId: 's1', quantidadeDisponível: 42 });

    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.stockEntriesSkipped).toBe(1);
    expect(report.stockEntriesMigrated).toBe(2);
    expect(fs.dados.get('products/p1/stock/s1')).toEqual({ storeId: 's1', quantidadeDisponível: 42 });
    expect(report.warnings.some(w => w.includes('products/p1/stock/s1') && w.includes('difere'))).toBe(true);
  });

  it('avisa quando um produto de loja não tem correspondente global', async () => {
    const fs = criarCenario();
    fs.semear('stores/s1/products/orfao', { quantidadeDisponível: 5 });

    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.warnings.some(w => w.includes('orfao'))).toBe(true);
    expect(fs.dados.has('products/orfao/stock/s1')).toBe(false);
  });

  it('avisa sobre lojas sem produtos e produtos sem stock', async () => {
    const fs = criarCenario();
    fs.semear('stores/s3', { nome: 'Loja vazia' });
    fs.semear('products/p3', { nome: 'Sem stock' });

    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.warnings.some(w => w.includes('Loja s3 sem nenhum produto'))).toBe(true);
    expect(report.warnings.some(w => w.includes('sem stock em nenhuma loja') && w.includes('p3'))).toBe(true);
  });

  it('divide as escritas em lotes abaixo do limite de 500 operações', async () => {
    const fs = new FirestoreFalso();
    fs.semear('stores/s1', {});
    for (let i = 0; i < 450; i++) {
      fs.semear(`products/p${i}`, { nome: `P${i}` });
      fs.semear(`stores/s1/products/p${i}`, { quantidadeDisponível: i });
    }

    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.status).toBe('completed');
    expect(report.stockEntriesMigrated).toBe(450);
    expect(Math.max(...fs.tamanhosLotes)).toBeLessThanOrEqual(400);
    expect(fs.tamanhosLotes.length).toBeGreaterThan(2);
  });

  it('avisa quando o stock está numa loja que não é a proprietária do produto (migra na mesma)', async () => {
    const fs = criarCenario(); // stores/s2/products/p1, mas p1 pertence a s1
    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.crossStoreStockEntries).toBe(1);
    expect(report.stockEntriesMigrated).toBe(3);
    expect(fs.dados.has('products/p1/stock/s2')).toBe(true);
    expect(
      report.warnings.some(w => w.includes('p1') && w.includes('pertence à loja s1') && w.includes('stock na loja s2'))
    ).toBe(true);
  });

  it('não conta como fora da loja o stock na loja proprietária', async () => {
    const fs = criarCenario();
    fs.dados.delete('stores/s2/products/p1');

    const report = await executeMigrationPhaseB(comoDb(fs));

    expect(report.crossStoreStockEntries).toBe(0);
    expect(report.warnings.some(w => w.includes('pertence à loja'))).toBe(false);
  });

  it('avisa uma só vez por produto sem storeId (proprietário)', async () => {
    const fs = criarCenario();
    fs.semear('products/p3', { nome: 'Sem loja' });
    fs.semear('products/p4', { nome: 'Sem loja 2' });

    const report = await executeMigrationPhaseB(comoDb(fs));

    const avisos = report.warnings.filter(w => w.includes('sem storeId'));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(/2 produto\(s\) sem storeId/);
    expect(avisos[0]).toMatch(/p3/);
  });

  describe('stock guardado no documento do produto (modelo antigo)', () => {
    it('cria o stock na loja proprietária a partir do documento do produto', async () => {
      const fs = criarCenario();
      fs.semear('products/pr1', { nome: 'Só no documento', storeId: 's1', quantidadeDisponivel: 12, quantidadeVendida: 4 });

      const report = await executeMigrationPhaseB(comoDb(fs));

      expect(fs.dados.get('products/pr1/stock/s1')).toMatchObject({
        storeId: 's1',
        quantidadeDisponível: 12,
        quantidadeVendida: 4,
        migratedFrom: 'products/pr1',
        migrationBackupId: report.backupId,
      });
      expect(report.stockEntriesFromProductDocument).toBe(1);
      expect(report.stockEntriesMigrated).toBe(4); // 3 de stores/*/products + 1 do documento
      expect(report.crossStoreStockEntries).toBe(1); // o caso de stores/s2/products/p1 do cenário
    });

    it('usa a mesma regra da app antiga: quantidadeDisponivel ?? quantidade ?? 0', async () => {
      const fs = new FirestoreFalso();
      fs.semear('stores/s1', {});
      fs.semear('products/a', { storeId: 's1', quantidade: 30 }); // só quantidade
      fs.semear('products/b', { storeId: 's1', quantidadeDisponivel: 0, quantidade: 30 }); // 0 é um valor válido
      fs.semear('products/c', { storeId: 's1', quantidadeDisponível: 7 }); // variante com acento
      fs.semear('products/d', { storeId: 's1', nome: 'sem campos de stock' });

      await executeMigrationPhaseB(comoDb(fs));

      expect(fs.dados.get('products/a/stock/s1')).toMatchObject({ quantidadeDisponível: 30, quantidadeVendida: 0 });
      expect(fs.dados.get('products/b/stock/s1')).toMatchObject({ quantidadeDisponível: 0 });
      expect(fs.dados.get('products/c/stock/s1')).toMatchObject({ quantidadeDisponível: 7 });
      // Sem campos de stock: entrada a 0, para o produto poder receber stock no modelo novo
      expect(fs.dados.get('products/d/stock/s1')).toMatchObject({ quantidadeDisponível: 0, quantidadeVendida: 0 });
    });

    it('a entrada em stores/{loja}/products tem prioridade sobre o documento do produto', async () => {
      const fs = criarCenario();
      fs.semear('products/p1', { nome: 'Paracetamol', storeId: 's1', quantidadeDisponivel: 999, quantidadeVendida: 999 });

      const report = await executeMigrationPhaseB(comoDb(fs));

      expect(fs.dados.get('products/p1/stock/s1')).toMatchObject({ quantidadeDisponível: 50, quantidadeVendida: 10 });
      expect(report.stockEntriesFromProductDocument).toBe(0);
    });

    it('produto sem storeId não migra stock e fica avisado', async () => {
      const fs = criarCenario();
      fs.semear('products/sl', { nome: 'Sem loja', quantidadeDisponivel: 9 });

      const report = await executeMigrationPhaseB(comoDb(fs));

      expect([...fs.dados.keys()].some(k => k.startsWith('products/sl/stock/'))).toBe(false);
      expect(report.warnings.some(w => w.includes('sem storeId') && w.includes('sl'))).toBe(true);
    });

    it('valores negativos ou inválidos viram 0 com aviso', async () => {
      const fs = new FirestoreFalso();
      fs.semear('stores/s1', {});
      fs.semear('products/neg', { storeId: 's1', quantidadeDisponivel: -5 });
      fs.semear('products/txt', { storeId: 's1', quantidadeDisponivel: 'abc' });
      fs.semear('products/str', { storeId: 's1', quantidadeDisponivel: '15' }); // número em texto: válido

      const report = await executeMigrationPhaseB(comoDb(fs));

      expect(fs.dados.get('products/neg/stock/s1')).toMatchObject({ quantidadeDisponível: 0 });
      expect(fs.dados.get('products/txt/stock/s1')).toMatchObject({ quantidadeDisponível: 0 });
      expect(fs.dados.get('products/str/stock/s1')).toMatchObject({ quantidadeDisponível: 15 });
      expect(report.warnings.some(w => w.includes('neg') && w.includes('negativo'))).toBe(true);
      expect(report.warnings.some(w => w.includes('txt') && w.includes('inválido'))).toBe(true);
      expect(report.warnings.some(w => w.includes('str'))).toBe(false);
    });

    it('não altera o documento do produto, é idempotente e o rollback remove só o stock criado', async () => {
      const fs = new FirestoreFalso();
      fs.semear('stores/s1', {});
      fs.semear('products/p', { storeId: 's1', quantidadeDisponivel: 8, quantidadeVendida: 2 });
      const antes = JSON.stringify(fs.dados.get('products/p'));

      const primeira = await executeMigrationPhaseB(comoDb(fs));
      expect(JSON.stringify(fs.dados.get('products/p'))).toBe(antes);

      const segunda = await executeMigrationPhaseB(comoDb(fs));
      expect(segunda.stockEntriesMigrated).toBe(0);
      expect(segunda.stockEntriesSkipped).toBe(1);
      expect(segunda.stockEntriesFromProductDocument).toBe(0);

      const resultado = await rollbackMigration(comoDb(fs), primeira.backupId);
      expect(resultado.stockRemoved).toBe(1);
      expect(fs.dados.has('products/p/stock/s1')).toBe(false);
      expect(JSON.stringify(fs.dados.get('products/p'))).toBe(antes);
    });

    it('dry-run calcula as entradas do documento sem escrever', async () => {
      const fs = new FirestoreFalso();
      fs.semear('stores/s1', {});
      fs.semear('products/p', { storeId: 's1', quantidadeDisponivel: 8 });
      const tamanho = fs.dados.size;

      const report = await executeMigrationPhaseB(comoDb(fs), { dryRun: true });

      expect(report.stockEntriesFromProductDocument).toBe(1);
      expect(fs.dados.size).toBe(tamanho);
    });

    it('cenário de produção: vários produtos só com stock no documento e nenhuma subcoleção', async () => {
      const fs = new FirestoreFalso();
      fs.semear('stores/s1', {});
      fs.semear('stores/s2', {});
      for (let i = 0; i < 52; i++) {
        fs.semear(`products/prod${i}`, { storeId: i % 2 === 0 ? 's1' : 's2', userId: 'u', quantidadeDisponivel: i, quantidadeVendida: i * 2 });
      }

      const report = await executeMigrationPhaseB(comoDb(fs));

      expect(report.status).toBe('completed');
      expect(report.stockEntriesMigrated).toBe(52);
      expect(report.stockEntriesFromProductDocument).toBe(52);
      expect(report.crossStoreStockEntries).toBe(0);
      expect(fs.dados.get('products/prod10/stock/s1')).toMatchObject({ quantidadeDisponível: 10, quantidadeVendida: 20 });
      expect(fs.dados.get('products/prod11/stock/s2')).toMatchObject({ quantidadeDisponível: 11, quantidadeVendida: 22 });
      expect(report.warnings).toEqual([]);
    });
  });

  it('segunda execução não duplica nem sobrescreve (idempotente)', async () => {
    const fs = criarCenario();
    await executeMigrationPhaseB(comoDb(fs));
    const segunda = await executeMigrationPhaseB(comoDb(fs));

    expect(segunda.stockEntriesMigrated).toBe(0);
    expect(segunda.stockEntriesSkipped).toBe(3);
  });
});

describe('rollbackMigration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('remove apenas o stock criado por essa migração', async () => {
    const fs = criarCenario();
    const report = await executeMigrationPhaseB(comoDb(fs));
    // Stock criado por outra via (ex.: venda posterior) não pode ser removido
    fs.semear('products/p2/stock/s2', { storeId: 's2', quantidadeDisponível: 9 });

    const resultado = await rollbackMigration(comoDb(fs), report.backupId);

    expect(resultado.stockRemoved).toBe(3);
    expect(fs.dados.has('products/p1/stock/s1')).toBe(false);
    expect(fs.dados.has('products/p1/stock/s2')).toBe(false);
    expect(fs.dados.has('products/p2/stock/s1')).toBe(false);
    expect(fs.dados.get('products/p2/stock/s2')).toEqual({ storeId: 's2', quantidadeDisponível: 9 });
  });

  it('repõe originais em falta sem sobrescrever os existentes', async () => {
    const fs = criarCenario();
    const report = await executeMigrationPhaseB(comoDb(fs));

    fs.dados.delete('products/p1');
    fs.dados.delete('stores/s1/products/p1');
    fs.dados.set('products/p2', { nome: 'Ibuprofeno EDITADO', storeId: 's1' });

    const resultado = await rollbackMigration(comoDb(fs), report.backupId);

    expect(resultado.productsRestored).toBe(1);
    expect(resultado.storeProductsRestored).toBe(1);
    expect(fs.dados.get('products/p1')).toEqual({ nome: 'Paracetamol', storeId: 's1' });
    expect(fs.dados.get('stores/s1/products/p1')).toMatchObject({ quantidadeDisponível: 50 });
    expect(fs.dados.get('stores/s1/products/p1')).not.toHaveProperty('backupId');
    expect(fs.dados.get('products/p2')).toEqual({ nome: 'Ibuprofeno EDITADO', storeId: 's1' });
  });

  it('dry-run não altera nada', async () => {
    const fs = criarCenario();
    const report = await executeMigrationPhaseB(comoDb(fs));
    const tamanho = fs.dados.size;

    const resultado = await rollbackMigration(comoDb(fs), report.backupId, { dryRun: true });

    expect(resultado.stockRemoved).toBe(3);
    expect(fs.dados.size).toBe(tamanho);
  });
});
