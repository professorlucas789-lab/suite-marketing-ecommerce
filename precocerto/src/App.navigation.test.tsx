/**
 * Testes de navegação do menu lateral.
 *
 * Percorre todos os itens do menu com um utilizador admin e garante que cada
 * vista abre mesmo (conteúdo visível, sem carregamento infinito), que uma falha
 * de leitura no Firestore é explicada em vez de bloquear a vista, e que o menu
 * nunca fica vazio quando o papel do utilizador não pôde ser determinado.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

const { authUser } = vi.hoisted(() => ({
  authUser: { uid: 'admin-1', email: 'admin@exemplo.com', providerData: [] },
}));

vi.mock('./firebase', () => ({
  auth: {
    currentUser: authUser,
    onAuthStateChanged: (cb: (u: unknown) => void) => { cb(authUser); return () => {}; },
  },
  db: {},
  storage: {},
  OperationType: { CREATE: 'create', UPDATE: 'update', DELETE: 'delete', LIST: 'list', GET: 'get', WRITE: 'write' },
  handleFirestoreError: (e: unknown) => { throw e instanceof Error ? e : new Error(String(e)); },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => { cb(authUser); return () => {}; },
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
}));

const { fakeDb } = vi.hoisted(() => ({
  fakeDb: {
    // Documento do utilizador; a null simula um documento ilegível/inexistente.
    userDoc: null as any,
    // Caminhos recusados pelas regras do Firestore neste cenário.
    deniedPaths: [] as string[],
    stores: [] as any[],
  },
}));

const adminDoc = {
  id: 'admin-1',
  nome: 'Admin',
  email: 'admin@exemplo.com',
  papel: 'admin',
  lojas: ['loja-1'],
  permissoes: { visualizar: true, criar: true, editar: true, deletar: true, relatorios: true },
  ativo: true,
  dataCriacao: '2026-01-01T00:00:00.000Z',
};

const storeDoc = { id: 'loja-1', nome: 'Loja Central', tipo: 'farmacia', ativo: true };

vi.mock('firebase/firestore', () => {
  const snapshot = (docs: any[]) => ({
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((d) => ({ id: d.id, data: () => d, exists: () => true })),
    forEach: (cb: (d: any) => void) => docs.forEach((d) => cb({ id: d.id, data: () => d, exists: () => true })),
  });
  const denied = (path: string) =>
    fakeDb.deniedPaths.some((p) => path === p || path.startsWith(`${p}/`));
  const permissionError = (path: string) =>
    Object.assign(new Error(`Missing or insufficient permissions: ${path}`), { code: 'permission-denied' });

  return {
    collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    query: (ref: any) => ref,
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: (ref: any, next: any, error?: any) => {
      const path: string = ref?.path ?? '';
      const onNext = typeof next === 'function' ? next : next?.next;
      const onError = typeof next === 'function' ? error : next?.error;
      if (denied(path)) {
        if (onError) onError(permissionError(path));
        return () => {};
      }
      onNext(snapshot(path === 'stores' ? fakeDb.stores : []));
      return () => {};
    },
    doc: (_dbOrRef: unknown, ...path: string[]) => {
      if (path.length === 0 && (_dbOrRef as any)?.path) {
        return { id: 'generated-id', path: `${(_dbOrRef as any).path}/generated-id` };
      }
      return { id: path[path.length - 1], path: path.join('/') };
    },
    getDoc: async (ref: any) => {
      const path: string = ref?.path ?? '';
      if (denied(path)) throw permissionError(path);
      if (path === 'users/admin-1' && fakeDb.userDoc) {
        return { id: 'admin-1', exists: () => true, data: () => fakeDb.userDoc };
      }
      const store = fakeDb.stores.find((s) => path === `stores/${s.id}`);
      if (store) return { id: store.id, exists: () => true, data: () => store };
      return { exists: () => false, data: () => undefined };
    },
    getDocs: async (ref: any) => {
      const path: string = ref?.path ?? '';
      if (denied(path)) throw permissionError(path);
      return snapshot(path === 'stores' ? fakeDb.stores : []);
    },
    addDoc: async (ref: any) => {
      if (denied(ref?.path ?? '')) throw permissionError(ref?.path ?? '');
      return { id: 'novo' };
    },
    setDoc: async (ref: any) => {
      if (denied(ref?.path ?? '')) throw permissionError(ref?.path ?? '');
    },
    updateDoc: async (ref: any) => {
      if (denied(ref?.path ?? '')) throw permissionError(ref?.path ?? '');
    },
    deleteDoc: async (ref: any) => {
      if (denied(ref?.path ?? '')) throw permissionError(ref?.path ?? '');
    },
    Timestamp: { now: () => ({ toDate: () => new Date('2026-01-01') }) },
    serverTimestamp: vi.fn(),
    writeBatch: () => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn() }),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
  };
});

vi.mock('firebase/storage', () => ({
  ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn(), deleteObject: vi.fn(),
}));

import App from './App';
import { StoreProvider } from './contexts/StoreContext';

const tick = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/** Todos os menus visíveis a um administrador. */
const MENUS_ADMIN = [
  'dashboard',
  'products',
  'batch-products',
  'categories',
  'reverse-calculator',
  'stores',
  'history',
  'reports',
  'users',
  'user-profile',
  'settings',
  'backup',
  'diagnostics',
];

