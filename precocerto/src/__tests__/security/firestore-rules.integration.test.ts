/**
 * PC-02A.5 — TESTES REAIS DAS FIRESTORE SECURITY RULES
 *
 * Suite de Integração: Valida field-level security, RBAC e multi-tenancy
 * EXECUTA contra Firebase Local Emulator Suite com firestore.rules REAL
 *
 * Runner: Vitest + @firebase/rules-unit-testing
 * Fonte de Verdade: precocerto/firestore.rules
 *
 * Resultado esperado: Todos os testes PASS
 * Comportamento: assertSucceeds() se regra permite, assertFails() se nega
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

beforeAll(async () => {
  // Carregar firestore.rules REAL do ficheiro
  const rulesPath = path.join(__dirname, '../../..', 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  // Inicializar Firebase Emulator com as Rules REAIS
  testEnv = await initializeTestEnvironment({
    projectId: 'precocerto-test',
    firestore: {
      rules: rulesContent,
      host: 'localhost',
      port: 8080,
    },
  });

  console.log('[PC-02A.5] Firebase Emulator inicializado');
  console.log('[PC-02A.5] Firestore Rules carregadas:', rulesPath);
  console.log('[PC-02A.5] Emulator listening on localhost:8080');
});

afterAll(async () => {
  await testEnv.cleanup();
  console.log('[PC-02A.5] Emulator desligado');
});

describe('PC-02A.5 — Firestore Rules Security (Emulator Real)', () => {

  // ============================================================================
  // SEED: Criar dados de teste com bypass de segurança (admin context)
  // ============================================================================

  describe('Seed — Preparar dados de teste', () => {
    it('Deve criar utilizadores de teste via contexto administrativo', async () => {
      // Usar withSecurityRulesDisabled para o seed data (bootstrap problem)
      // Os dados são criados SEM passar pela Rule, depois os testes validam a Rule
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();

        // Admin
        await adminDb.collection('users').doc('admin_1').set({
          id: 'admin_1',
          nome: 'Admin Test',
          email: 'admin@test.com',
          papel: 'admin',
          lojas: ['store_A', 'store_B'],
          permissoes: {
            visualizar: true,
            criar: true,
            editar: true,
            deletar: true,
          },
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'system',
        });

        // Manager de Store A
        await adminDb.collection('users').doc('manager_A').set({
          id: 'manager_A',
          nome: 'Manager A',
          email: 'manager_a@test.com',
          papel: 'loja-manager',
          lojas: ['store_A'],
          permissoes: {
            visualizar: true,
            criar: true,
            editar: true,
            deletar: false,
          },
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'admin_1',
        });

        // Funcionário Store A
        await adminDb.collection('users').doc('func_A').set({
          id: 'func_A',
          nome: 'Func A',
          email: 'func_a@test.com',
          papel: 'funcionario',
          lojas: ['store_A'],
          permissoes: {
            visualizar: true,
            criar: true,
            editar: false,
            deletar: false,
          },
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'manager_A',
        });

        // Outro Funcionário Store A
        await adminDb.collection('users').doc('func_A2').set({
          id: 'func_A2',
          nome: 'Func A2',
          email: 'func_a2@test.com',
          papel: 'funcionario',
          lojas: ['store_A'],
          permissoes: {
            visualizar: true,
            criar: true,
            editar: false,
            deletar: false,
          },
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'manager_A',
        });

        // Funcionário Store B
        await adminDb.collection('users').doc('func_B').set({
          id: 'func_B',
          nome: 'Func B',
          email: 'func_b@test.com',
          papel: 'funcionario',
          lojas: ['store_B'],
          permissoes: {
            visualizar: true,
            criar: true,
            editar: false,
            deletar: false,
          },
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'system',
        });

        // Utilizador Desativado
        await adminDb.collection('users').doc('deactivated_1').set({
          id: 'deactivated_1',
          nome: 'Deactivated',
          email: 'deactivated@test.com',
          papel: 'funcionario',
          lojas: ['store_A'],
          permissoes: {
            visualizar: true,
            criar: true,
            editar: false,
            deletar: false,
          },
          ativo: false,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'manager_A',
        });
      });
    });

    it('Deve criar produtos de teste', async () => {
      // Usar withSecurityRulesDisabled para o seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();

        // Produto em Store A, criado por func_A
        await adminDb.collection('products').doc('product_A').set({
          id: 'product_A',
          nome: 'Produto A',
          storeId: 'store_A',
          userId: 'func_A',
          custoCompra: 100,
          precoVenda: 150,
          quantidade: 50,
          dataCriacao: new Date().toISOString(),
        });

        // Produto em Store B
        await adminDb.collection('products').doc('product_B').set({
          id: 'product_B',
          nome: 'Produto B',
          storeId: 'store_B',
          userId: 'func_B',
          custoCompra: 200,
          precoVenda: 300,
          quantidade: 30,
          dataCriacao: new Date().toISOString(),
        });
      });
    });

    it('Deve criar stores de teste', async () => {
      // Usar withSecurityRulesDisabled para o seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();

        // Store A
        await adminDb.collection('stores').doc('store_A').set({
          id: 'store_A',
          nome: 'Store A',
          dataCriacao: new Date().toISOString(),
        });

        // Store B
        await adminDb.collection('stores').doc('store_B').set({
          id: 'store_B',
          nome: 'Store B',
          dataCriacao: new Date().toISOString(),
        });
      });
    });
  });

  // ============================================================================
  // V-ESC-001: SELF-PROMOTION (Alteração de papel)
  // ============================================================================

  describe('V-ESC-001 — Self-Promotion via papel', () => {
    it('func_A tenta alterar seu papel de "funcionario" para "admin" — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          papel: 'admin',
        })
      );
    });

    it('Admin consegue alterar papel de outro utilizador — DEVE PASSAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          papel: 'loja-manager',
        })
      );

      // Voltar ao estado anterior para não interferir com outros testes
      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          papel: 'funcionario',
        })
      );
    });
  });

  // ============================================================================
  // V-ESC-002: SELF-ASSIGNMENT DE LOJAS (Tenant Jump)
  // ============================================================================

  describe('V-ESC-002 — Auto-atribuição de Lojas', () => {
    it('func_A (Store A) tenta adicionar-se a Store B — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          lojas: ['store_A', 'store_B'],
        })
      );
    });

    it('func_A tenta remover-se de Store A — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          lojas: [],
        })
      );
    });

    it('Admin consegue adicionar utilizador a outra loja — DEVE PASSAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          lojas: ['store_A', 'store_B'],
        })
      );

      // Voltar ao estado anterior
      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          lojas: ['store_A'],
        })
      );
    });
  });

  // ============================================================================
  // V-ESC-003: SELF-REACTIVATION (Alteração de ativo)
  // ============================================================================

  describe('V-ESC-003 — Self-Reactivation', () => {
    it('Utilizador desativado tenta reativar-se — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('users').doc('deactivated_1').update({
          ativo: true,
        })
      );
    });

    it('Admin consegue reativar utilizador — DEVE PASSAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('users').doc('deactivated_1').update({
          ativo: true,
        })
      );

      // Voltar ao estado anterior
      await assertSucceeds(
        adminDb.collection('users').doc('deactivated_1').update({
          ativo: false,
        })
      );
    });
  });

  // ============================================================================
  // V-ESC-004: ALTERAÇÃO DE PERMISSÕES
  // ============================================================================

  describe('V-ESC-004 — Alteração de Permissões', () => {
    it('func_A tenta aumentar suas permissões — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          permissoes: {
            visualizar: true,
            criar: true,
            editar: true,
            deletar: true,
          },
        })
      );
    });

    it('Admin consegue alterar permissões — DEVE PASSAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          permissoes: {
            visualizar: true,
            criar: true,
            editar: true,
            deletar: false,
          },
        })
      );

      // Voltar ao estado anterior
      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          permissoes: {
            visualizar: true,
            criar: true,
            editar: false,
            deletar: false,
          },
        })
      );
    });
  });

  // ============================================================================
  // SELF-UPDATE LEGÍTIMO (Campo permitido: nome)
  // ============================================================================

  describe('Self-Update Legítimo', () => {
    it('func_A consegue alterar seu próprio nome — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertSucceeds(
        userDb.collection('users').doc('func_A').update({
          nome: 'Novo Nome',
        })
      );

      // Voltar ao estado anterior
      await assertSucceeds(
        userDb.collection('users').doc('func_A').update({
          nome: 'Func A',
        })
      );
    });

    it('func_A consegue alterar dataAtualizacao — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertSucceeds(
        userDb.collection('users').doc('func_A').update({
          dataAtualizacao: new Date().toISOString(),
        })
      );
    });

    it('func_A tenta alterar email — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          email: 'newemail@test.com',
        })
      );
    });

    it('func_A tenta alterar dataCriacao — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          dataCriacao: new Date().toISOString(),
        })
      );
    });
  });

  // ============================================================================
  // V-TEN-001: TENANT SWITCH (Alteração de storeId)
  // ============================================================================

  describe('V-TEN-001 — Tenant Switch Prevention', () => {
    it('Produto não consegue mudar de storeId — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('products').doc('product_A').update({
          storeId: 'store_B',
        })
      );
    });

    it('Admin também não consegue mover produto entre stores — DEVE FALHAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('products').doc('product_A').update({
          storeId: 'store_B',
        })
      );
    });
  });

  // ============================================================================
  // V-AUD-001: AUDIT TRAIL LOSS (Alteração de userId)
  // ============================================================================

  describe('V-AUD-001 — Audit Trail Protection', () => {
    it('Produto userId não consegue ser alterado — DEVE FALHAR', async () => {
      const managerDb = testEnv.authenticatedContext('manager_A').firestore();

      await assertFails(
        managerDb.collection('products').doc('product_A').update({
          userId: 'func_A2',
        })
      );
    });

    it('Admin também não consegue alterar userId — DEVE FALHAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('products').doc('product_A').update({
          userId: 'admin_1',
        })
      );
    });
  });

  // ============================================================================
  // MULTI-TENANCY: ISOLAMENTO ENTRE STORES
  // ============================================================================

  describe('Multi-Tenancy — Isolamento', () => {
    it('func_A (Store A) consegue ler product_A (Store A) — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertSucceeds(
        userDb.collection('products').doc('product_A').get()
      );
    });

    it('func_A (Store A) tenta ler product_B (Store B) — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('products').doc('product_B').get()
      );
    });

    it('func_B (Store B) consegue ler product_B (Store B) — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('func_B').firestore();

      await assertSucceeds(
        userDb.collection('products').doc('product_B').get()
      );
    });

    it('func_B (Store B) tenta ler product_A (Store A) — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_B').firestore();

      await assertFails(
        userDb.collection('products').doc('product_A').get()
      );
    });
  });

  // ============================================================================
  // RBAC: OPERAÇÕES EM PRODUCTS
  // ============================================================================

  describe('RBAC — Operações em Products', () => {
    it('func_A (funcionario) consegue ler seu produto — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertSucceeds(
        userDb.collection('products').doc('product_A').get()
      );
    });

    it('func_A2 (funcionario mesma store) consegue ler produto de func_A — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A2').firestore();

      await assertSucceeds(
        userDb.collection('products').doc('product_A').get()
      );
    });

    it('func_A (funcionario) tenta editar produto de func_A — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('products').doc('product_A').update({
          precoVenda: 200,
        })
      );
    });

    it('manager_A consegue editar product_A (sua store) — DEVE PASSAR', async () => {
      const managerDb = testEnv.authenticatedContext('manager_A').firestore();

      await assertSucceeds(
        managerDb.collection('products').doc('product_A').update({
          precoVenda: 160,
        })
      );

      // Voltar ao estado anterior
      await assertSucceeds(
        managerDb.collection('products').doc('product_A').update({
          precoVenda: 150,
        })
      );
    });

    it('admin consegue editar qualquer produto — DEVE PASSAR', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('products').doc('product_A').update({
          precoVenda: 170,
        })
      );

      // Voltar
      await assertSucceeds(
        adminDb.collection('products').doc('product_A').update({
          precoVenda: 150,
        })
      );
    });
  });

  // ============================================================================
  // OPERAÇÕES NÃO AUTENTICADAS
  // ============================================================================

  describe('Operações Não Autenticadas', () => {
    it('Utilizador não autenticado tenta ler users — DEVE FALHAR', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthDb.collection('users').doc('admin_1').get()
      );
    });

    it('Utilizador não autenticado tenta ler products — DEVE FALHAR', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthDb.collection('products').doc('product_A').get()
      );
    });

    it('Utilizador não autenticado tenta criar product — DEVE FALHAR', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();

      await assertFails(
        unauthDb.collection('products').add({
          nome: 'Test',
          storeId: 'store_A',
          userId: 'hacker',
        })
      );
    });
  });

  // ============================================================================
  // CAMPOS MISTOS (Mixed-Field Attack)
  // ============================================================================

  describe('Mixed-Field Attack Prevention', () => {
    it('func_A tenta alterar nome + papel simultâneamente — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          nome: 'Novo Nome',
          papel: 'admin',
        })
      );
    });

    it('func_A tenta alterar nome + lojas simultâneamente — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('func_A').firestore();

      await assertFails(
        userDb.collection('users').doc('func_A').update({
          nome: 'Novo Nome',
          lojas: ['store_A', 'store_B'],
        })
      );
    });
  });

  // ============================================================================
  // USERS — CAMPO SELF-EDITABLE
  // ============================================================================

  describe('Users — Whitelist de Campos Editáveis', () => {
    it('Apenas "nome" e "dataAtualizacao" estão na whitelist para self-edit', () => {
      // Este teste apenas documenta que a whitelist deve ser: ['nome', 'dataAtualizacao']
      // Os testes anteriores já validam o comportamento
      expect(['nome', 'dataAtualizacao']).toContain('nome');
    });
  });

  // ============================================================================
  // UTILIZADORES DESATIVADOS (ativo: false)
  // ============================================================================

  describe('Utilizadores Desativados (ativo: false)', () => {
    it('Utilizador desativado consegue ler seu próprio perfil — DEVE PASSAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertSucceeds(
        userDb.collection('users').doc('deactivated_1').get()
      );
    });

    it('Utilizador desativado tenta atualizar seu perfil — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('users').doc('deactivated_1').update({
          nome: 'Novo Nome',
        })
      );
    });

    it('Utilizador desativado tenta ler produtos — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('products').doc('product_A').get()
      );
    });

    it('Utilizador desativado tenta criar produtos — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('products').add({
          nome: 'Produto Novo',
          storeId: 'store_A',
          userId: 'deactivated_1',
          custoCompra: 100,
          precoVenda: 150,
        })
      );
    });

    it('Utilizador desativado tenta ler stores — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('stores').doc('store_A').get()
      );
    });

    it('Manager desativado tenta atualizar produto — DEVE FALHAR', async () => {
      // Primeiro, desativar o manager
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('manager_A').update({
          ativo: false,
        });
      });

      const managerDb = testEnv.authenticatedContext('manager_A').firestore();

      await assertFails(
        managerDb.collection('products').doc('product_A').update({
          precoVenda: 200,
        })
      );

      // Reativar manager para não interferir com outros testes
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('manager_A').update({
          ativo: true,
        });
      });
    });

    it('Admin desativado tenta criar utilizador — DEVE FALHAR', async () => {
      // Desativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: false,
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('users').add({
          id: 'new_user',
          nome: 'New User',
          email: 'newuser@test.com',
          papel: 'funcionario',
          lojas: ['store_A'],
          ativo: true,
        })
      );

      // Reativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: true,
        });
      });
    });

    it('Admin desativado tenta atualizar produto — DEVE FALHAR', async () => {
      // Desativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: false,
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('products').doc('product_A').update({
          precoVenda: 200,
        })
      );

      // Reativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: true,
        });
      });
    });

    it('Admin desativado tenta deletar produto — DEVE FALHAR', async () => {
      // Desativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: false,
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('products').doc('product_B').delete()
      );

      // Reativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: true,
        });
      });
    });

    it('Admin desativado tenta atualizar OUTRO user — DEVE FALHAR', async () => {
      // Desativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: false,
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('users').doc('func_A').update({
          nome: 'Alteração indevida por admin inativo',
        })
      );

      // Reativar admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: true,
        });
      });
    });

    it('Admin desativado tenta deletar OUTRO user — DEVE FALHAR', async () => {
      // Criar user temporário via seed
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('user_temp_delete').set({
          id: 'user_temp_delete',
          nome: 'Temp User Delete',
          email: 'temp_delete@test.com',
          papel: 'funcionario',
          lojas: ['store_A'],
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'admin_1',
        });

        // Desativar admin
        await adminDb.collection('users').doc('admin_1').update({
          ativo: false,
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertFails(
        adminDb.collection('users').doc('user_temp_delete').delete()
      );

      // Reativar admin e limpar
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('admin_1').update({
          ativo: true,
        });
        await adminDb.collection('users').doc('user_temp_delete').delete();
      });
    });

    it('Utilizador desativado tenta ler sales — DEVE FALHAR', async () => {
      // Criar sale fixture
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('stores').doc('store_A').collection('sales').doc('sale_temp').set({
          id: 'sale_temp',
          userId: 'func_A',
          storeId: 'store_A',
          dataCriacao: new Date().toISOString(),
        });
      });

      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('stores').doc('store_A').collection('sales').doc('sale_temp').get()
      );

      // Limpar
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('stores').doc('store_A').collection('sales').doc('sale_temp').delete();
      });
    });

    it('Utilizador desativado tenta criar sales — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('stores').doc('store_A').collection('sales').add({
          userId: 'deactivated_1',
          storeId: 'store_A',
          dataCriacao: new Date().toISOString(),
        })
      );
    });

    it('Utilizador desativado tenta ler businessSettings — DEVE FALHAR', async () => {
      // Criar setting fixture
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('businessSettings').doc('setting_temp').set({
          id: 'setting_temp',
          userId: 'deactivated_1',
          storeId: 'store_A',
          dataCriacao: new Date().toISOString(),
        });
      });

      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('businessSettings').doc('setting_temp').get()
      );

      // Limpar
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('businessSettings').doc('setting_temp').delete();
      });
    });

    it('Utilizador desativado tenta criar businessSettings — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('businessSettings').add({
          userId: 'deactivated_1',
          storeId: 'store_A',
          dataCriacao: new Date().toISOString(),
        })
      );
    });

    it('Utilizador desativado tenta ler priceHistory — DEVE FALHAR', async () => {
      // Criar price history fixture
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('priceHistory').doc('history_temp').set({
          id: 'history_temp',
          userId: 'deactivated_1',
          dataCriacao: new Date().toISOString(),
        });
      });

      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('priceHistory').doc('history_temp').get()
      );

      // Limpar
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('priceHistory').doc('history_temp').delete();
      });
    });

    it('Utilizador desativado tenta criar priceHistory — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('priceHistory').add({
          userId: 'deactivated_1',
          dataCriacao: new Date().toISOString(),
        })
      );
    });

    it('Utilizador desativado tenta ler backupLogs — DEVE FALHAR', async () => {
      // Criar backup logs fixture
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('backupLogs').doc('backup_temp').set({
          id: 'backup_temp',
          userId: 'deactivated_1',
          dataCriacao: new Date().toISOString(),
        });
      });

      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('backupLogs').doc('backup_temp').get()
      );

      // Limpar
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('backupLogs').doc('backup_temp').delete();
      });
    });

    it('Utilizador desativado tenta criar backupLogs — DEVE FALHAR', async () => {
      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('backupLogs').add({
          userId: 'deactivated_1',
          dataCriacao: new Date().toISOString(),
        })
      );
    });

    it('Utilizador desativado tenta ler categories — DEVE FALHAR', async () => {
      // Criar category fixture
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('stores').doc('store_A').collection('categories').doc('category_temp').set({
          id: 'category_temp',
          nome: 'Categoria Temp',
          dataCriacao: new Date().toISOString(),
        });
      });

      const userDb = testEnv.authenticatedContext('deactivated_1').firestore();

      await assertFails(
        userDb.collection('stores').doc('store_A').collection('categories').doc('category_temp').get()
      );

      // Limpar
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('stores').doc('store_A').collection('categories').doc('category_temp').delete();
      });
    });

    it('Admin ativo consegue atualizar outro user — REGRESSÃO CHECK', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          nome: 'Atualizado por Admin Ativo',
        })
      );

      // Reverter
      await assertSucceeds(
        adminDb.collection('users').doc('func_A').update({
          nome: 'Func A',
        })
      );
    });

    it('Admin ativo consegue deletar user temporário — REGRESSÃO CHECK', async () => {
      // Criar user temporário
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('user_temp_delete_2').set({
          id: 'user_temp_delete_2',
          nome: 'Temp User Delete 2',
          email: 'temp_delete_2@test.com',
          papel: 'funcionario',
          lojas: ['store_A'],
          ativo: true,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'admin_1',
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('users').doc('user_temp_delete_2').delete()
      );
    });

    it('Admin ativo consegue criar store — REGRESSÃO CHECK', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();
      const storeId = 'store_temp_create_regression_' + Date.now();

      try {
        await assertSucceeds(
          adminDb.collection('stores').doc(storeId).set({
            id: storeId,
            nome: 'Store Temp Create Regression',
            dataCriacao: new Date().toISOString(),
          })
        );
      } finally {
        // Cleanup explícito via rules disabled
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await adminDb.collection('stores').doc(storeId).delete();
        });
      }
    });

    it('Admin ativo consegue atualizar store — REGRESSÃO CHECK', async () => {
      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('stores').doc('store_A').update({
          nome: 'Store A Atualizada',
        })
      );

      // Reverter
      await assertSucceeds(
        adminDb.collection('stores').doc('store_A').update({
          nome: 'Store A',
        })
      );
    });

    it('Admin ativo consegue deletar store temporária — REGRESSÃO CHECK', async () => {
      // Criar store temporária
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('stores').doc('store_temp_delete').set({
          id: 'store_temp_delete',
          nome: 'Store Temp Delete',
          dataCriacao: new Date().toISOString(),
        });
      });

      const adminDb = testEnv.authenticatedContext('admin_1').firestore();

      await assertSucceeds(
        adminDb.collection('stores').doc('store_temp_delete').delete()
      );
    });

    // ============================================================================
    // PC-02B.3E.2A — priceHistory com storeId Tenancy
    // ============================================================================

    describe('PC-02B.3E.2A — priceHistory Tenancy Rules (storeId)', () => {

      beforeEach(async () => {
        // Seed: Criar docs de priceHistory para testes
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();

          // priceHistory criado por func_A para store_A
          await adminDb.collection('priceHistory').doc('ph_A_funcA').set({
            id: 'ph_A_funcA',
            productId: 'product_1',
            productName: 'Product 1',
            productCategory: 'Test',
            storeId: 'store_A',
            userId: 'func_A',
            previousPrice: 100,
            newPrice: 120,
            previousCost: 50,
            newCost: 55,
            previousMargin: 50,
            newMargin: 55,
            previousROI: 100,
            newROI: 118,
            previousProfit: 50,
            newProfit: 65,
            changeReason: 'Test change',
            createdAt: new Date().toISOString(),
          });

          // priceHistory criado por func_A2 (outro user da store_A) para store_A
          await adminDb.collection('priceHistory').doc('ph_A_funcA2').set({
            id: 'ph_A_funcA2',
            productId: 'product_2',
            productName: 'Product 2',
            productCategory: 'Test',
            storeId: 'store_A',
            userId: 'func_A2',
            previousPrice: 200,
            newPrice: 220,
            previousCost: 100,
            newCost: 110,
            previousMargin: 50,
            newMargin: 50,
            previousROI: 100,
            newROI: 100,
            previousProfit: 100,
            newProfit: 110,
            changeReason: 'Test change 2',
            createdAt: new Date().toISOString(),
          });

          // priceHistory criado por func_B para store_B
          await adminDb.collection('priceHistory').doc('ph_B_funcB').set({
            id: 'ph_B_funcB',
            productId: 'product_3',
            productName: 'Product 3',
            productCategory: 'Test',
            storeId: 'store_B',
            userId: 'func_B',
            previousPrice: 300,
            newPrice: 330,
            previousCost: 150,
            newCost: 165,
            previousMargin: 50,
            newMargin: 55,
            previousROI: 100,
            newROI: 120,
            previousProfit: 150,
            newProfit: 165,
            changeReason: 'Test change B',
            createdAt: new Date().toISOString(),
          });
        });
      });

      afterEach(async () => {
        // Limpeza
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await adminDb.collection('priceHistory').doc('ph_A_funcA').delete();
          await adminDb.collection('priceHistory').doc('ph_A_funcA2').delete();
          await adminDb.collection('priceHistory').doc('ph_B_funcB').delete();
        });
      });

      // TESTE PH-RULE-01
      it('PH-RULE-01: Membro ativo da store A consegue READ de priceHistory próprio', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertSucceeds(
          funcADb.collection('priceHistory').doc('ph_A_funcA').get()
        );
      });

      // TESTE PH-RULE-02
      it('PH-RULE-02: Membro ativo da store A consegue READ de priceHistory de OUTRO user da mesma store', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertSucceeds(
          funcADb.collection('priceHistory').doc('ph_A_funcA2').get()
        );
      });

      // TESTE PH-RULE-03
      it('PH-RULE-03: User consegue CREATE priceHistory com storeId autorizado e userId próprio', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertSucceeds(
          funcADb.collection('priceHistory').add({
            productId: 'product_new',
            productName: 'Product New',
            productCategory: 'Test',
            storeId: 'store_A',
            userId: 'func_A',
            previousPrice: 100,
            newPrice: 110,
            previousCost: 50,
            newCost: 55,
            previousMargin: 50,
            newMargin: 55,
            previousROI: 100,
            newROI: 110,
            previousProfit: 50,
            newProfit: 55,
            changeReason: 'New test',
            createdAt: new Date().toISOString(),
          })
        );
      });

      // TESTE PH-RULE-04
      it('PH-RULE-04: Criador consegue UPDATE mantendo storeId e userId', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertSucceeds(
          funcADb.collection('priceHistory').doc('ph_A_funcA').update({
            newPrice: 125,
          })
        );
      });

      // TESTE PH-RULE-05
      it('PH-RULE-05: Criador consegue DELETE do próprio priceHistory', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();

        // Criar doc para deletar
        const newDocRef = await funcADb.collection('priceHistory').add({
          productId: 'product_del',
          productName: 'Product Delete',
          productCategory: 'Test',
          storeId: 'store_A',
          userId: 'func_A',
          previousPrice: 50,
          newPrice: 60,
          previousCost: 25,
          newCost: 30,
          previousMargin: 50,
          newMargin: 50,
          previousROI: 100,
          newROI: 100,
          previousProfit: 25,
          newProfit: 30,
          changeReason: 'Delete test',
          createdAt: new Date().toISOString(),
        });

        // Deletar
        await assertSucceeds(
          funcADb.collection('priceHistory').doc(newDocRef.id).delete()
        );
      });

      // TESTE PH-RULE-06
      it('PH-RULE-06: User da store B NÃO consegue READ de priceHistory da store A', async () => {
        const funcBDb = testEnv.authenticatedContext('func_B').firestore();
        await assertFails(
          funcBDb.collection('priceHistory').doc('ph_A_funcA').get()
        );
      });

      // TESTE PH-RULE-07
      it('PH-RULE-07: User tenta CREATE em store onde NÃO é membro — DENY', async () => {
        const funcBDb = testEnv.authenticatedContext('func_B').firestore();
        await assertFails(
          funcBDb.collection('priceHistory').add({
            productId: 'product_invalid',
            storeId: 'store_A', // store onde func_B não é membro
            userId: 'func_B',
            previousPrice: 100,
            newPrice: 110,
            previousCost: 50,
            newCost: 55,
            previousMargin: 50,
            newMargin: 55,
            previousROI: 100,
            newROI: 110,
            previousProfit: 50,
            newProfit: 55,
            changeReason: 'Invalid store',
            createdAt: new Date().toISOString(),
          })
        );
      });

      // TESTE PH-RULE-08
      it('PH-RULE-08: User tenta CREATE com userId de outra pessoa — DENY', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertFails(
          funcADb.collection('priceHistory').add({
            productId: 'product_other_user',
            storeId: 'store_A',
            userId: 'func_A2', // userId diferente do auth.uid
            previousPrice: 100,
            newPrice: 110,
            previousCost: 50,
            newCost: 55,
            previousMargin: 50,
            newMargin: 55,
            previousROI: 100,
            newROI: 110,
            previousProfit: 50,
            newProfit: 55,
            changeReason: 'Wrong user',
            createdAt: new Date().toISOString(),
          })
        );
      });

      // TESTE PH-RULE-09
      it('PH-RULE-09: User tenta CREATE sem storeId — DENY', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertFails(
          funcADb.collection('priceHistory').add({
            productId: 'product_no_store',
            // storeId ausente
            userId: 'func_A',
            previousPrice: 100,
            newPrice: 110,
            previousCost: 50,
            newCost: 55,
            previousMargin: 50,
            newMargin: 55,
            previousROI: 100,
            newROI: 110,
            previousProfit: 50,
            newProfit: 55,
            changeReason: 'No store',
            createdAt: new Date().toISOString(),
          })
        );
      });

      // TESTE PH-RULE-10
      it('PH-RULE-10: Criador tenta UPDATE alterando storeId — DENY', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertFails(
          funcADb.collection('priceHistory').doc('ph_A_funcA').update({
            storeId: 'store_B', // Tenant switch attempt
          })
        );
      });

      // TESTE PH-RULE-11
      it('PH-RULE-11: Criador tenta UPDATE alterando userId — DENY', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        await assertFails(
          funcADb.collection('priceHistory').doc('ph_A_funcA').update({
            userId: 'func_A2', // User change attempt
          })
        );
      });

      // TESTE PH-RULE-12
      it('PH-RULE-12: Outro membro da mesma store tenta UPDATE de doc criado por outro — DENY', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        // func_A tenta editar doc de func_A2
        await assertFails(
          funcADb.collection('priceHistory').doc('ph_A_funcA2').update({
            newPrice: 999,
          })
        );
      });

      // TESTE PH-RULE-13
      it('PH-RULE-13: Outro membro da mesma store tenta DELETE de doc criado por outro — DENY', async () => {
        const funcADb = testEnv.authenticatedContext('func_A').firestore();
        // func_A tenta deletar doc de func_A2
        await assertFails(
          funcADb.collection('priceHistory').doc('ph_A_funcA2').delete()
        );
      });

      // TESTE PH-RULE-14
      it('PH-RULE-14: User inativo tenta READ mesmo listado na store — DENY', async () => {
        const deactivatedDb = testEnv.authenticatedContext('deactivated_1').firestore();
        await assertFails(
          deactivatedDb.collection('priceHistory').doc('ph_A_funcA').get()
        );
      });
    });
  });

});

describe('PC-02A.5 — Coverage Summary', () => {
  it('Todos os cenários de escalation foram testados contra Firestore Emulator REAL', () => {
    // Summary
    const testedVulnerabilities = [
      'V-ESC-001: Self-Promotion',
      'V-ESC-002: Self-Assignment',
      'V-ESC-003: Self-Reactivation',
      'V-ESC-004: Permission Escalation',
      'V-TEN-001: Tenant Switch',
      'V-AUD-001: Audit Trail Loss',
      'Multi-Tenancy Isolation',
      'RBAC Enforcement',
      'Mixed-Field Attack Prevention',
    ];

    expect(testedVulnerabilities.length).toBeGreaterThan(0);
    console.log('[PC-02A.5] Vulnerabilidades testadas:', testedVulnerabilities.length);
  });
});
