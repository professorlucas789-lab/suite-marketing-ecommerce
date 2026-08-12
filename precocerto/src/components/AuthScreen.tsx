import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../firebase";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  Sparkles
} from "lucide-react";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      // Translate Firebase errors into user-friendly Portuguese
      switch (err.code) {
        case "auth/operation-not-allowed":
          setError(
            <div className="flex flex-col gap-2" id="auth-operation-not-allowed-msg">
              <p className="font-semibold text-rose-900 leading-tight">O provedor de E-mail/Senha está desativado no Firebase!</p>
              <p className="text-xs text-rose-700 leading-relaxed">
                Para corrigir isso, clique no botão abaixo para abrir o console do seu projeto Firebase e ativar o método de login com e-mail/senha:
              </p>
              <a 
                href="https://console.firebase.google.com/u/0/project/gen-lang-client-0862839570/authentication/providers" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-all my-1.5 shadow-md shadow-emerald-600/10 cursor-pointer w-fit self-center sm:self-start"
                id="btn-go-to-firebase-console"
              >
                Ativar no Firebase Console &rarr;
              </a>
              <div className="text-[11px] text-slate-500 mt-1 border-t border-rose-100 pt-2 space-y-1 bg-white/50 p-2 rounded border border-rose-100/30">
                <p className="font-semibold text-slate-700 mb-1">Passo a passo rápido:</p>
                <p>1. Clique no botão verde acima para ir à página de provedores.</p>
                <p>2. Clique na linha correspondente a <span className="font-semibold text-slate-700">E-mail/senha</span>.</p>
                <p>3. Ative a primeira opção (<span className="font-semibold text-slate-700">Ativado</span>) e clique em <span className="font-semibold text-slate-700">Salvar</span>.</p>
                <p>4. Atualize esta página e crie ou entre na sua conta!</p>
              </div>
            </div>
          );
          break;
        case "auth/invalid-credential":
          setError("E-mail ou senha incorretos. Por favor, verifique.");
          break;
        case "auth/email-already-in-use":
          setError("Este endereço de e-mail já está cadastrado.");
          break;
        case "auth/invalid-email":
          setError("O endereço de e-mail inserido é inválido.");
          break;
        case "auth/weak-password":
          setError("A senha fornecida é muito fraca (mínimo 6 caracteres).");
          break;
        case "auth/network-request-failed":
          setError("Erro de rede. Verifique a sua conexão com a internet.");
          break;
        default:
          setError(`Erro ao processar o pedido: ${err.message || err.code || "Tente novamente."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-container" className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Absolute Decorative Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>

      <motion.div 
        id="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10 relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-3">
            <TrendingUp size={24} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            PreçoCerto <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">Pessoal</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 text-center">
            Cadastre os seus produtos e calcule preços ideais com precisão matemática.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          <button
            id="toggle-login-tab"
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              isLogin 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
          >
            Entrar
          </button>
          <button
            id="toggle-register-tab"
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              !isLogin 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            Criar Conta
          </button>
        </div>

        {error && (
          <motion.div 
            id="auth-error-alert"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 text-slate-800 p-4 rounded-xl text-sm mb-5 shadow-sm"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 text-slate-700">{error}</div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail size={18} />
              </span>
              <input
                id="auth-email-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                id="auth-password-input"
                type={showPassword ? "text" : "password"}
                placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-800"
                required
              />
              <button
                id="toggle-password-visibility"
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-button"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg text-sm transition-all shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? "Entrar na Minha Conta" : "Criar Minha Conta"}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <Sparkles size={12} className="text-emerald-500" />
            <span>PreçoCerto • Sistema de Gestão Financeira Pessoal</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
