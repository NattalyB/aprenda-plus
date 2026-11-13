import { fireEvent, render, screen } from '@testing-library/react';
import PainelAcessibilidade from './PainelAcessibilidade';
import { _reiniciarAcessibilidade } from '../utils/acessibilidade';

afterEach(() => {
  localStorage.clear();
  _reiniciarAcessibilidade();
});

const abrir = () => fireEvent.click(screen.getByRole('button', { name: /^Acessibilidade/ }));

test('abre o painel, muda o tamanho da letra e liga opções', () => {
  render(<PainelAcessibilidade />);
  const botao = screen.getByRole('button', { name: 'Acessibilidade' });
  expect(botao).toHaveAttribute('aria-expanded', 'false');

  abrir();
  expect(botao).toHaveAttribute('aria-expanded', 'true');
  const painel = screen.getByRole('dialog', { name: 'Opções de acessibilidade' });
  expect(painel).not.toHaveClass('acima');

  fireEvent.click(screen.getByRole('button', { name: /Grande/ }));
  expect(screen.getByRole('button', { name: /Grande/ })).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveAttribute('data-letra', 'grande');

  fireEvent.click(screen.getByRole('switch', { name: /Reduzir animações/ }));
  expect(screen.getByRole('switch', { name: /Reduzir animações/ })).toBeChecked();
  expect(document.documentElement).toHaveAttribute('data-sem-movimento');

  // O botão mostra quantas preferências estão ligadas
  expect(screen.getByRole('button', { name: 'Acessibilidade (2 ativas)' })).toHaveClass('ativo');

  fireEvent.click(screen.getByRole('switch', { name: /Reduzir animações/ }));
  expect(screen.getByRole('button', { name: 'Acessibilidade (1 ativa)' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao padrão' }));
  expect(document.documentElement).not.toHaveAttribute('data-letra');
  expect(screen.queryByRole('button', { name: 'Voltar ao padrão' })).not.toBeInTheDocument();
});

test('fecha pelo ✕, pelo Esc (devolvendo o foco) e clicando fora', () => {
  render(<div><PainelAcessibilidade abrirAcima /><p>fora</p></div>);
  abrir();
  expect(screen.getByRole('dialog')).toHaveClass('acima');
  fireEvent.click(screen.getByRole('button', { name: 'Fechar opções de acessibilidade' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  abrir();
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Acessibilidade' })).toHaveFocus();

  abrir();
  fireEvent.mouseDown(screen.getByRole('switch', { name: /Modo foco/ }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByText('fora'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
