/**
 * Testes: SalesScreen — a venda e o histórico (com Anular) no mesmo ecrã
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SalesScreen from './SalesScreen';

let carregamentosHistorico = 0;

vi.mock('./SalesModule', () => ({
  default: ({ onSaleComplete }: { onSaleComplete?: () => void }) => (
    <button onClick={() => onSaleComplete?.()}>Concluir venda (simulada)</button>
  ),
}));

vi.mock('./SalesHistory', async () => {
  const React = await import('react');
  return {
    SalesHistory: () => {
      React.useEffect(() => {
        carregamentosHistorico++;
      }, []);
      return <div>Histórico de recibos</div>;
    },
  };
});

describe('SalesScreen', () => {
  it('mostra o registo de venda e o histórico de recibos no mesmo ecrã', () => {
    render(<SalesScreen products={[]} />);

    expect(screen.getByText('Concluir venda (simulada)')).toBeTruthy();
    expect(screen.getByText('Histórico de recibos')).toBeTruthy();
  });

  it('volta a carregar o histórico depois de uma venda e avisa o ecrã que a chama', () => {
    carregamentosHistorico = 0;
    const aoConcluir = vi.fn();
    render(<SalesScreen products={[]} onSaleComplete={aoConcluir} />);
    expect(carregamentosHistorico).toBe(1);

    fireEvent.click(screen.getByText('Concluir venda (simulada)'));

    expect(carregamentosHistorico).toBe(2);
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });
});
