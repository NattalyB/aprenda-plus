import api from './api';

export const criarInscricao = (idAluno, idTurma, valorTotal) => {
  return api.post('/inscricoes', {
    aluno: { idAluno },
    turma: { idTurma },
    valorTotal,
    formaPagamento: 'A definir',
  });
};