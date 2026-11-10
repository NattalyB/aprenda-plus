import { act, renderHook } from '@testing-library/react';
import {
  TIPOS,
  agruparPorMes,
  atualizacoesNovas,
  dataPublicacao,
  iconeTipo,
  iniciarVistas,
  lerVistas,
  manutencoesPendentes,
  marcarVistas,
  periodoManutencao,
  rotuloTipo,
  situacaoManutencao,
  useVistas,
} from './atualizacoes';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('idFuncionario', '3');
});

const manutencao = (inicio, fim, extra = {}) => ({
  idAtualizacao: 1, tipo: 'manutencao', inicioManutencao: inicio, fimManutencao: fim, ...extra,
});

test('tipos com rótulo e ícone', () => {
  expect(TIPOS.map((t) => t.chave)).toEqual(['novidade', 'melhoria', 'correcao', 'manutencao']);
  expect(rotuloTipo('correcao')).toBe('Correção');
  expect(rotuloTipo('xpto')).toBe('xpto');
  expect(rotuloTipo(undefined)).toBe('');
  expect(iconeTipo('novidade')).toBe('✨');
  expect(iconeTipo('xpto')).toBe('📢');
});

test('situação da manutenção: programada, em andamento e concluída', () => {
  const m = manutencao('2026-11-20T22:00:00', '2026-11-20T22:30:00');
  expect(situacaoManutencao(m, new Date(2026, 10, 20, 21, 0))).toBe('programada');
  expect(situacaoManutencao(m, new Date(2026, 10, 20, 22, 10))).toBe('andamento');
  expect(situacaoManutencao(m, new Date(2026, 10, 20, 22, 30))).toBe('concluida');
  expect(situacaoManutencao({ tipo: 'novidade' })).toBeNull();
  expect(situacaoManutencao(null)).toBeNull();
});

test('período da manutenção no mesmo dia ou atravessando a noite', () => {
  expect(periodoManutencao(manutencao('2026-11-20T22:00:00', '2026-11-20T22:30:00'))).toBe('20/11 das 22:00 às 22:30');
  expect(periodoManutencao(manutencao('2026-11-20T23:00:00', '2026-11-21T02:00:00'))).toBe(
    '20/11 às 23:00 até 21/11 às 02:00'
  );
  expect(periodoManutencao({ tipo: 'novidade' })).toBe('');
});

test('manutenções pendentes: só as que não terminaram, da mais próxima para a mais distante', () => {
  const agora = new Date(2026, 10, 20, 12, 0);
  const lista = [
    manutencao('2026-11-25T22:00:00', '2026-11-25T23:00:00', { idAtualizacao: 1 }),
    manutencao('2026-11-10T22:00:00', '2026-11-10T23:00:00', { idAtualizacao: 2 }),
    manutencao('2026-11-20T11:00:00', '2026-11-20T13:00:00', { idAtualizacao: 3 }),
    { idAtualizacao: 4, tipo: 'novidade' },
  ];
  expect(manutencoesPendentes(lista, agora).map((m) => m.idAtualizacao)).toEqual([3, 1]);
  expect(manutencoesPendentes(null)).toEqual([]);
});

test('agrupa por mês e formata a data de publicação', () => {
  const grupos = agruparPorMes([
    { idAtualizacao: 3, publicadoEm: '2026-11-09T21:00:00' },
    { idAtualizacao: 2, publicadoEm: '2026-11-03T10:00:00' },
    { idAtualizacao: 1, publicadoEm: '2026-10-28T10:00:00' },
    { idAtualizacao: 0 },
  ]);
  expect(grupos.map((g) => [g.mes, g.itens.length])).toEqual([
    ['novembro de 2026', 2],
    ['outubro de 2026', 1],
    ['Sem data', 1],
  ]);
  expect(agruparPorMes(null)).toEqual([]);
  expect(dataPublicacao('2026-11-09T21:00:00')).toBe('09/11/2026');
  expect(dataPublicacao(null)).toBe('');
  expect(dataPublicacao('não é data')).toBe('');
});

test('no primeiro acesso começa em dia; depois só avisa o que for novo', () => {
  const lista = [{ idAtualizacao: 5 }, { idAtualizacao: 2 }];
  expect(lerVistas()).toBeNull();
  expect(atualizacoesNovas(lista)).toEqual([]);

  iniciarVistas(lista);
  expect(lerVistas()).toBe(5);
  expect(localStorage.getItem('atualizacoesVistas:3')).toBe('5');

  // Não sobrescreve quem já tem marcação
  iniciarVistas([{ idAtualizacao: 9 }]);
  expect(lerVistas()).toBe(5);

  const comNova = [{ idAtualizacao: 7 }, ...lista];
  expect(atualizacoesNovas(comNova).map((a) => a.idAtualizacao)).toEqual([7]);
  marcarVistas(comNova);
  expect(atualizacoesNovas(comNova)).toEqual([]);
  expect(atualizacoesNovas([])).toEqual([]);
  iniciarVistas([]);
});

test('cada funcionário tem a sua marcação', () => {
  marcarVistas([{ idAtualizacao: 4 }]);
  localStorage.setItem('idFuncionario', '8');
  expect(lerVistas()).toBeNull();
  localStorage.removeItem('idFuncionario');
  marcarVistas([{}]);
  expect(localStorage.getItem('atualizacoesVistas:anonimo')).toBe('0');
});

test('useVistas redesenha quando marca como visto', () => {
  const { result, unmount } = renderHook(() => useVistas());
  expect(result.current).toBeNull();
  act(() => marcarVistas([{ idAtualizacao: 6 }]));
  expect(result.current).toBe(6);
  unmount();
});

test('sem armazenamento não quebra', () => {
  const original = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  Storage.prototype.getItem = () => {
    throw new Error('bloqueado');
  };
  Storage.prototype.setItem = () => {
    throw new Error('bloqueado');
  };
  try {
    expect(lerVistas()).toBe(0);
    expect(() => marcarVistas([{ idAtualizacao: 1 }])).not.toThrow();
  } finally {
    Storage.prototype.getItem = original;
    Storage.prototype.setItem = originalSet;
  }
});
