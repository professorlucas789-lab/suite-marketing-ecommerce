/**
 * Página de Perfil do Utilizador
 * Permite ver informações da conta e alterar a senha
 * Fase 11: User Account Management
 */

import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Calendar, Shield, LogOut } from 'lucide-react';
import { useUserAuth } from '../hooks/useUserAuth';
import { auth, db } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

interface UserData {
  id: string;
  nome: string;
  email: string;
  papel: string;
  permissoes?: {
    visualizar: boolean;
    criar: boolean;
    editar: boolean;
    deletar: boolean;
    relatorios: boolean;
  };
  ultimoLogin?: string;
  dataCriacao?: string;
}

export const UserProfileView: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { papel, isAdmin, isLojaManager, isFuncionario } = useUserAuth();
  const user = auth.currentUser;

  // States
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changePasswordMode, setChangePasswordMode] = useState(false);

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData({
            id: user.uid,
            nome: data.nome || 'Utilizador',
            email: user.email || '',
            papel: data.papel || papel || 'funcionario',
            permissoes: data.permissoes,
            ultimoLogin: data.ultimoLogin,
            dataCriacao: data.dataCriacao
          });
        } else {
          // User document doesn't exist, use Firebase auth data
          setUserData({
            id: user.uid,
            nome: user.displayName || 'Utilizador',
            email: user.email || '',
            papel: papel || 'funcionario'
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do utilizador:', error);
        setMessage({
          type: 'error',
          text: 'Erro ao carregar dados do utilizador.'
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, papel]);

  // Validar força da senha
  const validatePasswordStrength = (password: string): { score: number; feedback: string[] } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Mínimo 8 caracteres');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Incluir letra maiúscula');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Incluir letra minúscula');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Incluir número');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Incluir carácter especial (!@#$%^&*)');

    return { score, feedback };
  };

  const passwordStrength = validatePasswordStrength(newPassword);
  const isPasswordValid = passwordStrength.score >= 4;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  // Alterar senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.email) {
      setMessage({ type: 'error', text: 'Utilizador não autenticado.' });
      return;
    }

    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Digite a senha atual.' });
      return;
    }

    if (!isPasswordValid) {
      setMessage({ type: 'error', text: 'A nova senha não cumpre os requisitos de segurança.' });
      return;
    }

    if (!passwordsMatch) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setIsSubmittingPassword(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordMode(false);

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);

      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Senha atual incorreta.' });
      } else if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Por razões de segurança, faça login novamente para alterar a senha.' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao alterar a senha. Tente novamente.' });
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Get role label
  const getRoleLabel = () => {
    switch (papel) {
      case 'admin':
        return 'Administrador';
      case 'loja-manager':
        return 'Gerente de Loja';
      case 'funcionario':
        return 'Funcionário';
      default:
        return 'Utilizador';
    }
  };

  // Get role color
  const getRoleColor = () => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 size={36} className="animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-slate-400 dark:text-slate-500 text-sm mt-3">Carregando perfil do utilizador...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <UserIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meu Perfil</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie suas informações pessoais e segurança da conta</p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          )}
          <p
            className={
              message.type === 'success'
                ? 'text-emerald-800 dark:text-emerald-200 text-sm'
                : 'text-red-800 dark:text-red-200 text-sm'
            }
          >
            {message.text}
          </p>
        </motion.div>
      )}

      {/* User Information Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield size={20} className="text-emerald-600" />
            Informações da Conta
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* User Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nome
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <UserIcon size={18} className="text-slate-400" />
              <input
                type="text"
                value={userData?.nome || ''}
                readOnly
                className="bg-transparent text-slate-900 dark:text-slate-100 font-medium w-full outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Email
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                value={userData?.email || ''}
                readOnly
                className="bg-transparent text-slate-900 dark:text-slate-100 font-medium w-full outline-none"
              />
            </div>
          </div>

          {/* Role Badge */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Papel / Permissões
            </label>
            <div className={`px-4 py-3 rounded-lg border ${getRoleColor()}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} />
                <span className="font-semibold">{getRoleLabel()}</span>
              </div>
              {userData?.permissoes && (
                <div className="ml-8 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                    <span>{userData.permissoes.visualizar ? '✓' : '✗'} Visualizar dados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                    <span>{userData.permissoes.criar ? '✓' : '✗'} Criar registos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                    <span>{userData.permissoes.editar ? '✓' : '✗'} Editar registos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                    <span>{userData.permissoes.deletar ? '✓' : '✗'} Deletar registos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                    <span>{userData.permissoes.relatorios ? '✓' : '✗'} Gerar relatórios</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Data de Criação
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <Calendar size={18} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-900 dark:text-slate-100">
                  {formatDate(userData?.dataCriacao)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Último Acesso
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <LogOut size={18} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-900 dark:text-slate-100">
                  {formatDate(userData?.ultimoLogin) || 'Agora'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock size={20} className="text-emerald-600" />
            Segurança
          </h2>
          {!changePasswordMode && (
            <button
              onClick={() => setChangePasswordMode(true)}
              className="px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              Alterar Senha
            </button>
          )}
        </div>

        <div className="p-6">
          {!changePasswordMode ? (
            <div className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Senha Protegida</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Clique em "Alterar Senha" para atualizar sua senha.</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Senha Atual *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Crie uma nova senha forte"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i < passwordStrength.score
                                ? 'bg-emerald-500'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                          {passwordStrength.feedback.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-red-500">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Confirmar Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors ${
                        confirmPassword
                          ? passwordsMatch
                            ? 'border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20'
                            : 'border-red-200 dark:border-red-800 focus:border-red-500 dark:focus:border-red-400 focus:ring-1 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-600 dark:text-red-400">As senhas não coincidem</p>
                  )}
                  {confirmPassword && passwordsMatch && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Senhas coincidem
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={!currentPassword || !isPasswordValid || !passwordsMatch || isSubmittingPassword}
                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        Alterar Senha
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePasswordMode(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowCurrentPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-semibold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>

              {/* Security Tip */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-200 font-semibold mb-1">💡 Dica de Segurança:</p>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Use uma combinação de letras maiúsculas, minúsculas, números e símbolos</li>
                  <li>• Não reutilize senhas de outras contas</li>
                  <li>• Altere a senha regularmente (a cada 3 meses)</li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
