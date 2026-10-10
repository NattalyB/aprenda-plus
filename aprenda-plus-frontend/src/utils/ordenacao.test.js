import { renderHook, act } from '@testing-library/react';
import { comparar, ordenarLista, useOrdenacao } from './ordenacao';

const CAMPOS = {
  id: (c) => c.id,
  nome: (c) => c.nome,
  valor: (c) => c.valor,
};

const cursos = [
  { id: 2, nome: 'Ética', valor: 500 },
  { id: 10, nome: 'administração', valor: 36000 },
  { id: 1, nome: 'Banco de Dados', valor: null },
];

const ids = (lista) => lista.map((c) => c.id);

describe('comparar', () => {
  test('números pelo valor', () => {
    expect(comparar(9, 10)).toBeLessThan(0);
  });

  test('textos ignorando acentos e maiúsculas', () => {
    expect(comparar('ética', 'Etica')).toBe(0);
    expect(comparar('Álvaro', 'Bruna')).toBeLessThan(0);
  });

  test('textos com números em ordem natural', () => {
    expect(comparar('Turma 2', 'Turma 10')).toBeLessThan(0);
  });
});

describe('ordenarLista', () => {
  test('ID crescente e decrescente', () => {
    expect(ids(ordenarLista(cursos, CAMPOS, { coluna: 'id', direcao: 'asc' }))).toEqual([1, 2, 10]);
    expect(ids(ordenarLista(cursos, CAMPOS, { coluna: 'id', direcao: 'desc' }))).toEqual([10, 2, 1]);
  });

  test('nome de A-Z e Z-A sem se confundir com acento ou letra minúscula', () => {
    expect(ids(ordenarLista(cursos, CAMPOS, { coluna: 'nome', direcao: 'asc' }))).toEqual([10, 1, 2]);
    expect(ids(ordenarLista(cursos, CAMPOS, { coluna: 'nome', direcao: 'desc' }))).toEqual([2, 1, 10]);
  });

  test('campo vazio sempre fica no fim', () => {
    expect(ids(ordenarLista(cursos, CAMPOS, { coluna: 'valor', direcao: 'asc' }))).toEqual([2, 10, 1]);
    expect(ids(ordenarLista(cursos, CAMPOS, { coluna: 'valor', direcao: 'desc' }))).toEqual([10, 2, 1]);
  });

  test('dois vazios mantêm a ordem entre eles', () => {
    const lista = [{ id: 1, valor: null }, { id: 2, valor: '' }, { id: 3, valor: 5 }];
    expect(ids(ordenarLista(lista, CAMPOS, { coluna: 'valor', direcao: 'asc' }))).toEqual([3, 1, 2]);
  });

  test('coluna desconhecida devolve a lista como está, sem alterar a original', () => {
    const resultado = ordenarLista(cursos, CAMPOS, { coluna: 'inexistente', direcao: 'asc' });
    expect(ids(resultado)).toEqual([2, 10, 1]);
    expect(resultado).not.toBe(cursos);
  });
});

describe('useOrdenacao', () => {
  test('começa por ID crescente, inverte ao clicar de novo e reinicia ao trocar de coluna', () => {
    const { result } = renderHook(() => useOrdenacao(cursos, CAMPOS));
    expect(ids(result.current.ordenados)).toEqual([1, 2, 10]);

    act(() => result.current.alternar('id'));
    expect(result.current.ordem).toEqual({ coluna: 'id', direcao: 'desc' });
    expect(ids(result.current.ordenados)).toEqual([10, 2, 1]);

    act(() => result.current.alternar('nome'));
    expect(result.current.ordem).toEqual({ coluna: 'nome', direcao: 'asc' });

    act(() => result.current.alternar('nome'));
    expect(result.current.ordem).toEqual({ coluna: 'nome', direcao: 'desc' });
  });
});
