import api from './api';

export const listarInscricoes = () => api.get('/inscricoes');
export const buscarInscricaoPorId = (id) => api.get(`/inscricoes/${id}`);
export const criarInscricao = (idAluno, idTurma, valorTotal, formaPagamento) => {
  return api.post('/inscricoes', {
    aluno: { idAluno },
    turma: { idTurma },
    valorTotal,
    formaPagamento: formaPagamento || 'A definir',
  });
};
export const atualizarInscricao = (id, inscricao) => api.put(`/inscricoes/${id}`, inscricao);
export const deletarInscricao = (id) => api.delete(`/inscricoes/${id}`);