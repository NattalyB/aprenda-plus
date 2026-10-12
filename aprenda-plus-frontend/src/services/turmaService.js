import api from './api';

export const listarTurmas = () => api.get('/turmas');
export const buscarTurmaPorId = (id) => api.get(`/turmas/${id}`);
export const criarTurma = (turma) => api.post('/turmas', turma);
export const atualizarTurma = (id, turma) => api.put(`/turmas/${id}`, turma);
export const deletarTurma = (id) => api.delete(`/turmas/${id}`);
// Turmas abertas de um curso, com as vagas que restam: [{ idTurma, nome, diasHorarios, vagasRestantes, ... }]
export const listarTurmasDisponiveis = (idCurso) =>
  api.get(`/turmas/curso/${idCurso}/disponiveis`).then((response) => response.data);
