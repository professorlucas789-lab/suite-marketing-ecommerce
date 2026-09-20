#!/usr/bin/env node

/**
 * STG-01.4.1: Smoke Test Real das Firestore Rules em Staging (Hardened)
 *
 * Valida comportamento das Security Rules contra o Firestore STAGING real.
 * Usa Firebase Client SDK com autenticação real (signInWithEmailAndPassword).
 *
 * Hardening aplicado:
 * - Cleanup em finally global (não apenas em sucesso)
 * - Tracking explícito de fixtures criadas
 * - Collision safety (não sobrescreve existentes)
 * - Admin membership validation (store A + B obrigatório)
 * - Classificação robusta de erros (infra vs security)
 * - Logs seguros (sem emails completos)
 * - Exit codes determinísticos por categoria
 */

import {
  initializeApp,
  deleteApp
} from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';
const STORE_A_ID = 'store_A_stg_smoke';
const STORE_B_ID = 'store_B_stg_smoke';
const PRODUCT_A_ID = 'product_A_stg_smoke';
const PRODUCT_B_ID = 'product_B_stg_smoke';

// ============================================================
// ERRO TIPADO PARA INFRA
// ============================================================

class SmokeInfraError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'SmokeInfraError';
    this.code = code;
  }
}

// ============================================================
// HELPERS
// ============================================================

function log(...args) {
  console.log('[STG-SMOKE]', ...args);
}

function logTest(testId, result, message = '') {
  const status = result ? 'PASS' : 'FAIL';
  console.log(`${testId} ${status}${message ? ' - ' + message : ''}`);
}

async function expectAllow(operation, testId) {
  try {
    await operation();
    logTest(testId, true);
    return true;
  } catch (error) {
    if (error.code === 'permission-denied') {
      logTest(testId, false, 'Esperado ALLOW, obtido permission-denied');
      return false;
    }
    throw new SmokeInfraError(
      `${testId}: Erro ao executar operação permitida: ${error.code}`,
      error.code
    );
  }
}

async function expectDeny(operation, testId) {
  try {
    await operation();
    logTest(testId, false, 'Esperado DENY, operação foi permitida');
    return false;
  } catch (error) {
    if (error.code === 'permission-denied') {
      logTest(testId, true);
      return true;
    }
    throw new SmokeInfraError(
      `${testId}: Erro ao validar DENY: ${error.code}`,
      error.code
    );
  }
}

function validateProjectId(projectId) {
  if (projectId === PRODUCTION_PROJECT_ID) {
    console.error('SMOKE_ABORTED_INVALID_PROJECT');
    process.exit(3);
  }

  if (projectId !== STAGING_PROJECT_ID) {
    console.error('SMOKE_ABORTED_INVALID_PROJECT');
    process.exit(3);
  }
}

function validatePrerequisites() {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'STG_SMOKE_ADMIN_EMAIL',
    'STG_SMOKE_ADMIN_PASSWORD',
    'STG_SMOKE_MANAGER_A_EMAIL',
    'STG_SMOKE_MANAGER_A_PASSWORD',
    'STG_SMOKE_FUNC_A_EMAIL',
    'STG_SMOKE_FUNC_A_PASSWORD',
    'STG_SMOKE_FUNC_A2_EMAIL',
    'STG_SMOKE_FUNC_A2_PASSWORD',
    'STG_SMOKE_FUNC_B_EMAIL',
    'STG_SMOKE_FUNC_B_PASSWORD',
    'STG_SMOKE_DEACTIVATED_EMAIL',
    'STG_SMOKE_DEACTIVATED_PASSWORD',
  ];

  const missing = required.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('SMOKE_PREREQUISITES_MISSING');
    missing.forEach(v => console.error(`  - ${v}`));
    process.exit(2);
  }
}

function assertSmokeFixtureId(id) {
  if (!id.includes('_stg_smoke')) {
    throw new Error(`SMOKE_UNSAFE_FIXTURE_ID: ${id} não contém marcador _stg_smoke`);
  }
}

// ============================================================
// AUTENTICAÇÃO ISOLADA POR ACTOR
// ============================================================

