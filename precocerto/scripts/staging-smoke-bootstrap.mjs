#!/usr/bin/env node

/**
 * STG-01.4.3A: Bootstrap Seguro das Contas de Smoke Test em Firebase STAGING
 *
 * Objetivo:
 * - Preparar as 6 contas Firebase Authentication necessárias ao smoke test
 * - Configurar documento admin com metadados Firestore
 * - Validar ausência de fixtures residuais
 * - Proteger contra acesso acidental a produção
 *
 * Segurança:
 * - Bloqueia imediatamente se projectId === produção
 * - Valida projectId === precocerto-staging
 * - Usa Firebase Admin SDK com applicationDefault()
 * - NÃO imprime passwords
 * - NÃO cria service-account JSON, private key ou tokens
 * - Falha-rápido em caso de inconsistência
 *
 * Dependências de Variáveis de Ambiente:
 * - VITE_FIREBASE_PROJECT_ID (deve ser precocerto-staging)
 * - STG_SMOKE_ADMIN_EMAIL
 * - STG_SMOKE_ADMIN_PASSWORD
 * - STG_SMOKE_MANAGER_A_EMAIL
 * - STG_SMOKE_MANAGER_A_PASSWORD
 * - STG_SMOKE_FUNC_A_EMAIL
 * - STG_SMOKE_FUNC_A_PASSWORD
 * - STG_SMOKE_FUNC_A2_EMAIL
 * - STG_SMOKE_FUNC_A2_PASSWORD
 * - STG_SMOKE_FUNC_B_EMAIL
 * - STG_SMOKE_FUNC_B_PASSWORD
 * - STG_SMOKE_DEACTIVATED_EMAIL
 * - STG_SMOKE_DEACTIVATED_PASSWORD
 */

import {
  initializeApp,
  applicationDefault
} from 'firebase-admin/app';
import {
  getAuth
} from 'firebase-admin/auth';
import {
  getFirestore
} from 'firebase-admin/firestore';

// ============================================================
// CONFIGURAÇÃO E VALIDAÇÕES
// ============================================================

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';
const STORE_A_ID = 'store_A_stg_smoke';
const STORE_B_ID = 'store_B_stg_smoke';

// Fixtures que devem estar ausentes
const RESIDUAL_FIXTURES = [
  ['stores', STORE_A_ID],
  ['stores', STORE_B_ID],
  ['products', 'product_A_stg_smoke'],
  ['products', 'product_B_stg_smoke'],
  ['products', 'product_anon_stg_smoke'],
];

// Atores a criar com mapeamento explícito de env vars
const ACTORS = [
  { key: 'admin', emailEnv: 'STG_SMOKE_ADMIN_EMAIL', passwordEnv: 'STG_SMOKE_ADMIN_PASSWORD', papel: 'admin', lojas: [STORE_A_ID, STORE_B_ID], ativo: true, createUserDoc: true },
  { key: 'managerA', emailEnv: 'STG_SMOKE_MANAGER_A_EMAIL', passwordEnv: 'STG_SMOKE_MANAGER_A_PASSWORD', papel: 'loja-manager', lojas: [STORE_A_ID], ativo: true, createUserDoc: false },
  { key: 'funcA', emailEnv: 'STG_SMOKE_FUNC_A_EMAIL', passwordEnv: 'STG_SMOKE_FUNC_A_PASSWORD', papel: 'funcionario', lojas: [STORE_A_ID], ativo: true, createUserDoc: false },
  { key: 'funcA2', emailEnv: 'STG_SMOKE_FUNC_A2_EMAIL', passwordEnv: 'STG_SMOKE_FUNC_A2_PASSWORD', papel: 'funcionario', lojas: [STORE_A_ID], ativo: true, createUserDoc: false },
  { key: 'funcB', emailEnv: 'STG_SMOKE_FUNC_B_EMAIL', passwordEnv: 'STG_SMOKE_FUNC_B_PASSWORD', papel: 'funcionario', lojas: [STORE_B_ID], ativo: true, createUserDoc: false },
  { key: 'deactivated', emailEnv: 'STG_SMOKE_DEACTIVATED_EMAIL', passwordEnv: 'STG_SMOKE_DEACTIVATED_PASSWORD', papel: 'funcionario', lojas: [STORE_A_ID], ativo: false, createUserDoc: false },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function log(...args) {
  console.log('[STG-SMOKE-BOOTSTRAP]', ...args);
}

function maskEmail(email) {
  if (!email || email.length < 5) return '***';
  const parts = email.split('@');
  return `${parts[0].substring(0, 2)}***@${parts[1]}`;
}

function validateEnvironment() {
  const required = [
    'VITE_FIREBASE_PROJECT_ID',
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
    throw new Error(
      `Variáveis de ambiente faltantes (${missing.length}): ${missing.join(', ')}`
    );
  }

  // Validação crítica: projectId
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (projectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `SEGURANÇA CRÍTICA: projectId está apontando para PRODUÇÃO (${PRODUCTION_PROJECT_ID}).\n` +
      `Este script trabalha SOMENTE com STAGING (${STAGING_PROJECT_ID}).\n` +
      `Operação abortada para prevenir dados de staging em produção.`
    );
  }

  if (projectId !== STAGING_PROJECT_ID) {
    throw new Error(
      `projectId deve ser exatamente '${STAGING_PROJECT_ID}', obtido '${projectId}'`
    );
  }

  log(`Validação de ambiente OK`);
  log(`  Projeto: ${projectId}`);
}

