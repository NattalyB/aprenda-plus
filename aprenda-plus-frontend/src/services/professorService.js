import api from './api';

export const listarProfessores = () => api.get('/professores');
export const buscarProfessorPorId = (id) => api.get(`/professores/${id}`);
export const criarProfessor = (professor) => api.post('/professores', professor);
export const atualizarProfessor = (id, professor) => api.put(`/professores/${id}`, professor);
export const deletarProfessor = (id) => api.delete(`/professores/${id}`);