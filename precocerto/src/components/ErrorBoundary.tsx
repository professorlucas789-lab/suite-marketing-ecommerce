import { Component, ReactNode, ReactElement, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ERROR BOUNDARY CAUGHT:', error);
    console.error('📍 Error Info:', errorInfo);
  }

  render(): ReactElement {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erro na Aplicação</h1>
            <p className="text-gray-700 mb-4">
              Desculpa, a aplicação encontrou um erro inesperado.
            </p>
            <div className="bg-red-100 border border-red-300 rounded p-4 mb-4">
              <p className="text-sm font-mono text-red-800 break-words">
                {this.state.error?.message || 'Erro desconhecido'}
              </p>
            </div>
            <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-4 max-h-64 overflow-auto">
              <p className="text-xs font-mono text-gray-700 break-words whitespace-pre-wrap">
                {this.state.error?.stack || 'Sem stack trace disponível'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as ReactElement;
  }
}
