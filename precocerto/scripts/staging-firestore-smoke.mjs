#!/usr/bin/env node

/**
 * STG-01.4.2: Smoke Test Real das Firestore Rules em Staging (Control Flow Fail-Safe)
 *
 * Valida comportamento das Security Rules contra o Firestore STAGING real.
 * Usa Firebase Client SDK com autenticação real (signInWithEmailAndPassword).
 *
 * Control Flow Fail-Safe:
 * - Sem process.exit() em helpers (apenas throws)
 * - Error types tipados com exit codes
 * - Cleanup SEMPRE executado (finally garantido)
 * - Erro primário preservado nos logs
 * - Cleanup failure prioridade exit 5
 * - Sessões sempre fechadas
 * - Ponto final único de exit code (process.exitCode)
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
// ERRO TYPES TIPADOS (BASE + SUBCLASSES)
// ============================================================

class SmokeError extends Error {
  constructor(message, code, exitCode) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
  }
}

class SmokePrerequisiteError extends SmokeError {
  constructor(message, code) {
    super(message, code, 2);
  }
}

class SmokeInvalidProjectError extends SmokeError {
  constructor(message, code) {
    super(message, code, 3);
  }
}

class SmokeInfraError extends SmokeError {
  constructor(message, code) {
    super(message, code, 4);
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
  if (projectId === PRODUCTION_PROJECT_ID || projectId !== STAGING_PROJECT_ID) {
    throw new SmokeInvalidProjectError(
      `Project ID deve ser '${STAGING_PROJECT_ID}', obtido '${projectId}'`,
      'SMOKE_ABORTED_INVALID_PROJECT'
    );
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
    throw new SmokePrerequisiteError(
      `Faltam ${missing.length} variáveis obrigatórias: ${missing.join(', ')}`,
      'SMOKE_PREREQUISITES_MISSING'
    );
  }
}

function assertSmokeFixtureId(id) {
  if (!id.includes('_stg_smoke')) {
    throw new SmokeInfraError(
      `Fixture ID '${id}' não contém marcador _stg_smoke`,
      'SMOKE_UNSAFE_FIXTURE_ID'
    );
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

async function closeAllSessions(sessions) {
  const errors = [];

  for (const [label, session] of Object.entries(sessions)) {
    try {
      if (session?.auth) {
        await signOut(session.auth);
      }
      if (session?.app) {
        await deleteApp(session.app);
      }
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new SmokeInfraError(
      `Falha ao fechar ${errors.length} sessão(ões): ${errors.join('; ')}`,
      'SMOKE_SESSION_CLOSURE_FAILED'
    );
  }
}

// ============================================================
// MAPEADOR CENTRAL DE ERROS → EXIT CODE
// ============================================================

function mapErrorToExitCode(error) {
  if (error instanceof SmokePrerequisiteError) return 2;
  if (error instanceof SmokeInvalidProjectError) return 3;
  if (error instanceof SmokeInfraError) return 4;
  return 4;
}

// ============================================================
// RESOLVEDOR DE PRIORIDADE DE EXIT CODE (PURO)
// ============================================================

function resolveFinalExitCode({ primaryExitCode, cleanupFailed, sessionCloseFailed, primaryError, log }) {
  // PRIORIDADE: cleanup failure > primary error > session close > success

  if (cleanupFailed) {
    // Cleanup failure SEMPRE resulta em exit 5
    if (primaryError) {
      log(`\n⚠️  Primary failure: ${primaryError.code ?? primaryError.message}`);
    }
    log(`   Cleanup: FAIL`);
    log(`   Final Exit Code: 5`);
    return 5;
  }

  if (sessionCloseFailed && primaryExitCode === 0) {
    // Session close failure apenas se não há error primário
    log(`\n⚠️  Erro ao fechar sessões, exit code 4`);
    return 4;
  }

  // Preservar exit code primário
  return primaryExitCode;
}

// ============================================================
// BOOTSTRAP & SETUP
// ============================================================

async function ensureAdminBootstrap(adminSession) {
  const adminRef = doc(adminSession.firestore, 'users', adminSession.uid);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    throw new SmokePrerequisiteError(
      'Documento de admin não existe no Firestore',
      'SMOKE_ADMIN_BOOTSTRAP_REQUIRED'
    );
  }

  const data = adminSnap.data();

  if (data.papel !== 'admin' || data.ativo !== true) {
    throw new SmokePrerequisiteError(
      `Admin deve ter papel='admin' e ativo=true, obtido papel='${data.papel}' ativo=${data.ativo}`,
      'SMOKE_ADMIN_BOOTSTRAP_REQUIRED'
    );
  }

  if (!Array.isArray(data.lojas) ||
      !data.lojas.includes(STORE_A_ID) ||
      !data.lojas.includes(STORE_B_ID)) {
    throw new SmokePrerequisiteError(
      `Admin deve ter acesso a [${STORE_A_ID}, ${STORE_B_ID}], obtido lojas=${JSON.stringify(data.lojas)}`,
      'SMOKE_ADMIN_BOOTSTRAP_REQUIRED'
    );
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
    const userRef = doc(adminSession.firestore, 'users', actor.uid);
    const existing = await getDoc(userRef);

    if (existing.exists()) {
      throw new SmokeInfraError(
        `User ${actor.uid} já existe (colisão de fixture)`,
        'SMOKE_FIXTURE_COLLISION'
      );
    }

    await setDoc(userRef, {
      nome: actor.uid,
      papel: actor.papel,
      lojas: actor.lojas,
      ativo: actor.ativo,
      dataCriacao: new Date().toISOString(),
    });

    state.usersCreated.add(actor.uid);
  }
}

async function setupStores(adminSession, state) {
  const stores = [
    { id: STORE_A_ID, nome: 'Store A Smoke' },
    { id: STORE_B_ID, nome: 'Store B Smoke' },
  ];

  for (const store of stores) {
    const storeRef = doc(adminSession.firestore, 'stores', store.id);
    const existing = await getDoc(storeRef);

    if (existing.exists()) {
      throw new SmokeInfraError(
        `Store ${store.id} já existe (colisão de fixture)`,
        'SMOKE_FIXTURE_COLLISION'
      );
    }

    await setDoc(storeRef, {
      id: store.id,
      nome: store.nome,
      dataCriacao: new Date().toISOString(),
    });

    state.storesCreated.add(store.id);
  }
}

async function setupProducts(sessions, uids, state) {
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
    throw new SmokeInfraError(
      `Product ${PRODUCT_A_ID} já existe (colisão de fixture)`,
      'SMOKE_FIXTURE_COLLISION'
    );
  }

  await setDoc(productARef, productA);
  state.productsCreated.add(PRODUCT_A_ID);

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
    throw new SmokeInfraError(
      `Product ${PRODUCT_B_ID} já existe (colisão de fixture)`,
      'SMOKE_FIXTURE_COLLISION'
    );
  }

  await setDoc(productBRef, productB);
  state.productsCreated.add(PRODUCT_B_ID);
}

// ============================================================
// SMOKE TESTS
// ============================================================

async function runSmokeTests(sessions, uids, state) {
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
  let anonApp107;
  try {
    const anonConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
    };
    anonApp107 = initializeApp(anonConfig, 'smoke-anon');
    const anonFs = getFirestore(anonApp107);

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
  } catch (error) {
    if (error instanceof SmokeInfraError) throw error;
    throw new SmokeInfraError(`STG-SMOKE-107 setup: ${error.message}`);
  } finally {
    if (anonApp107) {
      try {
        await deleteApp(anonApp107);
      } catch (error) {
        throw new SmokeInfraError(
          'STG-SMOKE-107 anonymous app cleanup falhou',
          'ANON_APP_CLOSE_FAILED'
        );
      }
    }
  }

  // STG-SMOKE-108: Anonymous CREATE (NOVO ID SEGURO)
  let anonApp;
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
    anonApp = initializeApp(anonConfig, 'smoke-anon-2');
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
      // Se criado inesperadamente, registar no state para cleanup
      state.productsCreated.add('product_anon_stg_smoke');
    } catch (error) {
      if (error.code === 'permission-denied') {
        logTest('STG-SMOKE-108', true);
        results.negative.push(true);
      } else {
        throw new SmokeInfraError(`STG-SMOKE-108: ${error.code}`, error.code);
      }
    }
  } catch (error) {
    if (error instanceof SmokeInfraError) throw error;
    throw new SmokeInfraError(`STG-SMOKE-108 setup: ${error.message}`);
  } finally {
    if (anonApp) {
      try {
        await deleteApp(anonApp);
      } catch (error) {
        throw new SmokeInfraError(
          'STG-SMOKE-108 anonymous app cleanup falhou',
          'ANON_APP_CLOSE_FAILED'
        );
      }
    }
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
    // 1. Remover products (inclui product_anon_stg_smoke se foi criado)
    for (const productId of state.productsCreated) {
      try {
        await deleteDoc(doc(adminSession.firestore, 'products', productId));
      } catch (error) {
        // NOT_FOUND é aceitável (fixture pode ter sido deletada)
        if (error.code !== 'not-found') {
          cleanupErrors.push(`Product ${productId}: ${error.code}`);
        }
      }
    }

    // 2. Remover stores
    for (const storeId of state.storesCreated) {
      try {
        await deleteDoc(doc(adminSession.firestore, 'stores', storeId));
      } catch (error) {
        if (error.code !== 'not-found') {
          cleanupErrors.push(`Store ${storeId}: ${error.code}`);
        }
      }
    }

    // 3. Remover temporary user docs (NÃO remover admin)
    for (const userId of state.usersCreated) {
      try {
        await deleteDoc(doc(adminSession.firestore, 'users', userId));
      } catch (error) {
        if (error.code !== 'not-found') {
          cleanupErrors.push(`User ${userId}: ${error.code}`);
        }
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
// MAIN (FAIL-SAFE CONTROL FLOW)
// ============================================================

async function main() {
  const state = {
    usersCreated: new Set(),
    storesCreated: new Set(),
    productsCreated: new Set(),
  };

  let sessions = {};
  let uids = {};
  let testResults = null;

  let primaryError = null;
  let primaryExitCode = 0;
  let cleanupFailed = false;
  let sessionCloseFailed = false;

  try {
    // ========== VALIDAÇÕES ==========
    validatePrerequisites();

    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    validateProjectId(projectId);

    log(`Project: ${projectId}`);
    console.log('');

    // ========== AUTENTICAÇÃO (6 identidades) ==========
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

    // ========== BOOTSTRAP ==========
    log('Validando bootstrap do admin...');
    await ensureAdminBootstrap(sessions.admin);
    log('Admin bootstrap validado');
    console.log('');

    // ========== SETUP (fixtures) ==========
    log('Configurando fixtures...');
    await setupUsers(sessions.admin, uids, state);
    await setupStores(sessions.admin, state);
    await setupProducts(sessions, uids, state);
    log('Fixtures configuradas');
    console.log('');

    // ========== TESTES ==========
    log('Iniciando matriz de smoke tests...');
    console.log('');
    testResults = await runSmokeTests(sessions, uids, state);
    console.log('');

    // Verificar se testes passaram
    const testPass = testResults.positive.every(r => r) && testResults.negative.every(r => r);
    if (!testPass) {
      primaryExitCode = 1;
      primaryError = new Error('TEST_FAILURE: Um ou mais testes falharam');
    } else {
      primaryExitCode = 0;
    }

  } catch (error) {
    // ========== CAPTURAR ERRO PRIMÁRIO ==========
    primaryError = error;
    primaryExitCode = mapErrorToExitCode(error);
    log(`\n❌ ERRO PRIMÁRIO [Exit ${primaryExitCode}]: ${error.message}`);
    if (error.code) {
      log(`   Código: ${error.code}`);
    }

  } finally {
    // ========== CLEANUP (SEMPRE) ==========
    log(`\n🧹 Iniciando cleanup...`);

    try {
      if (sessions.admin) {
        const success = await cleanup(sessions.admin, state);
        if (!success) {
          cleanupFailed = true;
        }
      } else {
        if (state.usersCreated.size > 0 || state.storesCreated.size > 0 || state.productsCreated.size > 0) {
          log('❌ Erro: fixtures rastreadas mas sem sessão admin para limpeza');
          cleanupFailed = true;
        }
      }
      if (!cleanupFailed) {
        log(`✅ Cleanup concluído`);
      }
    } catch (cleanupError) {
      log(`❌ Erro no cleanup: ${cleanupError.message}`);
      cleanupFailed = true;
    }

    // ========== FECHAR SESSÕES (SEMPRE) ==========
    try {
      await closeAllSessions(sessions);
      log(`✅ Sessões fechadas`);
    } catch (sessionError) {
      log(`❌ Erro ao fechar sessões: ${sessionError.message}`);
      sessionCloseFailed = true;
    }

    // ========== RESUMO FINAL ==========
    log(`\n📊 RESUMO FINAL:`);
    if (testResults) {
      const positivePass = testResults.positive.filter(r => r).length;
      const negativePass = testResults.negative.filter(r => r).length;
      log(`   Testes: ${positivePass}/${testResults.positive.length} positivos, ${negativePass}/${testResults.negative.length} negativos`);
    }
    log(`   Primary Exit: ${primaryExitCode}`);
    log(`   Cleanup: ${cleanupFailed ? '❌ FAIL' : '✅ PASS'}`);
    log(`   Session Close: ${sessionCloseFailed ? '❌ FAIL' : '✅ PASS'}`);
  }

  // ========== DETERMINAR EXIT CODE FINAL (COM PRIORIDADE) ==========
  const finalExitCode = resolveFinalExitCode({
    primaryExitCode,
    cleanupFailed,
    sessionCloseFailed,
    primaryError,
    log
  });

  return finalExitCode;
}

// ========== INVOCAÇÃO ==========
const exitCode = await main();
process.exitCode = exitCode;
