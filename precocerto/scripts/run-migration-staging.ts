#!/usr/bin/env node

/**
 * Script para executar migração FASE B em Staging
 *
 * INSTRUÇÕES:
 * 1. Configurar variáveis de ambiente para staging em `.env.staging`
 * 2. Executar: npm run migrate:staging
 *
 * PROCEDIMENTO:
 * - Fazer backup automático de tudo
 * - Migrar estrutura de produtos
 * - Validar integridade
 * - Gerar relatório detalhado
 */

import dotenv from 'dotenv';
import path from 'path';
import { executeMigrationPhaseB } from '../src/scripts/migrationPhaseB';

// Carregar variáveis de ambiente de staging
const envPath = path.join(__dirname, '../.env.staging');
dotenv.config({ path: envPath });

// Validar credenciais
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ ERRO: Credenciais de staging incompletas');
  console.error('   Variáveis faltando:', missing);
  console.error('');
  console.error('📝 INSTRUÇÕES:');
  console.error('1. Copiar .env.example para .env.staging');
  console.error('2. Preencher as credenciais do Firebase STAGING');
  console.error('3. Executar novamente este script');
  process.exit(1);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO FASE B — Estrutura Unificada de Produtos         ║');
  console.log('║  Ambiente: STAGING                                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Confirmar execução
    console.log('⚠️  AVISO:');
    console.log('   - Este script vai migrar TODOS os produtos para a nova estrutura');
    console.log('   - Um backup automático será criado antes da migração');
    console.log('   - A operação é reversível com rollback se necessário');
    console.log('');

    // TODO: Adicionar confirmação interativa
    // const answer = await prompt('Deseja continuar? (sim/não): ');
    // if (answer.toLowerCase() !== 'sim') {
    //   console.log('❌ Migração cancelada');
    //   process.exit(0);
    // }

    console.log('🚀 Iniciando migração...');
    console.log('');

    const report = await executeMigrationPhaseB();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  RELATÓRIO DE MIGRAÇÃO                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Status: ${report.status === 'completed' ? '✅ SUCESSO' : '❌ FALHOU'}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Backup ID: ${report.backupId}`);
    console.log('');
    console.log('📊 Estatísticas:');
    console.log(`   - Produtos processados: ${report.productsProcessed}`);
    console.log(`   - Lojas processadas: ${report.storesProcessed}`);
    console.log(`   - Stock entries migradas: ${report.stockEntriesMigrated}`);
    console.log(`   - Duração: ${report.duration}ms`);
    console.log('');

    if (report.errors.length > 0) {
      console.log('❌ Erros encontrados:');
      report.errors.forEach(error => console.log(`   - ${error}`));
      console.log('');
    }

    if (report.warnings.length > 0) {
      console.log('⚠️  Avisos:');
      report.warnings.forEach(warning => console.log(`   - ${warning}`));
      console.log('');
    }

    if (report.status === 'completed') {
      console.log('✅ Migração completada com sucesso!');
      console.log('');
      console.log('📋 Próximos passos:');
      console.log('1. Validar dados em staging');
      console.log('2. Testar fluxo de vendas completo');
      console.log('3. Verificar relatórios e dashboards');
      console.log('4. Obter aprovação para deploy em produção');
      console.log('');

      if (report.errors.length === 0) {
        console.log('🎉 Pronto para produção!');
      } else {
        console.log('⚠️  Resolver erros antes de deploy em produção');
      }
    } else {
      console.log('❌ Migração falhou. Verifique os erros acima.');
      console.log('   Rollback está disponível com backup ID:', report.backupId);
      process.exit(1);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro durante migração:', error.message);
    console.error('');
    console.error('Detalhes:', error.stack);
    process.exit(1);
  }
}

main();
