import api from './api';

export const listarDisciplinas = () => api.get('/disciplinas');
export const buscarDisciplinaPorId = (id) => api.get(`/disciplinas/${id}`);
export const criarDisciplina = (disciplina) => api.post('/disciplinas', disciplina);
export const atualizarDisciplina = (id, disciplina) => api.put(`/disciplinas/${id}`, disciplina);
export const deletarDisciplina = (id) => api.delete(`/disciplinas/${id}`);