import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // NOVO (Fase 11 - User Avatar)

/**
 * Configuração pública do Firebase Web (client SDK).
 *
 * Estes valores identificam o projeto Firebase e são públicos por design: o SDK
 * do lado do cliente envia-os em cada pedido, pelo que estão sempre visíveis no
 * browser. NÃO são credenciais — o acesso aos dados é controlado pelas regras
 * do Firestore/Storage (ver `firestore.rules`) e pelo Firebase Auth.
 *
 * Cada valor pode ser substituído por uma variável de ambiente `VITE_FIREBASE_*`
 * (útil para apontar builds de staging a outro projeto Firebase), com os valores
 * de produção abaixo como predefinição.
 */
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyC0VIZYQvNPbwWb4QrX33OV0yL180HA-08",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "precocerto-cc04a.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "precocerto-cc04a",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "precocerto-cc04a.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "336447205443",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:336447205443:web:b7d420f055884e38fc64f6",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-DKD3ZCNTF5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app); // NOVO (Fase 11 - User Avatar)

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