function getActorCredentials(actor) {
  const email = process.env[actor.emailEnv];
  const password = process.env[actor.passwordEnv];

  if (!email || !password) {
    throw new Error(`Credenciais faltantes para ${actor.key}: ${actor.emailEnv}, ${actor.passwordEnv}`);
  }

  return { email, password };
}

// ============================================================
// FIRESTORE OPERATIONS
// ============================================================

async function checkResidualFixtures(db) {
  log('Verificando fixtures residuais...');

  let residualCount = 0;
  const residuals = [];

  for (const [collection, docId] of RESIDUAL_FIXTURES) {
    const ref = db.doc(`${collection}/${docId}`);
    const snap = await ref.get();

    if (snap.exists) {
      residualCount++;
      residuals.push(`${collection}/${docId}`);
    }
  }

  if (residualCount > 0) {
    throw new Error(
      `Fixtures residuais detectados (${residualCount}): ${residuals.join(', ')}\n` +
      `Por favor, execute a limpeza do smoke test anterior antes de fazer bootstrap.`
    );
  }

  log(`Fixtures residuais: 0 (OK)`);
}

async function checkResidualUserDocs(db, actorKey, uid) {
  // Validação CRÍTICA para atores não-admin (FASE A READ-ONLY):
  // Se documento users/{uid} já existir, smoke vai falhar com SMOKE_FIXTURE_COLLISION
  // Por isso, abortamos aqui se detectarmos residual
  // NÃO modificamos nada nesta fase
  if (ACTORS.find(a => a.key === actorKey)?.createUserDoc) {
    return; // Admin é esperado ter documento
  }

  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();

  if (snap.exists) {
    throw new Error(
      `Documento residual users/${uid} existe. Smoke test espera encontrar ausente.\n` +
      `Limpe dados de execução anterior antes de fazer bootstrap.`
    );
  }
}

async function queryAuthUser(auth, email) {
  // FASE A — READ-ONLY: apenas consulta, sem modificações
  try {
    const user = await auth.getUserByEmail(email);
    return { exists: true, uid: user.uid };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return { exists: false, uid: null };
    }
    throw error;
  }
}

async function ensureAdminUserDoc(db, adminUid) {
  log(`Configurando documento admin...`);

  const adminRef = db.doc(`users/${adminUid}`);
  const existing = await adminRef.get();

  if (existing.exists) {
    // Merge seguro: preserva nome e dataCriacao existentes
    const existingData = existing.data();
    const existingStores = Array.isArray(existingData?.lojas)
      ? existingData.lojas
      : [];

    // União de lojas: preserva existentes + adiciona obrigatórias
    const requiredStores = [STORE_A_ID, STORE_B_ID];
    const allStores = [...new Set([...existingStores, ...requiredStores])];

    const updateData = {
      papel: 'admin',
      ativo: true,
      lojas: allStores,
    };

    await adminRef.set(updateData, { merge: true });
    log(`  Documento admin atualizado (merge seguro)`);
  } else {
    // Criar novo documento
    const adminData = {
      nome: 'Admin Smoke Bootstrap',
      papel: 'admin',
      ativo: true,
      lojas: [STORE_A_ID, STORE_B_ID],
      dataCriacao: new Date().toISOString(),
    };

    await adminRef.set(adminData);
    log(`  Documento admin criado`);
  }
}

// ============================================================
// AUTH OPERATIONS
// ============================================================

