#!/usr/bin/env node

/**
 * Script para executar migração FASE B em Staging (Firebase Admin SDK)
 *
 * USO:
 *   npm run migrate:staging -- --dry-run            # simula, não escreve
 *   npm run migrate:staging                         # migra (pede confirmação)
 *   npm run migrate:staging -- --sim                # migra sem pedir confirmação
 *   npm run migrate:staging -- --rollback <backupId>             # reverte
 *   npm run migrate:staging -- --rollback <backupId> --dry-run   # simula reverter
 *
 * CREDENCIAIS:
 * Usa Application Default Credentials (não precisa de .env.staging):
 *   gcloud auth application-default login
 * ou GOOGLE_APPLICATION_CREDENTIALS apontando para um service account de staging.
 *
 * SEGURANÇA:
 * - Bloqueia o projeto de produção e só aceita precocerto-staging
 * - Backup automático antes de escrever; não sobrescreve stock já migrado
 */

import readline from 'node:readline/promises';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  executeMigrationPhaseB,
  rollbackMigration,
  printMigrationReport,
} from '../src/scripts/migrationPhaseB';

const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';
const STAGING_PROJECT_ID = 'precocerto-staging';

function validarProjeto(projectId: string | undefined): void {
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

async function confirmar(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const resposta = await rl.question(
      `Escreva o ID do projeto (${STAGING_PROJECT_ID}) para confirmar: `
    );
    return resposta.trim() === STAGING_PROJECT_ID;
  } finally {
    rl.close();
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const semConfirmacao = args.includes('--sim');
  const indiceRollback = args.indexOf('--rollback');
  const backupIdRollback = indiceRollback >= 0 ? args[indiceRollback + 1] : undefined;

  if (indiceRollback >= 0 && !backupIdRollback) {
    console.error('❌ ERRO: --rollback exige o backupId (ex.: backup_2026-10-22T08:30:51.283Z)');
    return 1;
  }

  // Validar projeto antes de qualquer acesso (variável de ambiente, se definida)
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    validarProjeto(process.env.VITE_FIREBASE_PROJECT_ID);
  }
  validarProjeto(STAGING_PROJECT_ID);

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: STAGING_PROJECT_ID,
  });
  validarProjeto(app.options.projectId);

  const db = getFirestore(app);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  ${backupIdRollback ? 'ROLLBACK' : 'MIGRAÇÃO'} FASE B — Estrutura Unificada de Produtos`.padEnd(61) + '║');
  console.log(`║  Projeto: ${app.options.projectId}${dryRun ? ' (DRY-RUN)' : ''}`.padEnd(61) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  if (!dryRun && !semConfirmacao) {
    console.log('⚠️  AVISO:');
    console.log('   - Vai ser criado backup e escritas entradas em products/{id}/stock');
    console.log('   - A estrutura antiga (stores/*/products) NÃO é alterada');
    console.log('   - Stock já migrado NÃO é sobrescrito');
    console.log('');
    if (!(await confirmar())) {
      console.log('❌ Cancelado (confirmação incorreta)');
      return 0;
    }
  }

  if (backupIdRollback) {
    await rollbackMigration(db, backupIdRollback, { dryRun });
    return 0;
  }

  const report = await executeMigrationPhaseB(db, { dryRun });
  printMigrationReport(report);

  if (report.status !== 'completed') {
    console.log('❌ Migração falhou. Verifique os erros acima.');
    console.log(`   Reverter com: npm run migrate:staging -- --rollback ${report.backupId}`);
    return 1;
  }

  if (dryRun) {
    console.log('✅ Simulação concluída. Nada foi escrito.');
  } else {
    console.log('✅ Migração concluída.');
    console.log(`   Reverter, se necessário: npm run migrate:staging -- --rollback ${report.backupId}`);
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('1. Validar dados em staging (Firestore > products > {id} > stock)');
    console.log('2. Testar fluxo de vendas completo');
    console.log('3. Confirmar que as regras e os índices estão publicados em staging (ver docs)');
  }

  return 0;
}

// Erros de credenciais do gRPC chegam fora do try/catch: mostrar mensagem amigável
process.on('uncaughtException', error => {
  console.error('');
  console.error('❌ Erro:', error.message);
  if (error.message.includes('default credentials')) {
    console.error('   Falta autenticação. Execute: gcloud auth application-default login');
    console.error('   (ou defina GOOGLE_APPLICATION_CREDENTIALS com um service account de staging)');
  }
  process.exit(1);
});

main()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('❌ Erro durante a execução:', error.message);
    process.exit(1);
  });