async function createAuthSession(email, password, appName, actorLabel) {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(config, appName);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      app,
      auth,
      firestore,
      uid: userCredential.user.uid,
      user: userCredential.user,
    };
  } catch (error) {
    await deleteApp(app);
    throw new SmokeInfraError(
      `Falha de autenticação para actor ${actorLabel}: ${error.code}`,
      error.code
    );
  }
}

async function closeAuthSession(session) {
  if (!session) return;
  try {
    await signOut(session.auth);
  } catch (e) {
    // Ignorar erros de signOut
  }
  try {
    await deleteApp(session.app);
  } catch (e) {
    // Ignorar erros de deleteApp duplo
  }
}

// ============================================================
// BOOTSTRAP & SETUP
// ============================================================

async function ensureAdminBootstrap(adminSession) {
  const adminRef = doc(adminSession.firestore, 'users', adminSession.uid);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    console.error('SMOKE_ADMIN_BOOTSTRAP_REQUIRED');
    process.exit(2);
  }

  const data = adminSnap.data();

  // Verificações obrigatórias
  if (data.papel !== 'admin' || data.ativo !== true) {
    console.error('SMOKE_ADMIN_BOOTSTRAP_REQUIRED');
    process.exit(2);
  }

  // NOVO: Verificar membership obrigatória em ambas as stores
  if (!Array.isArray(data.lojas) ||
      !data.lojas.includes(STORE_A_ID) ||
      !data.lojas.includes(STORE_B_ID)) {
    console.error('SMOKE_ADMIN_BOOTSTRAP_REQUIRED');
    console.error(`Admin deve ter lojas: [${STORE_A_ID}, ${STORE_B_ID}]`);
    process.exit(2);
  }
}

async function setupUsers(adminSession, uids, state) {
  const usersToSetup = [
    {
      uid: uids.managerAUid,
      papel: 'loja-manager',
      lojas: [STORE_A_ID],
      ativo: true,
    },
    {
      uid: uids.funcAUid,
      papel: 'funcionario',
      lojas: [STORE_A_ID],
      ativo: true,
    },
    {
      uid: uids.funcA2Uid,
      papel: 'funcionario',
      lojas: [STORE_A_ID],
      ativo: true,
    },
    {
      uid: uids.funcBUid,
      papel: 'funcionario',
      lojas: [STORE_B_ID],
      ativo: true,
    },
    {
      uid: uids.deactivatedUid,
      papel: 'funcionario',
      lojas: [STORE_A_ID],
      ativo: false,
    },
  ];

  for (const actor of usersToSetup) {
    // NOVO: Verificar colisão antes de escrever
    const userRef = doc(adminSession.firestore, 'users', actor.uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
      console.error('SMOKE_FIXTURE_COLLISION');
      console.error(`User ${actor.uid} já existe`);
      process.exit(4);
    }

    // Criar novo
    await setDoc(userRef, {
      nome: actor.uid,
      papel: actor.papel,
      lojas: actor.lojas,
      ativo: actor.ativo,
      dataCriacao: new Date().toISOString(),
    });

    // Registar no tracking
    state.usersCreated.add(actor.uid);
  }
}

async function setupStores(adminSession, state) {
  const stores = [
    { id: STORE_A_ID, nome: 'Store A Smoke' },
    { id: STORE_B_ID, nome: 'Store B Smoke' },
  ];

  for (const store of stores) {
    // NOVO: Verificar colisão
    const storeRef = doc(adminSession.firestore, 'stores', store.id);
    const existing = await getDoc(storeRef);

    if (existing.exists()) {
      console.error('SMOKE_FIXTURE_COLLISION');
      console.error(`Store ${store.id} já existe`);
      process.exit(4);
    }

    // Criar novo
    await setDoc(storeRef, {
      id: store.id,
      nome: store.nome,
      dataCriacao: new Date().toISOString(),
    });

    state.storesCreated.add(store.id);
  }
}

