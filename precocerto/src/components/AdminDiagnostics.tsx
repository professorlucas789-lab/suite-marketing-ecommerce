/**
 * Página de Diagnóstico para Administrador
 * Ajuda a identificar problemas com papéis e permissões
 * NOVO: Debug interativo
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  RefreshCw,
  Database,
  Shield,
  Menu
} from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import { getNavItemsForRole } from '../config/navigationConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function AdminDiagnostics() {
  const { user, papel, isAdmin, firebaseUser } = useUserAuth();
  const [firebaseData, setFirebaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const allowedItems = getNavItemsForRole(papel);
  const categoriesAllowed = allowedItems.find(item => item.id === 'categories');

  useEffect(() => {
    const loadFirebaseData = async () => {
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setFirebaseData(userSnap.data());
        } else {
          setFirebaseData({ error: 'Documento do utilizador não encontrado' });
        }
      } catch (err) {
        setFirebaseData({ error: String(err) });
      } finally {
        setLoading(false);
      }
    };

    loadFirebaseData();
  }, [firebaseUser]);

  const diagnosticData = {
    email: user?.email,
    uid: firebaseUser?.uid,
    paperReact: papel,
    isAdmin,
    paperFirestore: firebaseData?.papel,
    allowedMenuItems: allowedItems.map(i => i.id),
    categoriesAccessible: !!categoriesAllowed,
    firebaseDoc: firebaseData
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin text-emerald-600" />
        <span className="ml-3">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-slate-900 rounded-xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield size={32} className="text-emerald-600" />
          Diagnóstico de Administrador
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Informações detalhadas sobre suas permissões e papéis
        </p>
      </motion.div>

      {/* Status Geral */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Utilizador */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase">Email</p>
          <p className="text-sm font-mono text-blue-700 dark:text-blue-300 mt-1 break-all">{user?.email}</p>
        </div>

        {/* UID */}
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-purple-900 dark:text-purple-200 uppercase">UID Firebase</p>
          <p className="text-sm font-mono text-purple-700 dark:text-purple-300 mt-1 truncate">{firebaseUser?.uid}</p>
        </div>

        {/* Admin Status */}
        <div className={`rounded-lg p-4 border ${isAdmin
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        }`}>
          <p className="text-xs font-semibold uppercase">Status Admin</p>
          <div className="flex items-center gap-2 mt-2">
            {isAdmin ? (
              <>
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Sim</span>
              </>
            ) : (
              <>
                <XCircle size={20} className="text-red-600" />
                <span className="font-semibold text-red-700 dark:text-red-300">Não</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Análise de Papéis */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Database size={20} className="text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Análise de Papéis</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Papel no React</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Obtido do hook useUserAuth</p>
            </div>
            <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
              {papel || 'null'}
            </code>
          </div>

          <div className="flex items-start justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Papel no Firestore</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Campo `papel` em users/{firebaseUser?.uid}</p>
            </div>
            <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm font-mono">
              {firebaseData?.papel || firebaseData?.error || 'null'}
            </code>
          </div>

          {papel !== firebaseData?.papel && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
              <div className="flex gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ <strong>ATENÇÃO:</strong> Papéis não coincidem! React: "{papel}" vs Firestore: "{firebaseData?.papel}"
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Menus Acessíveis */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Menu size={20} className="text-slate-600 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Menus Acessíveis</h3>
        </div>

        <div className="space-y-2">
          {allowedItems.map((item) => (
            <div key={item.id} className={`flex items-center justify-between p-3 rounded border ${
              item.id === 'categories'
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">id: {item.id}</p>
                </div>
              </div>
              {item.id === 'categories' && (
                <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded font-semibold">
                  ✓ Verificado
                </span>
              )}
            </div>
          ))}
        </div>

        {!categoriesAllowed && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
            <div className="flex gap-2">
              <XCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p><strong>PROBLEMA:</strong> "Categorias" não está na lista de menus acessíveis!</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Documento Firestore Completo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={20} className="text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Documento Firestore Completo</h3>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(firebaseData, null, 2))}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded transition-colors"
          >
            <Copy size={14} />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <pre className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-3 overflow-x-auto text-xs font-mono text-slate-700 dark:text-slate-300">
          {JSON.stringify(firebaseData, null, 2)}
        </pre>
      </motion.div>

      {/* Instruções de Resolução */}
      {!categoriesAllowed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Passos para Resolver</h3>
          </div>

          <ol className="space-y-2 text-sm text-amber-800 dark:text-amber-300 list-decimal list-inside">
            <li>Verifique o campo <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">papel</code> acima</li>
            <li>Se for diferente de "admin", corrija no Firebase Console</li>
            <li>Faça logout e login novamente</li>
            <li>Recarregue esta página para verificar</li>
          </ol>

          <div className="mt-4 p-3 bg-white dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded text-xs font-mono">
            <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Para corrigir manualmente:</p>
            <code className="text-amber-700 dark:text-amber-300">
              Firestore → users → {firebaseUser?.uid} → papel = "admin"
            </code>
          </div>
        </motion.div>
      )}

      {categoriesAllowed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              ✓ Menu "Categorias" está acessível!
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
