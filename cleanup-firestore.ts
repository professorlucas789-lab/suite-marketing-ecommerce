/**
 * Script para Limpar Firestore e Restaurar Permissões
 * Fase 10: User Management - Cleanup
 *
 * Executa com: npx ts-node cleanup-firestore.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Carregar credenciais do Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'precocertocc04afirebaseadminsdkfbsvce27b2a44ef.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = admin.firestore();
const auth = admin.auth();

const EMAIL = 'professorlucas789@gmail.com';
const PASSWORD = 'TempPassword123!'; // Temporário - utilizador muda depois

async function cleanupFirestore() {
  console.log('🧹 Iniciando limpeza do Firestore...\n');

  try {
    // 1. Obter todas as coleções
    const collections = [
      'users',
      'stores',
      'products',
      'priceHistory',
      'audit_logs',
      'businessSettings',
      'categories',
      'favorites',
    ];

    // 2. Eliminar documentos em cada coleção
    for (const collectionName of collections) {
      console.log(`📂 Processando coleção: ${collectionName}`);
      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();

      if (snapshot.empty) {
        console.log(`   ✓ Coleção vazia`);
        continue;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`   ✓ ${snapshot.size} documento(s) eliminado(s)`);
    }

    console.log('\n✅ Todas as coleções foram limpas!\n');

    // 3. Criar novo utilizador no Firebase Auth
    console.log('👤 Criando novo utilizador admin...');

    let uid: string;
    try {
      // Tentar obter o utilizador existente
      const existingUser = await auth.getUserByEmail(EMAIL);
      uid = existingUser.uid;
      console.log(`   ℹ️  Utilizador já existe com UID: ${uid}`);

      // Atualizar a senha
      await auth.updateUser(uid, {
        password: PASSWORD,
      });
      console.log(`   ✓ Senha atualizada`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Criar novo utilizador
        const newUser = await auth.createUser({
          email: EMAIL,
          password: PASSWORD,
          emailVerified: true,
        });
        uid = newUser.uid;
        console.log(`   ✓ Novo utilizador criado com UID: ${uid}`);
      } else {
        throw error;
      }
    }

    // 4. Criar documento do utilizador no Firestore com papel admin
    console.log('🔐 Criando documento do utilizador com permissões admin...');

    const now = new Date().toISOString();

    await db.collection('users').doc(uid).set({
      id: uid,
      nome: 'Administrador',
      email: EMAIL,
      papel: 'admin',
      lojas: [],
      permissoes: {
        visualizar: true,
        criar: true,
        editar: true,
        deletar: true,
        relatorios: true,
      },
      ativo: true,
      dataCriacao: now,
      dataAtualizacao: now,
      criadoPor: 'system',
      ultimoLogin: now,
    });

    console.log(`   ✓ Documento criado com sucesso`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📋 Informações de Login:');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Senha (temporária): ${PASSWORD}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   1. Faz login com o email e senha acima');
    console.log('   2. Muda a senha imediatamente nas configurações');
    console.log('   3. Todos os dados anteriores foram eliminados');
    console.log('\n');

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    process.exit(1);
  } finally {
    // Fechar conexão
    await admin.app().delete();
  }
}

// Executar script
cleanupFirestore();
