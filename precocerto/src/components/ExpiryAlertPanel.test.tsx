/**
 * Testes: ExpiryAlertPanel Component
 * FASE 1: Notificações Inteligentes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpiryAlertPanel } from './ExpiryAlertPanel';

// Mock hooks
vi.mock('../hooks/useExpiryAlerts', () => ({
  useExpiryAlerts: () => ({
    alerts: [
      {
        id: 'alert-1',
        storeId: 'store-1',
        productId: 'prod-1',
        productName: 'Ibuprofen 200mg',
        expiryDate: '2026-09-15',
        daysUntilExpiry: 5,
        severity: 'CRITICAL',
        createdAt: '2026-08-29',
        channels: ['in-app'],
        quantity: 10,
      },
      {
        id: 'alert-2',
        storeId: 'store-1',
        productId: 'prod-2',
        productName: 'Paracetamol 500mg',
        expiryDate: '2026-09-30',
        daysUntilExpiry: 20,
        severity: 'WARNING',
        createdAt: '2026-08-29',
        channels: ['in-app'],
        quantity: 25,
      },
    ],
    alertsSummary: {
      critical: 1,
      warning: 1,
      info: 0,
      total: 2,
    },
    isLoading: false,
    error: null,
    acknowledgeAlert: vi.fn(),
    resolveAlert: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
  }),
}));

describe('ExpiryAlertPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar título do painel', () => {
    render(<ExpiryAlertPanel />);
    expect(screen.getByText('Alertas de Validade')).toBeDefined();
  });

  it('deve mostrar resumo de alertas críticos e avisos', () => {
    render(<ExpiryAlertPanel />);
    expect(screen.getByText('1 Críticos')).toBeDefined();
    expect(screen.getByText('1 Avisos')).toBeDefined();
  });

  it('deve listar produtos com validade próxima', () => {
    render(<ExpiryAlertPanel />);
    expect(screen.getByText('Ibuprofen 200mg')).toBeDefined();
    expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
  });

  it('deve mostrar dias até expiração', () => {
    render(<ExpiryAlertPanel />);
    const text = screen.getByText(/5 dias/i);
    expect(text).toBeDefined();
  });

  it('deve mostrar quantidade de unidades', () => {
    render(<ExpiryAlertPanel />);
    expect(screen.getByText(/Quantidade: 10/)).toBeDefined();
    expect(screen.getByText(/Quantidade: 25/)).toBeDefined();
  });

  it('deve exibir botões de ação para alertas não resolvidos', () => {
    const { container } = render(<ExpiryAlertPanel />);
    const buttons = container.querySelectorAll('button[title]');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('deve suportar modo compacto', () => {
    const { container } = render(<ExpiryAlertPanel compact={true} />);
    expect(container.querySelector('.p-3')).toBeDefined();
  });
});
