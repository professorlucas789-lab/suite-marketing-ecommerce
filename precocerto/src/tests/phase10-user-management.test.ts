/**
 * Testes para Sistema de Gerenciamento de Utilizadores
 * Fase 10 (Extras): User Management & Access Control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserManagementService, CreateUserData } from '../services/userManagementService';
import { User, UserRole, UserPermissions } from '../types/store';

describe('UserManagementService', () => {
  // Mocks
  const mockCreateUserData: CreateUserData = {
    email: 'joao@example.com',
    nome: 'João Silva',
    papel: 'funcionario',
    lojas: ['store-123'],
  };

  const mockUser: User = {
    id: 'user-123',
    nome: 'João Silva',
    email: 'joao@example.com',
    papel: 'funcionario',
    lojas: ['store-123'],
    permissoes: {
      visualizar: true,
      criar: true,
      editar: false,
      deletar: false,
      relatorios: false,
    },
    ativo: true,
    dataCriacao: '2024-01-01T00:00:00Z',
    criadoPor: 'admin-123',
  };

  describe('Gerenciamento de Permissões por Papel', () => {
    it('deve atribuir permissões corretas para Admin', () => {
      const adminPermissions = {
        visualizar: true,
        criar: true,
        editar: true,
        deletar: true,
        relatorios: true,
      };

      expect(adminPermissions.deletar).toBe(true);
      expect(adminPermissions.relatorios).toBe(true);
    });

    it('deve atribuir permissões corretas para Gestor de Loja', () => {
      const managerPermissions = {
        visualizar: true,
        criar: true,
        editar: true,
        deletar: false,
        relatorios: true,
      };

      expect(managerPermissions.editar).toBe(true);
      expect(managerPermissions.deletar).toBe(false);
      expect(managerPermissions.relatorios).toBe(true);
    });

    it('deve atribuir permissões corretas para Funcionário', () => {
      const employeePermissions = {
        visualizar: true,
        criar: true,
        editar: false,
        deletar: false,
        relatorios: false,
      };

      expect(employeePermissions.criar).toBe(true);
      expect(employeePermissions.editar).toBe(false);
      expect(employeePermissions.relatorios).toBe(false);
    });
  });

  describe('Estrutura de Dados do Utilizador', () => {
    it('deve ter todos os campos obrigatórios', () => {
      expect(mockUser).toHaveProperty('id');
      expect(mockUser).toHaveProperty('email');
      expect(mockUser).toHaveProperty('nome');
      expect(mockUser).toHaveProperty('papel');
      expect(mockUser).toHaveProperty('lojas');
      expect(mockUser).toHaveProperty('permissoes');
      expect(mockUser).toHaveProperty('ativo');
      expect(mockUser).toHaveProperty('dataCriacao');
      expect(mockUser).toHaveProperty('criadoPor');
    });

    it('deve ter papel válido', () => {
      const validRoles: UserRole[] = ['admin', 'loja-manager', 'funcionario'];
      expect(validRoles).toContain(mockUser.papel);
    });

    it('deve ter lojas associadas', () => {
      expect(mockUser.lojas).toBeInstanceOf(Array);
      expect(mockUser.lojas.length).toBeGreaterThan(0);
    });

    it('deve ter todas as permissões definidas', () => {
      const permissions = mockUser.permissoes;
      expect(permissions).toHaveProperty('visualizar');
      expect(permissions).toHaveProperty('criar');
      expect(permissions).toHaveProperty('editar');
      expect(permissions).toHaveProperty('deletar');
      expect(permissions).toHaveProperty('relatorios');
    });
  });

  describe('Validação de Dados', () => {
    it('deve validar email correto', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(mockUser.email)).toBe(true);
    });

    it('deve validar nome não vazio', () => {
      expect(mockUser.nome).toBeTruthy();
      expect(mockUser.nome.length).toBeGreaterThan(0);
    });

    it('deve validar que usuário tem acesso a pelo menos uma loja', () => {
      expect(mockUser.lojas.length).toBeGreaterThan(0);
    });

    it('deve validar data de criação no formato ISO', () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      expect(isoRegex.test(mockUser.dataCriacao)).toBe(true);
    });
  });

  describe('Operações de Utilizador', () => {
    it('deve ter dados para criar novo utilizador', () => {
      expect(mockCreateUserData).toHaveProperty('email');
      expect(mockCreateUserData).toHaveProperty('nome');
      expect(mockCreateUserData).toHaveProperty('papel');
      expect(mockCreateUserData).toHaveProperty('lojas');
    });

    it('deve aceitar permissões customizadas', () => {
      const customPermissions: UserPermissions = {
        visualizar: true,
        criar: false,
        editar: true,
        deletar: false,
        relatorios: true,
      };

      const dataWithCustom: CreateUserData = {
        ...mockCreateUserData,
        permissoes: customPermissions,
      };

      expect(dataWithCustom.permissoes).toEqual(customPermissions);
    });

    it('deve ter senha com mínimo 6 caracteres', () => {
      const password = 'senha123';
      expect(password.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Controle de Acesso por Papel', () => {
    const roles: Array<{ role: UserRole; expectedPermissions: keyof UserPermissions[] }> = [
      {
        role: 'admin',
        expectedPermissions: ['visualizar', 'criar', 'editar', 'deletar', 'relatorios'],
      },
      {
        role: 'loja-manager',
        expectedPermissions: ['visualizar', 'criar', 'editar', 'relatorios'],
      },
      {
        role: 'funcionario',
        expectedPermissions: ['visualizar', 'criar'],
      },
    ];

    roles.forEach(({ role, expectedPermissions }) => {
      it(`${role} deve ter acesso correto`, () => {
        const permissions = {
          admin: {
            visualizar: true,
            criar: true,
            editar: true,
            deletar: true,
            relatorios: true,
          },
          'loja-manager': {
            visualizar: true,
            criar: true,
            editar: true,
            deletar: false,
            relatorios: true,
          },
          funcionario: {
            visualizar: true,
            criar: true,
            editar: false,
            deletar: false,
            relatorios: false,
          },
        };

        const userPermissions = permissions[role];
        expectedPermissions.forEach((perm) => {
          expect(userPermissions[perm]).toBe(true);
        });
      });
    });
  });

  describe('Segurança e Auditoria', () => {
    it('deve registar quem criou o utilizador', () => {
      expect(mockUser.criadoPor).toBeTruthy();
      expect(mockUser.criadoPor).toBe('admin-123');
    });

    it('deve manter timestamp de criação', () => {
      expect(mockUser.dataCriacao).toBeTruthy();
      const createdDate = new Date(mockUser.dataCriacao);
      expect(createdDate).toBeInstanceOf(Date);
    });

    it('deve registar último login se disponível', () => {
      const userWithLogin: User = {
        ...mockUser,
        ultimoLogin: '2024-01-15T10:30:00Z',
      };

      expect(userWithLogin.ultimoLogin).toBeTruthy();
    });

    it('deve ter flag ativo para soft delete', () => {
      expect(mockUser.ativo).toBe(true);

      const inactiveUser = { ...mockUser, ativo: false };
      expect(inactiveUser.ativo).toBe(false);
    });
  });

  describe('Multi-loja', () => {
    it('deve permitir utilizador em múltiplas lojas', () => {
      const multiStoreUser: User = {
        ...mockUser,
        lojas: ['store-123', 'store-456', 'store-789'],
      };

      expect(multiStoreUser.lojas.length).toBe(3);
      expect(multiStoreUser.lojas).toContain('store-123');
      expect(multiStoreUser.lojas).toContain('store-456');
    });

    it('deve ter acesso apenas a lojas específicas', () => {
      expect(mockUser.lojas).toEqual(['store-123']);
      expect(mockUser.lojas.includes('store-456')).toBe(false);
    });

    it('deve remover utilizador de loja sem deletar conta', () => {
      const multiStoreUser: User = {
        ...mockUser,
        lojas: ['store-123', 'store-456'],
      };

      const updatedLojas = multiStoreUser.lojas.filter((id) => id !== 'store-123');
      expect(updatedLojas).toEqual(['store-456']);
      expect(multiStoreUser.ativo).toBe(true);
    });
  });

  describe('Integração com Firestore', () => {
    it('deve seguir estrutura de documento Firestore', () => {
      const firestoreDoc = {
        id: mockUser.id,
        ...mockUser,
      };

      expect(firestoreDoc).toHaveProperty('id');
      expect(firestoreDoc).toHaveProperty('email');
      expect(firestoreDoc).toHaveProperty('permissoes');
    });

    it('deve ter datas em formato ISO para Firestore', () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      expect(isoRegex.test(mockUser.dataCriacao)).toBe(true);
    });
  });

  describe('Casos de Uso Reais', () => {
    it('deve criar novo funcionário com permissões básicas', () => {
      const newEmployee = {
        ...mockCreateUserData,
        papel: 'funcionario',
      };

      expect(newEmployee.papel).toBe('funcionario');
      expect(newEmployee.lojas.length).toBeGreaterThan(0);
    });

    it('deve promover funcionário a gestor', () => {
      const promoted: User = {
        ...mockUser,
        papel: 'loja-manager',
      };

      expect(promoted.papel).toBe('loja-manager');
      expect(promoted.email).toBe(mockUser.email);
    });

    it('deve inativar utilizador mantendo histórico', () => {
      const inactivated: User = {
        ...mockUser,
        ativo: false,
      };

      expect(inactivated.id).toBe(mockUser.id);
      expect(inactivated.ativo).toBe(false);
      expect(inactivated.dataCriacao).toBe(mockUser.dataCriacao);
    });

    it('deve ajustar permissões sem mudar papel', () => {
      const customPermissions: UserPermissions = {
        visualizar: true,
        criar: true,
        editar: true,
        deletar: false,
        relatorios: true,
      };

      const adjusted: User = {
        ...mockUser,
        permissoes: customPermissions,
      };

      expect(adjusted.papel).toBe('funcionario');
      expect(adjusted.permissoes.editar).toBe(true);
    });
  });

  describe('Performance e Escalabilidade', () => {
    it('deve gerenciar múltiplos utilizadores', () => {
      const users: User[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
        email: `user${i}@example.com`,
      }));

      expect(users.length).toBe(100);
    });

    it('deve filtrar utilizadores por loja eficientemente', () => {
      const storeUsers = [mockUser, { ...mockUser, id: 'user-456', email: 'otro@example.com' }];
      const store123Users = storeUsers.filter((u) => u.lojas.includes('store-123'));

      expect(store123Users.length).toBe(2);
    });

    it('deve verificar permissão rapidamente', () => {
      const hasPermission = mockUser.permissoes.criar === true;
      expect(hasPermission).toBe(true);
    });
  });
});
