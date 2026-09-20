#!/usr/bin/env node

/**
 * STG-01.4: Smoke Test Real das Firestore Rules em Staging
 *
 * Valida comportamento das Security Rules contra o Firestore STAGING real.
 * Usa Firebase Client SDK com autenticação real (signInWithEmailAndPassword).
 *
 * NÃO usa Admin SDK ou withSecurityRulesDisabled.
 * NÃO toca produção (precocerto-cc04a).
 * NÃO deleta Auth users (apenas Firestore fixtures).
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
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';

// IDs de lojas de smoke (com marcador _stg_smoke)
const STORE_A_ID = 'store_A_stg_smoke';
const STORE_B_ID = 'store_B_stg_smoke';

// IDs de produtos de smoke (com marcador _stg_smoke)
const PRODUCT_A_ID = 'product_A_stg_smoke';
const PRODUCT_B_ID = 'product_B_stg_smoke';

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
    const result = await operation();
    logTest(testId, true);
    return true;
  } catch (error) {
    logTest(testId, false, `Esperado ALLOW, obtido: ${error.code}`);
    return false;
  }
}

async function expectDeny(operation, testId) {
  try {
    const result = await operation();
    logTest(testId, false, 'Esperado DENY, operação foi permitida');
    return false;
  } catch (error) {
    if (error.code === 'permission-denied') {
      logTest(testId, true);
      return true;
    }
    logTest(testId, false, `Esperado permission-denied, obtido: ${error.code}`);
    return false;
  }
}

function validateProjectId(projectId) {
  if (projectId === PRODUCTION_PROJECT_ID) {
    console.error('SMOKE_ABORTED_INVALID_PROJECT');
    console.error(`Detectado projectId de PRODUÇÃO: ${projectId}`);
    process.exit(3);
  }

  if (projectId !== STAGING_PROJECT_ID) {
    console.error('SMOKE_ABORTED_INVALID_PROJECT');
    console.error(`ProjectId inválido. Esperado: ${STAGING_PROJECT_ID}, Recebido: ${projectId}`);
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

// ============================================================
// AUTENTICAÇÃO ISOLADA POR ACTOR
// ============================================================

async function createAuthSession(email, password, appName) {
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
    throw new Error(`Falha de autenticação para ${email}: ${error.code}`);
  }
}

async function closeAuthSession(session) {
  if (!session) return;
  try {
    await signOut(session.auth);
  } catch (e) {
    // Ignorar erros de signOut
  }
  await deleteApp(session.app);
}

// ============================================================
// BOOTSTRAP & SETUP
// ============================================================

async function ensureAdminBootstrap(adminSession) {
  const adminRef = doc(adminSession.firestore, 'users', adminSession.uid);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    console.error('SMOKE_ADMIN_BOOTSTRAP_REQUIRED');
    console.error(`Admin user ${adminSession.uid} não existe em Firestore`);
    console.error('Execute STG-01.4A para criar Auth users e bootstrapar admin');
    process.exit(2);
  }

  const data = adminSnap.data();
  if (data.papel !== 'admin' || data.ativo !== true) {
    console.error('SMOKE_ADMIN_BOOTSTRAP_REQUIRED');
    console.error(`Admin user não possui papel=admin ou ativo=true`);
    process.exit(2);
  }
}

async function setupUsers(adminSession, uids) {
  // Criar/atualizar profiles dos demais actors (como admin autenticado)
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
    await setDoc(userRef, {
      nome: actor.uid,
      papel: actor.papel,
      lojas: actor.lojas,
      ativo: actor.ativo,
      dataCriacao: new Date().toISOString(),
    }, { merge: true });
  }
}

async function setupStores(adminSession) {
  const stores = [
    { id: STORE_A_ID, nome: 'Store A Smoke' },
    { id: STORE_B_ID, nome: 'Store B Smoke' },
  ];

  for (const store of stores) {
    const storeRef = doc(adminSession.firestore, 'stores', store.id);
    await setDoc(storeRef, {
      id: store.id,
      nome: store.nome,
      dataCriacao: new Date().toISOString(),
    }, { merge: true });
  }
}

async function setupProducts(sessions, uids) {
  // funcA cria product_A_stg_smoke
  const productA = {
    id: PRODUCT_A_ID,
    storeId: STORE_A_ID,
    userId: uids.funcAUid,
    nome: 'Product A Smoke',
    precoVenda: 10.00,
  };

  const productARef = doc(sessions.funcA.firestore, 'products', PRODUCT_A_ID);
  await setDoc(productARef, productA);

  // funcB cria product_B_stg_smoke
  const productB = {
    id: PRODUCT_B_ID,
    storeId: STORE_B_ID,
    userId: uids.funcBUid,
    nome: 'Product B Smoke',
    precoVenda: 20.00,
  };

  const productBRef = doc(sessions.funcB.firestore, 'products', PRODUCT_B_ID);
  await setDoc(productBRef, productB);
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

  // STG-SMOKE-001: Admin lê seu próprio profile
  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.admin.firestore, 'users', uids.adminUid)),
      'STG-SMOKE-001'
    )
  );

  // STG-SMOKE-002: FuncA lê seu próprio profile
  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.funcA.firestore, 'users', uids.funcAUid)),
      'STG-SMOKE-002'
    )
  );

  // STG-SMOKE-003: FuncA lê product_A_stg_smoke
  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.funcA.firestore, 'products', PRODUCT_A_ID)),
      'STG-SMOKE-003'
    )
  );

  // STG-SMOKE-004: FuncA2 lê product_A_stg_smoke (mesma store)
  results.positive.push(
    await expectAllow(
      () => getDoc(doc(sessions.funcA2.firestore, 'products', PRODUCT_A_ID)),
      'STG-SMOKE-004'
    )
  );

  // STG-SMOKE-005: ManagerA atualiza campo normal de product_A
  results.positive.push(
    await expectAllow(
      async () => {
        await updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 12.50,
        });
        // Restaurar valor
        await updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 10.00,
        });
      },
      'STG-SMOKE-005'
    )
  );

  // STG-SMOKE-006: Admin atualiza product_A (por ter store nas lojas)
  results.positive.push(
    await expectAllow(
      async () => {
        await updateDoc(doc(sessions.admin.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 11.00,
        });
        // Restaurar
        await updateDoc(doc(sessions.admin.firestore, 'products', PRODUCT_A_ID), {
          precoVenda: 10.00,
        });
      },
      'STG-SMOKE-006'
    )
  );

  log('Executando testes negativos...');

  // STG-SMOKE-101: FuncA tenta alterar próprio papel para admin
  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.funcA.firestore, 'users', uids.funcAUid), {
        papel: 'admin',
      }),
      'STG-SMOKE-101'
    )
  );

  // STG-SMOKE-102: FuncA tenta adicionar store_B às suas lojas
  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.funcA.firestore, 'users', uids.funcAUid), {
        lojas: [STORE_A_ID, STORE_B_ID],
      }),
      'STG-SMOKE-102'
    )
  );

  // STG-SMOKE-103: Deactivated lê seu profile (ALLOW) mas não pode ler products (DENY)
  const smoke103Read = await expectAllow(
    () => getDoc(doc(sessions.deactivated.firestore, 'users', uids.deactivatedUid)),
    'STG-SMOKE-103a'
  );
  const smoke103Deny = await expectDeny(
    () => getDoc(doc(sessions.deactivated.firestore, 'products', PRODUCT_A_ID)),
    'STG-SMOKE-103b'
  );
  results.negative.push(smoke103Read && smoke103Deny);

  // STG-SMOKE-104: FuncA tenta ler product_B_stg_smoke
  results.negative.push(
    await expectDeny(
      () => getDoc(doc(sessions.funcA.firestore, 'products', PRODUCT_B_ID)),
      'STG-SMOKE-104'
    )
  );

  // STG-SMOKE-105: ManagerA tenta alterar storeId de product_A para store_B
  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
        storeId: STORE_B_ID,
      }),
      'STG-SMOKE-105'
    )
  );

  // STG-SMOKE-106: ManagerA tenta alterar userId de product_A para si mesmo
  results.negative.push(
    await expectDeny(
      () => updateDoc(doc(sessions.managerA.firestore, 'products', PRODUCT_A_ID), {
        userId: uids.managerAUid,
      }),
      'STG-SMOKE-106'
    )
  );

  // STG-SMOKE-107: Anonymous não consegue ler user profile
  // (Sem sessão autenticada, falha com auth error, não permission-denied)
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
        logTest('STG-SMOKE-107', false, `Esperado permission-denied, obtido: ${error.code}`);
        results.negative.push(false);
      }
    }
    await deleteApp(anonApp);
  } catch (error) {
    logTest('STG-SMOKE-107', false, `Erro ao testar anonymous: ${error.message}`);
    results.negative.push(false);
  }

  // STG-SMOKE-108: Anonymous tenta criar product
  try {
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
      await setDoc(doc(anonFs, 'products', 'test'), { test: true });
      logTest('STG-SMOKE-108', false, 'Esperado DENY para anonymous');
      results.negative.push(false);
    } catch (error) {
      if (error.code === 'permission-denied') {
        logTest('STG-SMOKE-108', true);
        results.negative.push(true);
      } else {
        logTest('STG-SMOKE-108', false, `Esperado permission-denied, obtido: ${error.code}`);
        results.negative.push(false);
      }
    }
    await deleteApp(anonApp);
  } catch (error) {
    logTest('STG-SMOKE-108', false, `Erro ao testar anonymous: ${error.message}`);
    results.negative.push(false);
  }

  // STG-SMOKE-109: FuncA tenta ler unknown collection
  results.negative.push(
    await expectDeny(
      () => getDoc(doc(sessions.funcA.firestore, 'unknownCollection', 'smoke')),
      'STG-SMOKE-109'
    )
  );

  return results;
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup(adminSession) {
  log('Executando cleanup...');

  try {
    // Remover produtos
    await deleteDoc(doc(adminSession.firestore, 'products', PRODUCT_A_ID));
    await deleteDoc(doc(adminSession.firestore, 'products', PRODUCT_B_ID));

    // Remover stores
    await deleteDoc(doc(adminSession.firestore, 'stores', STORE_A_ID));
    await deleteDoc(doc(adminSession.firestore, 'stores', STORE_B_ID));

    // Remover user docs (NOT Auth accounts)
    const uidsToDelete = [
      // adminUid NOT deleted
      // managerAUid, funcAUid, etc. - deixar persist para próximos testes
    ];

    log('Cleanup concluído');
  } catch (error) {
    console.error('Erro durante cleanup:', error.code);
    process.exit(5);
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

  let sessions = {};
  let uids = {};

  try {
    // Criar sessões autenticadas para cada actor
    log('Autenticando actors...');

    sessions.admin = await createAuthSession(
      process.env.STG_SMOKE_ADMIN_EMAIL,
      process.env.STG_SMOKE_ADMIN_PASSWORD,
      'smoke-admin'
    );
    uids.adminUid = sessions.admin.uid;

    sessions.managerA = await createAuthSession(
      process.env.STG_SMOKE_MANAGER_A_EMAIL,
      process.env.STG_SMOKE_MANAGER_A_PASSWORD,
      'smoke-manager-a'
    );
    uids.managerAUid = sessions.managerA.uid;

    sessions.funcA = await createAuthSession(
      process.env.STG_SMOKE_FUNC_A_EMAIL,
      process.env.STG_SMOKE_FUNC_A_PASSWORD,
      'smoke-func-a'
    );
    uids.funcAUid = sessions.funcA.uid;

    sessions.funcA2 = await createAuthSession(
      process.env.STG_SMOKE_FUNC_A2_EMAIL,
      process.env.STG_SMOKE_FUNC_A2_PASSWORD,
      'smoke-func-a2'
    );
    uids.funcA2Uid = sessions.funcA2.uid;

    sessions.funcB = await createAuthSession(
      process.env.STG_SMOKE_FUNC_B_EMAIL,
      process.env.STG_SMOKE_FUNC_B_PASSWORD,
      'smoke-func-b'
    );
    uids.funcBUid = sessions.funcB.uid;

    sessions.deactivated = await createAuthSession(
      process.env.STG_SMOKE_DEACTIVATED_EMAIL,
      process.env.STG_SMOKE_DEACTIVATED_PASSWORD,
      'smoke-deactivated'
    );
    uids.deactivatedUid = sessions.deactivated.uid;

    log('Autenticação concluída');
    console.log('');

    // Validar bootstrap do admin
    log('Validando bootstrap do admin...');
    await ensureAdminBootstrap(sessions.admin);
    log('Admin bootstrap validado');
    console.log('');

    // Setup: criar users
    log('Configurando user profiles...');
    await setupUsers(sessions.admin, uids);
    log('User profiles configurados');
    console.log('');

    // Setup: criar stores
    log('Configurando stores...');
    await setupStores(sessions.admin);
    log('Stores configuradas');
    console.log('');

    // Setup: criar products
    log('Configurando products...');
    await setupProducts(sessions, uids);
    log('Products configurados');
    console.log('');

    // Executar smoke tests
    log('Iniciando matriz de smoke tests...');
    console.log('');
    const results = await runSmokeTests(sessions, uids);
    console.log('');

    // Exibir resumo
    log('SUMMARY');
    const positivePass = results.positive.filter(r => r).length;
    const negativePass = results.negative.filter(r => r).length;
    console.log(`Positive: ${positivePass}/${results.positive.length}`);
    console.log(`Negative: ${negativePass}/${results.negative.length}`);
    console.log(`Total: ${positivePass + negativePass}/${results.positive.length + results.negative.length}`);
    console.log('');

    // Cleanup
    await cleanup(sessions.admin);
    console.log('');

    // Fechar todas as sessões
    for (const [key, session] of Object.entries(sessions)) {
      await closeAuthSession(session);
    }

    // Determinar resultado final
    const allPass = results.positive.every(r => r) && results.negative.every(r => r);
    if (allPass) {
      log('Result: PASS');
      process.exit(0);
    } else {
      log('Result: FAIL');
      process.exit(1);
    }

  } catch (error) {
    console.error(`Erro fatal: ${error.message}`);

    // Fechar sessões abertas
    for (const [key, session] of Object.entries(sessions)) {
      await closeAuthSession(session);
    }

    process.exit(4);
  }
}

main();
