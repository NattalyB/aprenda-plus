import { MODULOS, MODULOS_LIBERAVEIS, moduloPorChave, podeUsar, modulosLiberados } from './modulosAdmin';

test('são os módulos do back-end; Sistema e Treinamentos não entram na liberação', () => {
  expect(MODULOS.map((m) => m.chave)).toEqual([
    'alunos', 'professores', 'cursos', 'disciplinas', 'periodos',
    'turmas', 'aulas', 'inscricoes', 'matriculas', 'financeiro', 'comercial', 'chamados', 'funcionarios',
    'treinamentos', 'atualizacoes', 'suporte', 'historico', 'sistema',
  ]);
  expect(MODULOS_LIBERAVEIS).toHaveLength(14);
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).toContain('chamados');
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).not.toContain('suporte');
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).toContain('comercial');
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).not.toContain('treinamentos');
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).not.toContain('atualizacoes');
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).toContain('historico');
  expect(MODULOS_LIBERAVEIS.map((m) => m.chave)).not.toContain('sistema');
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

test('Treinamentos é de toda a equipe; Histórico o Master libera; Sistema só do Master', () => {
  expect(podeUsar({ master: false, modulos: [] }, 'treinamentos')).toBe(true);
  expect(podeUsar(null, 'treinamentos')).toBe(false);
  expect(podeUsar({ master: false, modulos: ['historico'] }, 'historico')).toBe(true);
  expect(podeUsar({ master: false, modulos: ['alunos'] }, 'historico')).toBe(false);
  expect(podeUsar({ master: false, modulos: ['sistema'] }, 'sistema')).toBe(false);
  expect(podeUsar({ master: true, modulos: [] }, 'historico')).toBe(true);
});

test('lista os módulos liberados na ordem do menu', () => {
  expect(modulosLiberados({ master: false, modulos: ['matriculas', 'alunos'] }).map((m) => m.chave)).toEqual([
    'alunos', 'matriculas', 'treinamentos', 'atualizacoes', 'suporte',
  ]);
  expect(modulosLiberados(null)).toEqual([]);
});

test('o nível Comercial vê só o Comercial, os Treinamentos e o Suporte', () => {
  expect(modulosLiberados({ master: false, modulos: ['comercial'] }).map((m) => m.chave)).toEqual([
    'comercial', 'treinamentos', 'atualizacoes', 'suporte',
  ]);
  // Abrir chamado é de todos; atender, só de quem tem o módulo Chamados
  expect(podeUsar({ master: false, modulos: [] }, 'suporte')).toBe(true);
  // Atualizações do sistema: toda a equipe vê
  expect(podeUsar({ master: false, modulos: [] }, 'atualizacoes')).toBe(true);
  expect(podeUsar({ master: false, modulos: ['comercial'] }, 'chamados')).toBe(false);
  expect(podeUsar({ master: false, modulos: ['comercial'] }, 'alunos')).toBe(false);
  expect(moduloPorChave('comercial').rota).toBe('/admin/comercial');
});
