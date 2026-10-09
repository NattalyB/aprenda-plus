import { render, screen, act, fireEvent } from '@testing-library/react';
import Aviso from './Aviso';
import { mostrarAviso } from '../services/avisoService';

describe('Aviso (toast)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('começa invisível', () => {
    render(<Aviso />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('aparece com a mensagem e o estilo do tipo', () => {
    render(<Aviso />);

    act(() => mostrarAviso('Faça login para continuar.', 'aviso'));

    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveTextContent('Faça login para continuar.');
    expect(aviso).toHaveClass('aviso-aviso');
  });

  test('some sozinho depois de 4 segundos', () => {
    render(<Aviso />);
    act(() => mostrarAviso('Curso adicionado!'));
    expect(screen.getByRole('alert')).toHaveClass('aviso-sucesso');

    act(() => jest.advanceTimersByTime(4000));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('fecha ao clicar no X', () => {
    render(<Aviso />);
    act(() => mostrarAviso('Erro!', 'erro'));

    fireEvent.click(screen.getByLabelText('Fechar'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('um aviso novo substitui o anterior', () => {
    render(<Aviso />);
    act(() => mostrarAviso('Primeiro'));
    act(() => mostrarAviso('Segundo', 'erro'));

    expect(screen.getByRole('alert')).toHaveTextContent('Segundo');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
