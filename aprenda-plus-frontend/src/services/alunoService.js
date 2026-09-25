import api from './api';

export const listarAlunos = () => api.get('/alunos');
export const criarAluno = (aluno) => api.post('/alunos', aluno);