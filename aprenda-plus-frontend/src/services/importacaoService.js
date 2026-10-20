import api from './api';

// Importação por planilha: confirmar = false só confere (prévia); true grava as linhas sem erro.
// Cada cadastro tem a sua rota, dentro do próprio módulo (assim valem as permissões do nível).
const ROTAS = {
  alunos: () => '/alunos/importacao',
  professores: () => '/professores/importacao',
  cursos: () => '/cursos/importacao',
  disciplinas: () => '/disciplinas/importacao',
  aulas: (idTurma) => `/planos-de-aula/turma/${idTurma}/aulas/importacao`,
};

export const importarPlanilha = (tipo, linhas, { confirmar = false, idTurma } = {}) =>
  api
    .post(ROTAS[tipo](idTurma), { linhas }, { params: { confirmar } })
    .then((response) => response.data);
