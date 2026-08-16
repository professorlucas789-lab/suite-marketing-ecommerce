import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

// --- Firebase mocks -------------------------------------------------------
const { authUser } = vi.hoisted(() => ({
  authUser: { uid: 'user-1', email: 'teste@exemplo.com', providerData: [] },
}));

vi.mock('./firebase', () => ({
  auth: { currentUser: authUser, onAuthStateChanged: (cb: (u: unknown) => void) => { cb(authUser); return () => {}; } },
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

const { savedDocs } = vi.hoisted(() => ({ savedDocs: [] as any[] }));

vi.mock('firebase/firestore', () => {
  const snapshot = (docs: any[]) => ({
    empty: docs.length === 0,
    docs: docs.map((d) => ({ id: d.id, data: () => d, exists: () => true })),
    forEach: (cb: (d: any) => void) => docs.forEach((d) => cb({ id: d.id, data: () => d })),
  });
  return {
    collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    query: (ref: any) => ref,
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: (ref: any, next: any) => {
      const cb = typeof next === 'function' ? next : next?.next;
      cb(snapshot(ref?.path === 'products' ? savedDocs : []));
      return () => {};
    },
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    getDoc: async () => ({ exists: () => false, data: () => undefined }),
    getDocs: async () => snapshot([]),
    addDoc: async (ref: any, data: any) => {
      if (ref?.path === 'products') savedDocs.push({ id: `p${savedDocs.length + 1}`, ...data });
      return { id: `p${savedDocs.length}` };
    },
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    setDoc: vi.fn(),
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

const tick = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const setField = (selector: string, value: string) => {
  const el = document.querySelector(selector) as HTMLInputElement | null;
  expect(el, `campo ausente: ${selector}`).toBeTruthy();
  fireEvent.change(el!, { target: { value } });
};

const openProductForm = async () => {
  render(
    <StoreProvider>
      <App />
    </StoreProvider>
  );
  await waitFor(() => expect(document.querySelector('#nav-products-sidebar-btn')).toBeTruthy());
  fireEvent.click(document.querySelector('#nav-products-sidebar-btn')!);
  await waitFor(() => expect(document.querySelector('#list-add-product-button')).toBeTruthy());
  fireEvent.click(document.querySelector('#list-add-product-button')!);
  await waitFor(() => expect(document.querySelector('#product-form-container')).toBeTruthy());
};

describe('Fluxo Lista de Produtos', () => {
  beforeEach(() => {
    savedDocs.length = 0;
  });

  it('mostra o estado vazio próprio quando ainda não há produtos', async () => {
    render(
      <StoreProvider>
        <App />
      </StoreProvider>
    );

    await waitFor(() => expect(document.querySelector('#nav-products-sidebar-btn')).toBeTruthy());
    fireEvent.click(document.querySelector('#nav-products-sidebar-btn')!);

    await waitFor(() => expect(document.querySelector('#empty-products-state')).toBeTruthy());
    const texto = document.querySelector('#empty-products-state')!.textContent || '';
    expect(texto).toContain('Ainda não tem produtos cadastrados');
    // Sem filtros aplicados não deve aparecer a mensagem de pesquisa sem resultados.
    expect(document.querySelector('#no-search-results-state')).toBeNull();
    expect(document.querySelector('#empty-state-add-product-button')).toBeTruthy();
  });

  it('mostra a mensagem de validação quando falta um campo obrigatório', async () => {
    await openProductForm();

    fireEvent.click(document.querySelector('#form-save-button')!);
    await tick();

    const erro = document.querySelector('#form-error-alert')?.textContent || '';
    expect(erro.length).toBeGreaterThan(0);
    expect(document.querySelector('#form-error-near-save')?.textContent || '').toBe(erro);
    expect(savedDocs.length).toBe(0);
  });

  it('grava o produto e volta à lista quando o formulário está completo', async () => {
    await openProductForm();

    setField('#form-nome', 'Paracetamol 500mg');
    setField('#form-fornecedor', 'Distribuidora X');
    setField('#form-numeroFatura', 'FT-001');
    setField('#form-dataEmissaoFatura', '2026-08-01');
    setField('#form-custocompra', '1000');
    setField('#form-margem-desejada', '30');
    setField('#field-input-farmaciaPrincipioAtivo', 'Paracetamol');
    setField('#field-input-farmaciaDosagem', '500mg');
    setField('#field-input-farmaciaDataValidade', '2027-01-01');
    await tick(100);

    fireEvent.click(document.querySelector('#form-save-button')!);

    await waitFor(() => expect(savedDocs.length).toBe(1), { timeout: 3000 });
    expect(savedDocs[0].nome).toBe('Paracetamol 500mg');
    expect(document.querySelector('#form-error-alert')).toBeNull();
  });
});
