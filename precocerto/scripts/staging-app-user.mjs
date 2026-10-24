#!/usr/bin/env node

/**
 * Utilizador de teste da FASE B para entrar na app em STAGING
 *
 * Cria (Admin SDK):
 * - uma conta Firebase Authentication (email + password) no projeto precocerto-staging
 * - o documento users/{uid} com papel admin, ativo, e as lojas de teste do seed
 * - nas lojas de teste, os campos que a app espera (tipo, endereço, ativo, ...), sem
 *   alterar os que já existam
 *
 * A password NUNCA passa pela linha de comandos nem fica em ficheiros: vem das
 * variáveis de ambiente da sessão. Os valores <entre parênteses> são exemplos: o
 * script recusa-os (substitua-os pelos seus, sem os parênteses).
 *
 * Uso (PowerShell):
 *   $env:STG_APP_EMAIL = "<O_SEU_EMAIL_REAL>"
 *   $env:STG_APP_PASSWORD = "<A_SUA_PASSWORD_COM_6_OU_MAIS_CARACTERES>"
 *   npm run seed:staging-user
 *   Remove-Item Env:STG_APP_PASSWORD
 *
 * Opções:
 *   --usar-existente   reutiliza uma conta que já exista (por omissão aborta, para
 *                      não mexer em contas de outras pessoas); não altera a password
 *   --limpar           remove a conta e o documento, mas SÓ se foram criados por este
 *                      script (marcador seedFaseB no documento)
 *
 * Segurança:
 * - Bloqueia o projeto de produção e só aceita precocerto-staging
 * - Só toca nas lojas fasebseed_*
 * - Usa applicationDefault() (gcloud auth application-default login)
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';
const PREFIXO = 'fasebseed_';
const LOJAS = [`${PREFIXO}store_1`, `${PREFIXO}store_2`];

function log(...args) {
  console.log('[STG-APP-USER]', ...args);
}

function validarProjeto(projectId) {
  if (projectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `SEGURANÇA CRÍTICA: projeto de PRODUÇÃO (${PRODUCTION_PROJECT_ID}). ` +
      `Este script trabalha SOMENTE com ${STAGING_PROJECT_ID}. Operação abortada.`
    );
  }
  if (projectId !== STAGING_PROJECT_ID) {
    throw new Error(`projectId deve ser '${STAGING_PROJECT_ID}', obtido '${projectId}'`);
  }
}

function mascarar(email) {
  const [nome, dominio] = email.split('@');
  return `${nome.slice(0, 2)}***@${dominio}`;
}

function lerEmail() {
  const email = (process.env.STG_APP_EMAIL || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Defina STG_APP_EMAIL com um email válido (ver o cabeçalho do script).');
  }
  return email;
}

async function limpar(auth, db) {
  const email = lerEmail();

  let utilizador;
  try {
    utilizador = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      log(`${mascarar(email)}: não existe conta. Nada a remover.`);
      return;
    }
    throw error;
  }

  const ref = db.doc(`users/${utilizador.uid}`);
  const snap = await ref.get();

  if (!snap.exists || snap.data()?.seedFaseB !== true) {
    throw new Error(
      `A conta ${mascarar(email)} não foi criada por este script (sem marcador seedFaseB). ` +
      'Por segurança não é removida.'
    );
  }

  await ref.delete();
  await auth.deleteUser(utilizador.uid);
  log(`${mascarar(email)}: conta e documento removidos.`);
}

/**
 * Recusa os valores de exemplo do guia: uma conta admin com credenciais que estão
 * escritas num ficheiro público não é segura, mesmo em staging.
 */
function recusarValoresDeExemplo(email, password) {
  if (/exemplo\.|o\.seu\.email|[<>]/i.test(email)) {
    throw new Error(
      'STG_APP_EMAIL ainda tem o valor de exemplo do guia. Use o SEU email real.'
    );
  }
  if (/uma-password|a-sua-password|[<>]/i.test(password) || password.toLowerCase() === 'password') {
    throw new Error(
      'STG_APP_PASSWORD ainda tem o valor de exemplo do guia (ou é demasiado óbvia). Escolha a SUA password.'
    );
  }
}

