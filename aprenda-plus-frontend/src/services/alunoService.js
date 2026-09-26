import api from './api';

export const listarAlunos = () => api.get('/alunos');
export const buscarAlunoPorId = (id) => api.get(`/alunos/${id}`);
export const criarAluno = (aluno) => api.post('/alunos', aluno);
export const atualizarAluno = (id, aluno) => api.put(`/alunos/${id}`, aluno);
export const deletarAluno = (id) => api.delete(`/alunos/${id}`);