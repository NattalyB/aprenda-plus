// Preferências de acessibilidade: tamanho da letra, espaçamento, fonte mais legível, menos movimento,
// links destacados, modo foco e tradução em Libras (VLibras).
// Ficam salvas no navegador e valem para o site, o painel e o Portal do Professor (como o tema).
import { useSyncExternalStore } from 'react';

const CHAVE = 'aprendaplus-acessibilidade';

export const TAMANHOS_LETRA = [
  { chave: 'normal', rotulo: 'Normal' },
  { chave: 'grande', rotulo: 'Grande' },
  { chave: 'maior', rotulo: 'Maior' },
];

// Opções liga/desliga, na ordem em que aparecem no painel
export const OPCOES = [
  { chave: 'espacamento', rotulo: 'Mais espaço entre linhas e letras', dica: 'Ajuda na leitura (dislexia, baixa visão).' },
  { chave: 'fonteLegivel', rotulo: 'Fonte mais legível', dica: 'Letras bem diferentes umas das outras.' },
  { chave: 'reduzirMovimento', rotulo: 'Reduzir animações', dica: 'Tira transições e efeitos de movimento.' },
  { chave: 'destacarLinks', rotulo: 'Destacar links e foco', dica: 'Links sublinhados e contorno forte no item selecionado.' },
  { chave: 'modoFoco', rotulo: 'Modo foco', dica: 'Menos distrações: esmaece o menu e esconde textos flutuantes.' },
  { chave: 'libras', rotulo: 'Tradução em Libras (VLibras)', dica: 'Mostra o botão do VLibras no canto da tela.' },
];

export const PADRAO = {
  tamanhoLetra: 'normal',
  espacamento: false,
  fonteLegivel: false,
  reduzirMovimento: false,
  destacarLinks: false,
  modoFoco: false,
  libras: false,
};

const ouvintes = new Set();

function ler() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (!salvo || typeof salvo !== 'object') return { ...PADRAO };
    const prefs = { ...PADRAO };
    if (TAMANHOS_LETRA.some((t) => t.chave === salvo.tamanhoLetra)) prefs.tamanhoLetra = salvo.tamanhoLetra;
    OPCOES.forEach(({ chave }) => {
      prefs[chave] = salvo[chave] === true;
    });
    return prefs;
  } catch {
    return { ...PADRAO };
  }
}

let atual = ler();

const FONTE_LEGIVEL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
const VLIBRAS = 'https://vlibras.gov.br/app/vlibras-plugin.js';

// A fonte legível só é baixada por quem liga a opção
function carregarFonteLegivel() {
  if (document.getElementById('fonte-legivel')) return;
  const link = document.createElement('link');
  link.id = 'fonte-legivel';
  link.rel = 'stylesheet';
  link.href = FONTE_LEGIVEL;
  document.head.appendChild(link);
}

// Widget oficial do governo federal: tradução do texto da página para Libras com um avatar
function ligarLibras(ligar) {
  let caixa = document.getElementById('vlibras');
  if (!ligar) {
    if (caixa) caixa.hidden = true;
    return;
  }
  if (caixa) {
    caixa.hidden = false;
    return;
  }
  caixa = document.createElement('div');
  caixa.id = 'vlibras';
  caixa.setAttribute('vw', '');
  caixa.className = 'enabled';
  caixa.innerHTML =
    '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.appendChild(caixa);
  const script = document.createElement('script');
  script.src = VLIBRAS;
  script.onload = () => {
    try {
      new window.VLibras.Widget('https://vlibras.gov.br/app');
    } catch {
      // Sem conexão com o VLibras: o botão só não aparece
    }
  };
  document.body.appendChild(script);
}

/** Aplica as preferências no <html> (o CSS faz o resto). */
export function aplicarAcessibilidade(prefs = atual) {
  const html = document.documentElement;
  if (prefs.tamanhoLetra === 'normal') html.removeAttribute('data-letra');
  else html.setAttribute('data-letra', prefs.tamanhoLetra);
  const marcar = (atributo, ligado) => (ligado ? html.setAttribute(atributo, '') : html.removeAttribute(atributo));
  marcar('data-espacamento', prefs.espacamento);
  marcar('data-fonte-legivel', prefs.fonteLegivel);
  marcar('data-sem-movimento', prefs.reduzirMovimento);
  marcar('data-destacar-links', prefs.destacarLinks);
  marcar('data-modo-foco', prefs.modoFoco);
  if (prefs.fonteLegivel) carregarFonteLegivel();
  if (prefs.libras || document.getElementById('vlibras')) ligarLibras(prefs.libras);
}

export function getAcessibilidade() {
  return atual;
}

export function setAcessibilidade(mudancas) {
  atual = { ...atual, ...mudancas };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // sem armazenamento: vale só até fechar a página
  }
  aplicarAcessibilidade(atual);
  ouvintes.forEach((avisar) => avisar());
}

export function restaurarAcessibilidade() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a limpar
  }
  atual = { ...PADRAO };
  aplicarAcessibilidade(atual);
  ouvintes.forEach((avisar) => avisar());
}

/** Quantas preferências estão diferentes do padrão (para o selinho no botão). */
export const quantasAtivas = (prefs) =>
  (prefs.tamanhoLetra !== 'normal' ? 1 : 0) + OPCOES.filter(({ chave }) => prefs[chave]).length;

function assinar(avisar) {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

export function useAcessibilidade() {
  return useSyncExternalStore(assinar, getAcessibilidade, getAcessibilidade);
}

/** Só para os testes: volta ao estado salvo. */
export function _reiniciarAcessibilidade() {
  atual = ler();
  aplicarAcessibilidade(atual);
}
