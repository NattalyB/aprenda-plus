import { act, renderHook } from '@testing-library/react';
import {
  OPCOES,
  PADRAO,
  _reiniciarAcessibilidade,
  aplicarAcessibilidade,
  getAcessibilidade,
  quantasAtivas,
  restaurarAcessibilidade,
  setAcessibilidade,
  useAcessibilidade,
} from './acessibilidade';

const html = document.documentElement;

afterEach(() => {
  localStorage.clear();
  document.getElementById('vlibras')?.remove();
  document.getElementById('fonte-legivel')?.remove();
  document.querySelectorAll('script[src*="vlibras"]').forEach((s) => s.remove());
  _reiniciarAcessibilidade();
});

test('começa no padrão e sem marcas no html', () => {
  expect(getAcessibilidade()).toEqual(PADRAO);
  expect(html).not.toHaveAttribute('data-letra');
  expect(html).not.toHaveAttribute('data-espacamento');
  expect(quantasAtivas(PADRAO)).toBe(0);
});

test('aplica cada opção no html e salva no navegador', () => {
  setAcessibilidade({ tamanhoLetra: 'maior', espacamento: true, reduzirMovimento: true, destacarLinks: true, modoFoco: true });
  expect(html).toHaveAttribute('data-letra', 'maior');
  expect(html).toHaveAttribute('data-espacamento');
  expect(html).toHaveAttribute('data-sem-movimento');
  expect(html).toHaveAttribute('data-destacar-links');
  expect(html).toHaveAttribute('data-modo-foco');
  expect(JSON.parse(localStorage.getItem('aprendaplus-acessibilidade'))).toMatchObject({ tamanhoLetra: 'maior', espacamento: true });
  expect(quantasAtivas(getAcessibilidade())).toBe(5);

  setAcessibilidade({ tamanhoLetra: 'normal', espacamento: false });
  expect(html).not.toHaveAttribute('data-letra');
  expect(html).not.toHaveAttribute('data-espacamento');
});

test('a fonte legível só é baixada quando ligada', () => {
  expect(document.getElementById('fonte-legivel')).toBeNull();
  setAcessibilidade({ fonteLegivel: true });
  expect(html).toHaveAttribute('data-fonte-legivel');
  expect(document.getElementById('fonte-legivel')).toHaveAttribute('href', expect.stringContaining('Atkinson+Hyperlegible'));
  setAcessibilidade({ fonteLegivel: false });
  setAcessibilidade({ fonteLegivel: true });
  expect(document.querySelectorAll('#fonte-legivel')).toHaveLength(1);
});

test('VLibras: liga, esconde e mostra de novo sem baixar duas vezes', () => {
  setAcessibilidade({ libras: true });
  const caixa = document.getElementById('vlibras');
  expect(caixa).toHaveAttribute('vw');
  expect(caixa.hidden).toBe(false);
  const script = document.querySelector('script[src*="vlibras"]');
  expect(script).not.toBeNull();

  // Quando o script carrega, cria o widget (e não quebra se o VLibras falhar)
  window.VLibras = { Widget: jest.fn() };
  script.onload();
  expect(window.VLibras.Widget).toHaveBeenCalledWith('https://vlibras.gov.br/app');
  window.VLibras = { Widget: () => { throw new Error('offline'); } };
  expect(() => script.onload()).not.toThrow();
  delete window.VLibras;

  setAcessibilidade({ libras: false });
  expect(caixa.hidden).toBe(true);
  setAcessibilidade({ libras: true });
  expect(caixa.hidden).toBe(false);
  expect(document.querySelectorAll('script[src*="vlibras"]')).toHaveLength(1);
});

test('lê o que estava salvo e ignora valores estranhos', () => {
  localStorage.setItem('aprendaplus-acessibilidade', JSON.stringify({ tamanhoLetra: 'gigante', espacamento: 'sim', modoFoco: true }));
  _reiniciarAcessibilidade();
  expect(getAcessibilidade()).toEqual({ ...PADRAO, modoFoco: true });

  localStorage.setItem('aprendaplus-acessibilidade', '{quebrado');
  _reiniciarAcessibilidade();
  expect(getAcessibilidade()).toEqual(PADRAO);

  localStorage.setItem('aprendaplus-acessibilidade', 'null');
  _reiniciarAcessibilidade();
  expect(getAcessibilidade()).toEqual(PADRAO);
});

test('voltar ao padrão limpa tudo', () => {
  setAcessibilidade({ tamanhoLetra: 'grande', modoFoco: true });
  restaurarAcessibilidade();
  expect(getAcessibilidade()).toEqual(PADRAO);
  expect(localStorage.getItem('aprendaplus-acessibilidade')).toBeNull();
  expect(html).not.toHaveAttribute('data-modo-foco');
});

test('o hook redesenha quando muda', () => {
  const { result, unmount } = renderHook(() => useAcessibilidade());
  act(() => setAcessibilidade({ destacarLinks: true }));
  expect(result.current.destacarLinks).toBe(true);
  unmount();
});

test('sem armazenamento continua funcionando', () => {
  const getItem = Storage.prototype.getItem;
  const setItem = Storage.prototype.setItem;
  const removeItem = Storage.prototype.removeItem;
  Storage.prototype.getItem = () => { throw new Error('bloqueado'); };
  Storage.prototype.setItem = () => { throw new Error('bloqueado'); };
  Storage.prototype.removeItem = () => { throw new Error('bloqueado'); };
  try {
    _reiniciarAcessibilidade();
    expect(getAcessibilidade()).toEqual(PADRAO);
    setAcessibilidade({ espacamento: true });
    expect(html).toHaveAttribute('data-espacamento');
    restaurarAcessibilidade();
    expect(getAcessibilidade()).toEqual(PADRAO);
  } finally {
    Storage.prototype.getItem = getItem;
    Storage.prototype.setItem = setItem;
    Storage.prototype.removeItem = removeItem;
  }
});

test('todas as opções têm rótulo e explicação', () => {
  OPCOES.forEach((o) => {
    expect(o.rotulo).toBeTruthy();
    expect(o.dica).toBeTruthy();
    expect(PADRAO[o.chave]).toBe(false);
  });
  aplicarAcessibilidade();
});
