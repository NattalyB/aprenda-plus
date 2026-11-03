import api from './api';

export const listarInscricoes = () => api.get('/inscricoes');
export const buscarInscricaoPorId = (id) => api.get(`/inscricoes/${id}`);
// pagamentoDividido (opcional): as duas formas quando o aluno divide o pagamento
// [{ forma: 'cartao', parcelas: 10, valor: 1500 }, { forma: 'cartao', parcelas: 5, valor: 2300 }]
export const criarInscricao = (idAluno, idTurma, valorTotal, formaPagamento, pagamentoDividido) => {
  const dados = {
    aluno: { idAluno },
    turma: { idTurma },
    valorTotal,
    formaPagamento: formaPagamento || 'A definir',
  };
  if (pagamentoDividido?.length) dados.pagamentoDividido = pagamentoDividido;
  return api.post('/inscricoes', dados);
};
export const atualizarInscricao = (id, inscricao) => api.put(`/inscricoes/${id}`, inscricao);
export const deletarInscricao = (id) => api.delete(`/inscricoes/${id}`);
// Área do aluno
export const listarMinhasInscricoes = () => api.get('/inscricoes/minhas').then((response) => response.data);
export const trocarTurmaDaInscricao = (idInscricao, idTurma) =>
  api.put(`/inscricoes/${idInscricao}/turma`, { idTurma }).then((response) => response.data);
