import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage"; // NOVO (Fase 11 - User Avatar)

/**
 * STG-00: Configuração Firebase multi-ambiente
 * Suporta: development, staging, production
 *
 * Variáveis de ambiente obrigatórias:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 * - VITE_FIREBASE_MEASUREMENT_ID (opcional)
 * - VITE_APP_ENV (development|staging|production)
 */

// Obter variáveis de ambiente
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
const appEnv = import.meta.env.VITE_APP_ENV || 'development';

// Constante de produção conhecido (prevent accidental staging→production)
const PRODUCTION_PROJECT_ID = 'precocerto-cc04a';

// Validação FAIL-FAST: Impedir apontamento acidental a produção
function validateFirebaseConfig() {
  // 1. Verificar se todas as variáveis obrigatórias estão definidas
  const requiredVars = {
    VITE_FIREBASE_API_KEY: apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: authDomain,
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_STORAGE_BUCKET: storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
    VITE_FIREBASE_APP_ID: appId,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Configuração Firebase incompleta. Variáveis faltantes: ${missing.join(', ')}\n` +
      `Consulte .env.example para mais informações.`
    );
  }

  // 2. Proteção: Staging NUNCA deve apontar para produção
  if (appEnv === 'staging' && projectId === PRODUCTION_PROJECT_ID) {
    throw new Error(
      `SEGURANÇA: Ambiente STAGING está apontando para projeto de PRODUÇÃO (${PRODUCTION_PROJECT_ID}).\n` +
      `Isto pode causar perda de dados. Verifique .env.staging.`
    );
  }

  // 3. Aviso: Production deve usar ID conhecido
  if (appEnv === 'production' && projectId !== PRODUCTION_PROJECT_ID) {
    console.warn(
      `AVISO: Ambiente PRODUCTION não está usando o ID esperado (${PRODUCTION_PROJECT_ID}).`
    );
  }
}

// Executar validação antes de criar config
validateFirebaseConfig();

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  ...(measurementId && { measurementId }),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

let storageInstance: FirebaseStorage | null = null;

try {
  storageInstance = getStorage(app);
} catch (error) {
  console.warn('Firebase Storage indisponivel nesta sessao:', error);
}

export const storage = storageInstance; // NOVO (Fase 11 - User Avatar)

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
