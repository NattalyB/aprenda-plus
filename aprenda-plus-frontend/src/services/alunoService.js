import api from './api';

export const listarAlunos = () => api.get('/alunos');
export const buscarAlunoPorId = (id) => api.get(`/alunos/${id}`);
export const criarAluno = (aluno) => api.post('/alunos', aluno);
export const atualizarAluno = (id, aluno) => api.put(`/alunos/${id}`, aluno);
export const deletarAluno = (id) => api.delete(`/alunos/${id}`);

// Cadastro pelo site: dados do aluno + certificado de conclusão, numa requisição só
export const cadastrarAlunoComDocumento = (aluno, arquivo) => {
  const dados = new FormData();
  dados.append('aluno', new Blob([JSON.stringify(aluno)], { type: 'application/json' }));
  if (arquivo) dados.append('documento', arquivo);
  return api.post('/alunos/com-documento', dados, { headers: { 'Content-Type': 'multipart/form-data' } });
};
