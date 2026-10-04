/**
 * Testes: AlertsView Component
 * FASE 3: Teste de Regressão
 *
 * Validar que AlertsView passa o storeId real em vez de "default"
 * para useCriticalExpiryAlerts()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AlertsView from './AlertsView';
import * as useExpiryAlertsModule from '../hooks/useExpiryAlerts';

// Mock useStore context
vi.mock('../contexts/StoreContext', () => ({
  useStore: vi.fn(() => ({
    currentStore: {
      storeId: 'store-real-123',
      name: 'Loja Teste',
    },
    products: [],
  })),
}));

// Mock useCriticalExpiryAlerts - ESTE É O FOCO DO TESTE
vi.mock('../hooks/useExpiryAlerts', () => ({
  useCriticalExpiryAlerts: vi.fn(),
}));

// Mock useLowStockAlerts
vi.mock('../hooks/useLowStockAlerts', () => ({
  useLowStockAlerts: vi.fn(() => ({
    lowStockProducts: [],
  })),
}));

// Mock HealthCheckPanel
vi.mock('./HealthCheckPanel', () => ({
  default: () => <div data-testid="health-check-panel">Health Check Panel</div>,
}));

describe('AlertsView - Regressão StoreId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockFunc = vi.mocked(useExpiryAlertsModule.useCriticalExpiryAlerts);
    mockFunc.mockReturnValue({
      criticalAlerts: [],
      warningAlerts: [],
      loading: false,
      error: null,
    });
  });

  it('deve passar o storeId real e NÃO "default" para useCriticalExpiryAlerts()', () => {
    const mockFunc = vi.mocked(useExpiryAlertsModule.useCriticalExpiryAlerts);

    render(<AlertsView />);

    // VALIDAÇÃO CRÍTICA: useCriticalExpiryAlerts deve ter sido chamado com storeId real
    expect(mockFunc).toHaveBeenCalled();

    // Obter argumentos da chamada
    const callArgs = mockFunc.mock.calls[0];
    const passedParameter = callArgs?.[0];

    // PROVA DO PROBLEMA: Esperamos "store-real-123" mas atualmente recebe "default"
    expect(passedParameter).toBe('store-real-123');
    expect(passedParameter).not.toBe('default');
  });

  it('deve renderizar "Central de Alertas"', () => {
    render(<AlertsView />);
    expect(screen.getByText('Central de Alertas')).toBeDefined();
  });

  it('deve mostrar "Tudo em Bom Estado" quando não há alertas', () => {
    const mockFunc = vi.mocked(useExpiryAlertsModule.useCriticalExpiryAlerts);
    mockFunc.mockReturnValue({
      criticalAlerts: [],
      warningAlerts: [],
      loading: false,
      error: null,
    });

    render(<AlertsView />);
    expect(screen.getByText(/Tudo em Bom Estado/)).toBeDefined();
  });
});
