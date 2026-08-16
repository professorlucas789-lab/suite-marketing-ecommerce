/**
 * Barreira de erros da aplicação.
 *
 * Sem uma barreira, qualquer exceção durante a renderização de uma vista faz o
 * React desmontar toda a árvore: o utilizador fica com um ecrã em branco e sem
 * forma de voltar atrás — na prática, um menu que "não abre". Aqui o erro é
 * contido na área de conteúdo, explicado e recuperável.
 */

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Muda de valor sempre que a vista muda, para limpar o erro na navegação. */
  resetKey?: string;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // O projeto não inclui as definições de tipos do React (@types/react), pelo
  // que os membros herdados de React.Component são declarados aqui.
  declare props: ErrorBoundaryProps;
  declare setState: (state: ErrorBoundaryState) => void;

  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Ao navegar para outra vista, tentar renderizar de novo.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Erro não tratado numa vista:", error, info);
    this.props.onError?.(error);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div
        id="view-error-boundary"
        className="max-w-xl mx-auto my-10 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Não foi possível abrir esta secção
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Ocorreu um erro inesperado ao mostrar este conteúdo. Pode escolher outro menu
              ou tentar novamente — os seus dados não foram afetados.
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-3 break-words font-mono">
              {error.message}
            </p>

            <button
              id="view-error-retry-btn"
              onClick={() => this.setState({ error: null })}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={14} />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
