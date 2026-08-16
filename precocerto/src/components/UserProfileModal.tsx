/**
 * Modal de Perfil de Utilizador com Controlo de Acesso
 * Fase 14: Privacy & Security - User Profile Access Control
 *
 * Este componente implementa controlo de acesso para visualização de perfis:
 * - Utilizador autenticado: vê seu próprio perfil
 * - Admin: vê qualquer perfil
 * - Loja-Manager/Funcionário: vê apenas seu próprio perfil
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Shield, Lock, User as UserIcon, Mail, Calendar } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

interface UserProfileModalProps {
  userId: string; // ID do utilizador cujo perfil queremos ver
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: string; // Papel do utilizador autenticado
}

interface UserProfileData {
  id: string;
  nome: string;
  email: string;
  papel: string;
  avatar?: string;
  dataCriacao?: string;
  ultimoLogin?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  currentUserRole,
}) => {
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = auth.currentUser;

  /**
   * Verificar se tem permissão para ver este perfil
   */
  const hasAccessPermission = (): boolean => {
    // Utilizador sempre consegue ver seu próprio perfil
    if (currentUser?.uid === userId) {
      return true;
    }

    // Admin consegue ver qualquer perfil
    if (currentUserRole === 'admin') {
      return true;
    }

    // Outros roles (loja-manager, funcionario) não conseguem ver perfil de outros
    return false;
  };

  /**
   * Carregar dados do utilizador
   */
  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadUserData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Verificar permissão ANTES de fazer query
        if (!hasAccessPermission()) {
          setError('Acesso negado. Não tem permissão para visualizar este perfil.');
          setLoading(false);
          console.warn(`[UserProfileModal] Acesso negado para usuario ${currentUser?.uid} visualizar perfil de ${userId}`);
          return;
        }

        // Carregar dados do utilizador
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData({
            id: userId,
            nome: data.nome || 'Utilizador',
            email: data.email || '',
            papel: data.papel || 'funcionario',
            avatar: data.avatar,
            dataCriacao: data.dataCriacao,
            ultimoLogin: data.ultimoLogin,
          });
          console.log(`[UserProfileModal] Perfil carregado com sucesso para ${userId}`);
        } else {
          setError('Utilizador não encontrado.');
          console.error(`[UserProfileModal] Documento do utilizador não encontrado: ${userId}`);
        }
      } catch (err) {
        console.error('[UserProfileModal] Erro ao carregar perfil:', err);
        setError('Erro ao carregar perfil. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isOpen, userId, currentUserRole, currentUser?.uid]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getRoleLabel = (papel: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      'loja-manager': 'Gerente de Loja',
      funcionario: 'Funcionário',
    };
    return labels[papel] || 'Utilizador';
  };

  const getRoleColor = (papel: string) => {
    switch (papel) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'loja-manager':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'funcionario':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Perfil do Utilizador</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-emerald-600 dark:text-emerald-400 mb-3" />
              <p className="text-slate-600 dark:text-slate-400 text-sm">A carregar perfil...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200 text-sm">Erro ao Carregar</p>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                {!hasAccessPermission() && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-2 font-semibold">
                    🔒 Acesso negado por razões de segurança e privacy
                  </p>
                )}
              </div>
            </div>
          ) : userData ? (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                {userData.avatar ? (
                  <img
                    src={userData.avatar}
                    alt={userData.nome}
                    className="h-20 w-20 rounded-lg object-cover border-2 border-emerald-500 mb-3"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                    <UserIcon size={32} />
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{userData.nome}</h3>
                {currentUser?.uid === userId && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ Seu Perfil
                  </p>
                )}
              </div>

              {/* Information Grid */}
              <div className="space-y-3">
                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Mail size={14} />
                    Email
                  </label>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">{userData.email}</p>
                </div>

                {/* Papel */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} />
                    Papel
                  </label>
                  <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold border ${getRoleColor(userData.papel)}`}>
                    {getRoleLabel(userData.papel)}
                  </div>
                </div>

                {/* Data de Criação */}
                {userData.dataCriacao && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} />
                      Data de Criação
                    </label>
                    <p className="text-slate-900 dark:text-slate-100 text-sm">{formatDate(userData.dataCriacao)}</p>
                  </div>
                )}

                {/* Último Login */}
                {userData.ultimoLogin && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Último Acesso
                    </label>
                    <p className="text-slate-900 dark:text-slate-100 text-sm">{formatDate(userData.ultimoLogin)}</p>
                  </div>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <Lock size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Apenas informações públicas de perfil. Dados sensíveis estão protegidos.
                  </span>
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserProfileModal;