const renderApp = async () => {
  render(
    <StoreProvider>
      <App />
    </StoreProvider>
  );
  await tick(500);
};

const abrirMenu = async (menu: string) => {
  const botao = document.querySelector(`#nav-${menu}-sidebar-btn`);
  expect(botao, `item de menu ausente: ${menu}`).toBeTruthy();
  fireEvent.click(botao!);
  await tick();
};

describe('Navegação do menu lateral', () => {
  beforeEach(() => {
    fakeDb.userDoc = adminDoc;
    fakeDb.deniedPaths = [];
    fakeDb.stores = [storeDoc];
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('abre todas as vistas do admin sem ecrã vazio nem carregamento infinito', async () => {
    await renderApp();
    await waitFor(() => expect(document.querySelector('#nav-dashboard-sidebar-btn')).toBeTruthy(), { timeout: 5000 });

    const falhas: string[] = [];

    for (const menu of MENUS_ADMIN) {
      const botao = document.querySelector(`#nav-${menu}-sidebar-btn`);
      if (!botao) {
        falhas.push(`${menu}: item de menu ausente`);
        continue;
      }

      fireEvent.click(botao);
      await tick();

      const main = document.querySelector('main');
      const texto = (main?.textContent || '').trim();

      if (texto.length < 40) falhas.push(`${menu}: vista praticamente vazia -> "${texto}"`);
      else if (main?.querySelector('.animate-spin')) falhas.push(`${menu}: preso a carregar -> "${texto.slice(0, 80)}"`);
      if (document.querySelector('#view-error-boundary')) falhas.push(`${menu}: a vista rebentou`);
    }

    expect(falhas, `Menus com problema:\n${falhas.join('\n')}`).toEqual([]);
  }, 60000);

  it('explica a falha em vez de deixar as categorias presas a carregar', async () => {
    fakeDb.deniedPaths = ['stores/loja-1/categories'];

    await renderApp();
    await waitFor(() => expect(document.querySelector('#nav-categories-sidebar-btn')).toBeTruthy(), { timeout: 5000 });
    await abrirMenu('categories');

    const main = document.querySelector('main');
    expect(main?.textContent).not.toContain('Carregando categorias');
    expect(document.querySelector('#categories-error-state')).toBeTruthy();
    expect(document.querySelector('#categories-retry-button')).toBeTruthy();
  }, 30000);

  it('mostra os menus restritos como bloqueados e explica-os em vez de os esconder', async () => {
    // Contas novas são criadas com o papel "funcionario": antes, 7 dos 13
    // menus desapareciam sem qualquer explicação.
    fakeDb.userDoc = { ...adminDoc, papel: 'funcionario' };

    await renderApp();
    await waitFor(() => expect(document.querySelector('#nav-dashboard-sidebar-btn')).toBeTruthy(), { timeout: 5000 });

    // Diagnóstico deixou de ser exclusivo de admin: é a página que explica a
    // falta de permissões, logo tem de estar acessível a quem não as tem.
    expect(document.querySelector('#nav-diagnostics-sidebar-btn')).toBeTruthy();
    await abrirMenu('diagnostics');
    expect((document.querySelector('main')?.textContent || '').length).toBeGreaterThan(40);
    expect(document.querySelector('#view-error-boundary')).toBeNull();

    // Os menus de administração continuam visíveis, mas bloqueados.
    const bloqueados = ['stores', 'users', 'categories', 'settings', 'backup'];
    for (const menu of bloqueados) {
      expect(document.querySelector(`#nav-${menu}-locked-btn`), `menu bloqueado ausente: ${menu}`).toBeTruthy();
      expect(document.querySelector(`#nav-${menu}-sidebar-btn`), `menu ${menu} não devia estar acessível`).toBeNull();
    }

    // Clicar num menu bloqueado explica a situação e nunca mostra o conteúdo.
    fireEvent.click(document.querySelector('#nav-users-locked-btn')!);
    await tick();
    expect(document.querySelector('#restricted-access-notice')).toBeTruthy();
    expect(document.querySelector('#restricted-open-diagnostics-btn')).toBeTruthy();
    expect(document.querySelector('main')?.textContent).toContain('Administrador');
  }, 30000);

  it('mantém um menu utilizável e explica a situação quando o papel não é conhecido', async () => {
    fakeDb.userDoc = null;
    fakeDb.deniedPaths = ['users'];

    await renderApp();

    await waitFor(() => expect(document.querySelector('#nav-role-unavailable')).toBeTruthy(), { timeout: 5000 });
    // O menu não pode ficar vazio: as vistas comuns continuam acessíveis.
    expect(document.querySelector('#nav-dashboard-sidebar-btn')).toBeTruthy();
    expect(document.querySelector('#nav-user-profile-sidebar-btn')).toBeTruthy();
    // Vistas exclusivas de administração continuam protegidas.
    expect(document.querySelector('#nav-users-sidebar-btn')).toBeNull();

    await abrirMenu('dashboard');
    expect((document.querySelector('main')?.textContent || '').length).toBeGreaterThan(40);
  }, 30000);
});