async function setupProducts(sessions, uids, state) {
  // funcA cria product_A
  const productA = {
    id: PRODUCT_A_ID,
    storeId: STORE_A_ID,
    userId: uids.funcAUid,
    nome: 'Product A Smoke',
    precoVenda: 10.00,
  };

  const productARef = doc(sessions.funcA.firestore, 'products', PRODUCT_A_ID);
  const existingA = await getDoc(productARef);

  if (existingA.exists()) {
    console.error('SMOKE_FIXTURE_COLLISION');
    console.error(`Product ${PRODUCT_A_ID} já existe`);
    process.exit(4);
  }

  await setDoc(productARef, productA);
  state.productsCreated.add(PRODUCT_A_ID);

  // funcB cria product_B
  const productB = {
    id: PRODUCT_B_ID,
    storeId: STORE_B_ID,
    userId: uids.funcBUid,
    nome: 'Product B Smoke',
    precoVenda: 20.00,
  };

  const productBRef = doc(sessions.funcB.firestore, 'products', PRODUCT_B_ID);
  const existingB = await getDoc(productBRef);

  if (existingB.exists()) {
    console.error('SMOKE_FIXTURE_COLLISION');
    console.error(`Product ${PRODUCT_B_ID} já existe`);
    process.exit(4);
  }

  await setDoc(productBRef, productB);
  state.productsCreated.add(PRODUCT_B_ID);
}

// ============================================================
// SMOKE TESTS
// ============================================================

async function runSmokeTests(sessions, uids) {
  const results = {
    positive: [],
    negative: [],
  };

  log('Executando testes positivos...');

  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.admin.firestore, 'users', uids.adminUid)),
      'STG-SMOKE-001'
    )
  );

  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.funcA.firestore, 'users', uids.funcAUid)),
      'STG-SMOKE-002'
    )
  );

  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.funcA.firestore, 'products', PRODUCT_A_ID)),
      'STG-SMOKE-003'
    )
  );

  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.funcA2.firestore, 'products', PRODUCT_A_ID)),
      'STG-SMOKE-004'
    )
  );

  results.positive.push(
    await expectAllow(
      async () => {
        await updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 12.50,
        });
        await updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 10.00,
        });
      },
      'STG-SMOKE-005'
    )
  );

  results.positive.push(
    await expectAllow(
      async () => {
        await updateDoc(doc(sessions.admin.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 11.00,
        });
        await updateDoc(doc(sessions.admin.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 10.00,
        });
      },
      'STG-SMOKE-006'
    )
  );

  log('Executando testes negativos...');

  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.funcA.firestore, 'users', uids.funcAUid), {
        papel: 'admin',
      }),
      'STG-SMOKE-101'
    )
  );

  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.funcA.firestore, 'users', uids.funcAUid), {
        lojas: [STORE_A_ID, STORE_B_ID],
      }),
      'STG-SMOKE-102'
    )
  );

  const smoke103Read = await expectAllow(
    () => getDoc(doc(sessions.deactivated.firestore, 'users', uids.deactivatedUid)),
    'STG-SMOKE-103a'
  );
  const smoke103Deny = await expectDeny(
    () => getDoc(doc(sessions.deactivated.firestore, 'products', PRODUCT_A_ID)),
    'STG-SMOKE-103b'
  );
  results.negative.push(smoke103Read && smoke103Deny);

  results.negative.push(
    await expectDeny(
      () => getDoc(doc(sessions.funcA.firestore, 'products', PRODUCT_B_ID)),
      'STG-SMOKE-104'
    )
  );

  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
        storeId: STORE_B_ID,
      }),
      'STG-SMOKE-105'
    )
  );

  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
        userId: uids.managerAUid,
      }),
      'STG-SMOKE-106'
    )
  );

  // STG-SMOKE-107: Anonymous user read
  try {
    const anonConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    };
    const anonApp = initializeApp(anonConfig, 'smoke-anon');
    const anonFs = getFirestore(anonApp);

    try {
      await getDoc(doc(anonFs, 'users', uids.adminUid));
      logTest('STG-SMOKE-107', false, 'Esperado DENY para anonymous');
      results.negative.push(false);
    } catch (error) {
      if (error.code === 'permission-denied') {
        logTest('STG-SMOKE-107', true);
        results.negative.push(true);
      } else {
        throw new SmokeInfraError(`STG-SMOKE-107: ${error.code}`, error.code);
      }
    }
    await deleteApp(anonApp);
  } catch (error) {
    if (error instanceof SmokeInfraError) throw error;
    throw new SmokeInfraError(`STG-SMOKE-107 setup: ${error.message}`);
  }

  // STG-SMOKE-108: Anonymous CREATE (NOVO ID SEGURO)
  try {
    assertSmokeFixtureId('product_anon_stg_smoke');

    const anonConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    };
    const anonApp = initializeApp(anonConfig, 'smoke-anon-2');
    const anonFs = getFirestore(anonApp);

    try {
      await setDoc(doc(anonFs, 'products', 'product_anon_stg_smoke'), {
        id: 'product_anon_stg_smoke',
        storeId: STORE_A_ID,
        userId: uids.funcAUid,
        nome: 'Anonymous Smoke Product',
        precoVenda: 1,
      });
      logTest('STG-SMOKE-108', false, 'Esperado DENY para anonymous');
      results.negative.push(false);
      // Se permitido inesperadamente, registar para cleanup
      // (será limpo no cleanup abaixo)
    } catch (error) {
      if (error.code === 'permission-denied') {
        logTest('STG-SMOKE-108', true);
        results.negative.push(true);
      } else {
        throw new SmokeInfraError(`STG-SMOKE-108: ${error.code}`, error.code);
      }
    }
    await deleteApp(anonApp);
  } catch (error) {
    if (error instanceof SmokeInfraError) throw error;
    throw new SmokeInfraError(`STG-SMOKE-108 setup: ${error.message}`);
  }

  results.negative.push(
    await expectDeny(
      () => getDoc(doc(sessions.funcA.firestore, 'unknownCollection', 'smoke')),
      'STG-SMOKE-109'
    )
  );

  return results;
}

