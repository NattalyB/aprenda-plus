import { act, renderHook } from '@testing-library/react';
import { TEMAS, _reiniciarTema, aplicarTema, getTema, setTema, temaInicial, useTema } from './tema';

const sistema = (respostas) => {
  window.matchMedia = jest.fn((query) => ({ matches: Boolean(respostas[query]) }));
};

afterEach(() => {
  localStorage.clear();
  delete window.matchMedia;
  _reiniciarTema();
});

test('tem os três temas: claro, escuro e alto contraste', () => {
  expect(TEMAS.map((t) => t.chave)).toEqual(['claro', 'escuro', 'contraste']);
});

test('sem escolha salva: segue o sistema (alto contraste vem antes do modo escuro)', () => {
  expect(temaInicial()).toBe('claro');
  sistema({ '(prefers-color-scheme: dark)': true });
  expect(temaInicial()).toBe('escuro');
  sistema({ '(prefers-color-scheme: dark)': true, '(prefers-contrast: more)': true });
  expect(temaInicial()).toBe('contraste');
  window.matchMedia = () => {
    throw new Error('sem suporte');
  };
  expect(temaInicial()).toBe('claro');
});

test('a escolha salva vale mais que o sistema; valor inválido é ignorado', () => {
  sistema({ '(prefers-color-scheme: dark)': true });
  localStorage.setItem('aprendaplus-tema', 'contraste');
  expect(temaInicial()).toBe('contraste');
  localStorage.setItem('aprendaplus-tema', 'roxo');
  expect(temaInicial()).toBe('escuro');
});

test('trocar o tema salva, marca o <html> e avisa quem usa o hook', () => {
  const { result } = renderHook(() => useTema());
  expect(result.current).toBe('claro');

  act(() => setTema('escuro'));
  expect(result.current).toBe('escuro');
  expect(getTema()).toBe('escuro');
  expect(localStorage.getItem('aprendaplus-tema')).toBe('escuro');
  expect(document.documentElement).toHaveAttribute('data-tema', 'escuro');

  act(() => setTema('xpto'));
  expect(result.current).toBe('escuro');
});

test('funciona mesmo sem acesso ao armazenamento do navegador', () => {
  const original = Storage.prototype.getItem;
  const salvar = Storage.prototype.setItem;
  Storage.prototype.getItem = () => {
    throw new Error('bloqueado');
  };
  Storage.prototype.setItem = () => {
    throw new Error('bloqueado');
  };
  expect(temaInicial()).toBe('claro');
  setTema('contraste');
  expect(getTema()).toBe('contraste');
  Storage.prototype.getItem = original;
  Storage.prototype.setItem = salvar;
  aplicarTema('claro');
  expect(document.documentElement).toHaveAttribute('data-tema', 'claro');
});
