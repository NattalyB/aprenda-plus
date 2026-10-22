import api from './api';

// Painel: sala de aula EAD de cada turma. As alterações devolvem a sala inteira atualizada.
const dados = (r) => r.data;

export const resumoDasSalas = () => api.get('/planos-de-aula/resumo').then(dados);
export const buscarSalaDaTurma = (idTurma) => api.get(`/planos-de-aula/turma/${idTurma}`).then(dados);
export const andamentoDaTurma = (idTurma) => api.get(`/planos-de-aula/turma/${idTurma}/andamento`).then(dados);
export const definirProfessorDaSala = (idTurma, idProfessor) =>
  api.put(`/planos-de-aula/turma/${idTurma}/professor`, { idProfessor }).then(dados);
export const criarAulaEad = (idTurma, aula) => api.post(`/planos-de-aula/turma/${idTurma}/aulas`, aula).then(dados);
export const atualizarAulaEad = (idAula, aula) => api.put(`/planos-de-aula/aulas/${idAula}`, aula).then(dados);
export const excluirAulaEad = (idAula) => api.delete(`/planos-de-aula/aulas/${idAula}`).then(dados);
export const excluirAulasEad = (idTurma, ids) =>
  api.post(`/planos-de-aula/turma/${idTurma}/aulas/excluir`, { ids }).then(dados);
export const moverAulaEad =(idAula, direcao) =>
  api.put(`/planos-de-aula/aulas/${idAula}/mover`, null, { params: { direcao } }).then(dados);
export const copiarAulasDaTurma = (idTurma, idTurmaOrigem) =>
  api.post(`/planos-de-aula/turma/${idTurma}/copiar`, null, { params: { origem: idTurmaOrigem } }).then(dados);
export const publicarAvisoEad = (idTurma, aviso) => api.post(`/planos-de-aula/turma/${idTurma}/avisos`, aviso).then(dados);
export const excluirAvisoEad = (idAviso) => api.delete(`/planos-de-aula/avisos/${idAviso}`).then(dados);
export const editarAvisoEad = (idAviso, aviso) => api.put(`/planos-de-aula/avisos/${idAviso}`, aviso).then(dados);