// ============================================================
// CLEANUP (NOVO: GLOBAL, ROBUSTO)
// ============================================================

async function cleanup(adminSession, state) {
  log('Executando cleanup...');

  let cleanupErrors = [];

  try {
    // 1. Remover products
    for (const productId of state.productsCreated) {
      try {
        await deleteDoc(doc(adminSession.firestore, 'products', productId));
      } catch (error) {
        cleanupErrors.push(`Product ${productId}: ${error.code}`);
      }
    }

    // Tentar remover produto anon se foi criado inesperadamente
    try {
      await deleteDoc(doc(adminSession.firestore, 'products', 'product_anon_stg_smoke'));
    } catch (error) {
      // Ignorar se não existe (esperado)
    }

    // 2. Remover stores
    for (const storeId of state.storesCreated) {
      try {
        await deleteDoc(doc(adminSession.firestore, 'stores', storeId));
      } catch (error) {
        cleanupErrors.push(`Store ${storeId}: ${error.code}`);
      }
    }

    // 3. Remover temporary user docs (NÃO remover admin)
    for (const userId of state.usersCreated) {
      try {
        await deleteDoc(doc(adminSession.firestore, 'users', userId));
      } catch (error) {
        cleanupErrors.push(`User ${userId}: ${error.code}`);
      }
    }

    if (cleanupErrors.length > 0) {
      log('⚠️ Erros durante cleanup:');
      cleanupErrors.forEach(err => log(`  - ${err}`));
      return false;
    }

    log('Cleanup concluído com sucesso');
    return true;

  } catch (error) {
    log('❌ Erro crítico durante cleanup:', error.message);
    return false;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  // Validar pré-requisitos
  validatePrerequisites();

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  validateProjectId(projectId);

  log(`Project: ${projectId}`);
  console.log('');

  // NOVO: Tracking global de estado
  const state = {
    usersCreated: new Set(),
    storesCreated: new Set(),
    productsCreated: new Set(),
  };

  let sessions = {};
  let uids = {};
  let testResults = null;
  let cleanupSuccess = true;

  try {
    try {
      // Criar sessões
      log('Autenticando actors...');

      sessions.admin = await createAuthSession(
        process.env.STG_SMOKE_ADMIN_EMAIL,
        process.env.STG_SMOKE_ADMIN_PASSWORD,
        'smoke-admin',
        'ADMIN'
      );
      uids.adminUid = sessions.admin.uid;

      sessions.managerA = await createAuthSession(
        process.env.STG_SMOKE_MANAGER_A_EMAIL,
        process.env.STG_SMOKE_MANAGER_A_PASSWORD,
        'smoke-manager-a',
        'MANAGER_A'
      );
      uids.managerAUid = sessions.managerA.uid;

      sessions.funcA = await createAuthSession(
        process.env.STG_SMOKE_FUNC_A_EMAIL,
        process.env.STG_SMOKE_FUNC_A_PASSWORD,
        'smoke-func-a',
        'FUNC_A'
      );
      uids.funcAUid = sessions.funcA.uid;

      sessions.funcA2 = await createAuthSession(
        process.env.STG_SMOKE_FUNC_A2_EMAIL,
        process.env.STG_SMOKE_FUNC_A2_PASSWORD,
        'smoke-func-a2',
        'FUNC_A2'
      );
      uids.funcA2Uid = sessions.funcA2.uid;

      sessions.funcB = await createAuthSession(
        process.env.STG_SMOKE_FUNC_B_EMAIL,
        process.env.STG_SMOKE_FUNC_B_PASSWORD,
        'smoke-func-b',
        'FUNC_B'
      );
      uids.funcBUid = sessions.funcB.uid;

      sessions.deactivated = await createAuthSession(
        process.env.STG_SMOKE_DEACTIVATED_EMAIL,
        process.env.STG_SMOKE_DEACTIVATED_PASSWORD,
        'smoke-deactivated',
        'DEACTIVATED'
      );
      uids.deactivatedUid = sessions.deactivated.uid;

      log('Autenticação concluída');
      console.log('');

      // Validar admin bootstrap
      log('Validando bootstrap do admin...');
      await ensureAdminBootstrap(sessions.admin);
      log('Admin bootstrap validado');
      console.log('');

      // Setup
      log('Configurando fixtures...');
      await setupUsers(sessions.admin, uids, state);
      await setupStores(sessions.admin, state);
      await setupProducts(sessions, uids, state);
      log('Fixtures configuradas');
      console.log('');

      // Executar testes
      log('Iniciando matriz de smoke tests...');
      console.log('');
      testResults = await runSmokeTests(sessions, uids);
      console.log('');

    } catch (error) {
      if (error instanceof SmokeInfraError) {
        throw error;
      }
      throw new SmokeInfraError(`Setup/Test error: ${error.message}`, 'SETUP_FAILED');
    }

  } finally {
    // NOVO: CLEANUP SEMPRE EXECUTADO
    try {
      cleanupSuccess = await cleanup(sessions.admin, state);
    } catch (error) {
      log('❌ Erro ao executar cleanup:', error.message);
      cleanupSuccess = false;
    }

    // Fechar sessões
    console.log('');
    for (const [key, session] of Object.entries(sessions)) {
      await closeAuthSession(session);
    }

    // Exibir resumo
    if (testResults) {
      log('SUMMARY');
      const positivePass = testResults.positive.filter(r => r).length;
      const negativePass = testResults.negative.filter(r => r).length;
      console.log(`Positive: ${positivePass}/${testResults.positive.length}`);
      console.log(`Negative: ${negativePass}/${testResults.negative.length}`);
      console.log(`Total: ${positivePass + negativePass}/${testResults.positive.length + testResults.negative.length}`);
      console.log(`Cleanup: ${cleanupSuccess ? 'PASS' : 'FAIL'}`);
      console.log('');

      // Determinar resultado final
      const testPass = testResults.positive.every(r => r) && testResults.negative.every(r => r);
      if (testPass && cleanupSuccess) {
        log('Result: PASS');
        process.exit(0);
      } else {
        log('Result: FAIL');
        process.exit(1);
      }
    } else {
      // Erro antes de testes
      if (cleanupSuccess) {
        process.exit(4);
      } else {
        process.exit(5);
      }
    }
  }
}

main().catch(error => {
  if (error instanceof SmokeInfraError) {
    log(`Infra Error: ${error.message}`);
    process.exit(4);
  }
  log(`Fatal Error: ${error.message}`);
  process.exit(4);
});
