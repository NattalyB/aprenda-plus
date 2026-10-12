import { MODULOS, MODULOS_LIBERAVEIS, moduloPorChave, podeUsar, modulosLiberados } from './modulosAdmin';

test('são os mesmos 11 módulos do back-end, e o Sistema não pode ser liberado', () => {
  expect(MODULOS.map((m) => m.chave)).toEqual([
    'alunos', 'professores', 'cursos', 'disciplinas', 'periodos',
    'turmas', 'inscricoes', 'matriculas', 'financeiro', 'funcionarios', 'sistema',
  ]);
  expect(MODULOS_LIBERAVEIS).toHaveLength(10);
  expect(moduloPorChave('turmas').rota).toBe('/admin/turmas');
  expect(moduloPorChave('xpto')).toBeUndefined();
});

test('Master pode tudo; os outros, só o que foi liberado', () => {
  expect(podeUsar({ master: true, modulos: [] }, 'sistema')).toBe(true);
  expect(podeUsar({ master: false, modulos: ['alunos'] }, 'alunos')).toBe(true);
  expect(podeUsar({ master: false, modulos: ['alunos'] }, 'cursos')).toBe(false);
  expect(podeUsar({ master: false }, 'cursos')).toBe(false);
  expect(podeUsar(null, 'alunos')).toBe(false);
});

test('lista os módulos liberados na ordem do menu', () => {
  expect(modulosLiberados({ master: false, modulos: ['matriculas', 'alunos'] }).map((m) => m.chave)).toEqual([
    'alunos', 'matriculas',
  ]);
  expect(modulosLiberados(null)).toEqual([]);
});
