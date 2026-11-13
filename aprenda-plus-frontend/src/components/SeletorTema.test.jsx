import { fireEvent, render, screen } from '@testing-library/react';
import SeletorTema from './SeletorTema';
import { _reiniciarTema } from '../utils/tema';

afterEach(() => {
  localStorage.clear();
  _reiniciarTema();
});

test('mostra os três temas e marca o escolhido', () => {
  render(<SeletorTema compacto className="extra" />);
  const grupo = screen.getByRole('group', { name: 'Tema e acessibilidade' });
  expect(grupo).toHaveClass('seletor-tema-compacto', 'extra');

  expect(screen.getByRole('button', { name: 'Tema claro' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Tema alto contraste' }));
  expect(screen.getByRole('button', { name: 'Tema alto contraste' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Tema claro' })).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement).toHaveAttribute('data-tema', 'contraste');

  fireEvent.click(screen.getByRole('button', { name: 'Tema escuro' }));
  expect(localStorage.getItem('aprendaplus-tema')).toBe('escuro');
});

test('sem opções extras usa o tamanho normal', () => {
  render(<SeletorTema />);
  expect(screen.getByRole('group')).toHaveClass('seletor-tema');
  expect(screen.getByRole('group')).not.toHaveClass('seletor-tema-compacto');
});
