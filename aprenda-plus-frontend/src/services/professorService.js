import api from './api';

export const listarProfessores = () => api.get('/professores');
export const buscarProfessorPorId = (id) => api.get(`/professores/${id}`);
export const criarProfessor = (professor) => api.post('/professores', professor);
export const atualizarProfessor = (id, professor) => api.put(`/professores/${id}`, professor);
export const deletarProfessor = (id) => api.delete(`/professores/${id}`);
// Cursos e disciplinas que o professor leciona: { cursos: [ids], disciplinas: [ids] }
export const buscarVinculosProfessor = (id) => api.get(`/professores/${id}/vinculos`);
export const salvarVinculosProfessor = (id, vinculos) => api.put(`/professores/${id}/vinculos`, vinculos);