async function ensureAuthUser(auth, email, password, existingUid) {
  // FASE B — MUTATION: cria ou atualiza conta Auth
  // Requer: existingUid foi validado em FASE A
  if (existingUid) {
    // Atualizar password para garantir alinhamento com variável
    await auth.updateUser(existingUid, {
      password,
    });
    log(`  ${maskEmail(email)}: password atualizada (UID: ${existingUid})`);
    return existingUid;
  } else {
    // Criar novo utilizador
    const user = await auth.createUser({
      email,
      password,
      emailVerified: true,
    });
    log(`  ${maskEmail(email)}: criado (UID: ${user.uid})`);
    return user.uid;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  let exitCode = 0;

  try {
    log('Iniciando bootstrap STAGING...');
    console.log('');

    // Validar variáveis de ambiente
    validateEnvironment();

    // Inicializar Firebase Admin
    log('Inicializando Firebase Admin SDK...');
    const app = initializeApp({
      credential: applicationDefault(),
      projectId: STAGING_PROJECT_ID,
    });

    // Validar projectId efetivo do app
    if (app.options.projectId !== STAGING_PROJECT_ID) {
      throw new Error(
        `SEGURANÇA CRÍTICA: app.options.projectId !== STAGING (obtido '${app.options.projectId}').\n` +
        `Operação abortada.`
      );
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    log(`  projectId validado: ${app.options.projectId}`);

    console.log('');

    // ============================================================
    // FASE A — PREFLIGHT READ-ONLY
    // ============================================================
    console.log('');
    log('FASE A: Validações e verificações READ-ONLY...');

    // Verificar fixtures residuais (falha-rápido)
    await checkResidualFixtures(db);

    console.log('');
    log('Consultando contas Firebase Auth...');

    const authStatus = {};

    // Consultar cada ator (READ-ONLY, sem criar/atualizar)
    for (const actor of ACTORS) {
      const { email } = getActorCredentials(actor);
      const result = await queryAuthUser(auth, email);
      authStatus[actor.key] = result;

      if (result.exists) {
        log(`  ${maskEmail(email)}: conta existente (UID: ${result.uid})`);
      } else {
        log(`  ${maskEmail(email)}: conta não encontrada (será criada)`);
      }
    }

    console.log('');
    log('Verificando documentos Firestore residuais...');

    // Validar ausência de user docs para não-admin com contas existentes
    for (const actor of ACTORS) {
      if (!actor.createUserDoc && authStatus[actor.key].exists) {
        await checkResidualUserDocs(db, actor.key, authStatus[actor.key].uid);
      }
    }

    console.log('');
    log('========================================');
    log('PREFLIGHT=PASS');
    log('PROJECT=precocerto-staging');
    log('RESIDUAL_FIXTURES=0');
    log('RESIDUAL_USER_DOCS=0');
    log('========================================');

    // ============================================================
    // FASE B — MUTATION
    // ============================================================
    console.log('');
    log('FASE B: Criando e atualizando contas...');

    const uids = {};

    // Processar cada ator (criar/atualizar contas Auth)
    for (const actor of ACTORS) {
      const { email, password } = getActorCredentials(actor);
      const existingUid = authStatus[actor.key].exists ? authStatus[actor.key].uid : null;
      const uid = await ensureAuthUser(auth, email, password, existingUid);
      uids[actor.key] = uid;
    }

    console.log('');

    // Configurar documento admin
    log('Configurando documento admin Firestore...');
    await ensureAdminUserDoc(db, uids.admin);

    console.log('');

    // Resumo final
    log('========================================');
    log('BOOTSTRAP COMPLETO');
    log('========================================');
    log(`PROJECT=${process.env.VITE_FIREBASE_PROJECT_ID}`);
    log(`AUTH_ADMIN=READY`);
    log(`AUTH_MANAGER_A=READY`);
    log(`AUTH_FUNC_A=READY`);
    log(`AUTH_FUNC_A2=READY`);
    log(`AUTH_FUNC_B=READY`);
    log(`AUTH_DEACTIVATED=READY`);
    log(`ADMIN_DOC=READY`);
    log(`RESIDUAL_FIXTURES=0`);
    log(`STATUS=READY_FOR_STAGING_SMOKE`);
    log('========================================');
    log('Você pode agora executar: npm run smoke:staging');

  } catch (error) {
    console.error('');
    console.error('[STG-SMOKE-BOOTSTRAP] ERRO CRÍTICO:', error.message);
    if (error.code) {
      console.error('[STG-SMOKE-BOOTSTRAP] Código:', error.code);
    }
    exitCode = 1;
  }

  return exitCode;
}

// ============================================================
// EXECUÇÃO
// ============================================================

const code = await main();
process.exitCode = code;