async function criar(auth, db) {
  const email = lerEmail();
  const password = process.env.STG_APP_PASSWORD || '';
  const usarExistente = process.argv.includes('--usar-existente');

  // Antes de qualquer acesso a staging
  recusarValoresDeExemplo(email, usarExistente ? '' : password);

  // 1. As lojas de teste têm de existir (criadas por: npm run seed:staging)
  const refsLojas = LOJAS.map(id => db.doc(`stores/${id}`));
  const snapsLojas = await db.getAll(...refsLojas);
  const emFalta = snapsLojas.filter(s => !s.exists).map(s => s.id);
  if (emFalta.length > 0) {
    throw new Error(`Faltam as lojas de teste (${emFalta.join(', ')}). Execute primeiro: npm run seed:staging`);
  }

  // 2. Conta de autenticação
  let uid;
  let contaNova = false;
  try {
    const existente = await auth.getUserByEmail(email);
    if (!usarExistente) {
      throw new Error(
        `Já existe uma conta com ${mascarar(email)}. Para a reutilizar (sem alterar a password) ` +
        'execute com --usar-existente.'
      );
    }
    uid = existente.uid;
    log(`${mascarar(email)}: conta existente reutilizada (password não alterada).`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;

    if (password.length < 6) {
      throw new Error('Defina STG_APP_PASSWORD com 6 ou mais caracteres (ver o cabeçalho do script).');
    }
    const criado = await auth.createUser({ email, password, emailVerified: true });
    uid = criado.uid;
    contaNova = true;
    log(`${mascarar(email)}: conta criada.`);
  }

  // 3. Lojas de teste com os campos que a app espera (só os que faltam)
  const agora = new Date().toISOString();
  for (const snap of snapsLojas) {
    const atual = snap.data() || {};
    const porDefeito = {
      nome: snap.id,
      tipo: 'farmacia',
      endereco: 'Staging (dados de teste)',
      telefone: '',
      email: '',
      ativo: true,
      dataCriacao: agora,
      dataAtualizacao: agora,
      criadoPor: uid,
    };
    const emFaltaCampos = Object.fromEntries(Object.entries(porDefeito).filter(([k]) => atual[k] === undefined));
    if (Object.keys(emFaltaCampos).length > 0) {
      await snap.ref.set(emFaltaCampos, { merge: true });
      log(`Loja ${snap.id}: campos acrescentados (${Object.keys(emFaltaCampos).join(', ')}).`);
    }
  }

  // 4. Documento do utilizador (papel admin, ativo, lojas de teste)
  const refUser = db.doc(`users/${uid}`);
  const snapUser = await refUser.get();
  const atual = snapUser.exists ? snapUser.data() : {};
  const lojas = [...new Set([...(Array.isArray(atual.lojas) ? atual.lojas : []), ...LOJAS])];

  await refUser.set(
    {
      id: uid,
      nome: atual.nome || 'Utilizador de teste FASE B',
      email,
      papel: 'admin',
      ativo: true,
      lojas,
      dataCriacao: atual.dataCriacao || agora,
      // Marcador: só as contas criadas aqui podem ser removidas com --limpar
      ...(contaNova ? { seedFaseB: true } : {}),
    },
    { merge: true }
  );
  log(`users/${uid}: papel admin, ativo, lojas = ${lojas.join(', ')}`);

  console.log('');
  log('Pronto. Entre na app de staging com este email e a password que definiu:');
  log(`  https://${STAGING_PROJECT_ID}.web.app`);
}

async function main() {
  validarProjeto(STAGING_PROJECT_ID);
  if (process.env.VITE_FIREBASE_PROJECT_ID) validarProjeto(process.env.VITE_FIREBASE_PROJECT_ID);

  const app = initializeApp({ credential: applicationDefault(), projectId: STAGING_PROJECT_ID });
  validarProjeto(app.options.projectId);
  log(`Projeto validado: ${app.options.projectId}`);

  const auth = getAuth(app);
  const db = getFirestore(app);

  if (process.argv.includes('--limpar')) {
    await limpar(auth, db);
  } else {
    await criar(auth, db);
  }
}

// Erros de credenciais do gRPC chegam fora do try/catch: mostrar mensagem amigável
process.on('uncaughtException', error => {
  console.error('');
  console.error('[STG-APP-USER] ERRO:', error.message);
  if (error.message.includes('default credentials')) {
    console.error('   Falta autenticação. Execute: gcloud auth application-default login');
  }
  process.exit(1);
});

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[STG-APP-USER] ERRO:', error.message);
    process.exit(1);
  });
