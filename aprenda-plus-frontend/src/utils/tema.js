// Tema da tela: claro (padrão), escuro ou alto contraste.
// A escolha fica salva no navegador e vale para o site, o painel e o Portal do Professor.
import { useSyncExternalStore } from 'react';

export const TEMAS = [
  { chave: 'claro', rotulo: 'Claro', icone: '☀️' },
  { chave: 'escuro', rotulo: 'Escuro', icone: '🌙' },
  { chave: 'contraste', rotulo: 'Alto contraste', icone: '👁️' },
];

const CHAVE = 'aprendaplus-tema';
const ouvintes = new Set();

const valido = (tema) => TEMAS.some((t) => t.chave === tema);

function consultaDoSistema(query) {
  try {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false;
  } catch {
    return false;
  }
}

/** Tema salvo; sem escolha salva, segue o sistema (alto contraste ou modo escuro do aparelho). */
export function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (valido(salvo)) return salvo;
  } catch {
    // navegador sem acesso ao armazenamento: segue o sistema
  }
  if (consultaDoSistema('(prefers-contrast: more)')) return 'contraste';
  if (consultaDoSistema('(prefers-color-scheme: dark)')) return 'escuro';
  return 'claro';
}

let atual = temaInicial();

export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
}

export function getTema() {
  return atual;
}

export function setTema(tema) {
  if (!valido(tema)) return;
  atual = tema;
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // sem armazenamento: o tema vale só até fechar a página
  }
  aplicarTema(tema);
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar) {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

export function useTema() {
  return useSyncExternalStore(assinar, getTema, getTema);
}

/** Só para os testes: volta ao estado inicial. */
export function _reiniciarTema() {
  atual = temaInicial();
  aplicarTema(atual);
}
