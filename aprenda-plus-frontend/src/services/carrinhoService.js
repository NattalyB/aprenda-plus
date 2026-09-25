import api from './api';

const getAlunoId = () => localStorage.getItem('idAluno');

// Busca o carrinho existente do aluno, ou cria um novo se não existir
const getOuCriarCarrinho = () => {
  const alunoId = getAlunoId();
  return api.get('/carrinhos').then((response) => {
    const carrinhoExistente = response.data.find((c) => c.aluno?.idAluno === Number(alunoId));
    if (carrinhoExistente) {
      return carrinhoExistente;
    }
    return api.post('/carrinhos', { aluno: { idAluno: alunoId } }).then((res) => res.data);
  });
};

export const adicionarAoCarrinho = (idCurso) => {
  return getOuCriarCarrinho().then((carrinho) => {
    return api.post('/itens-carrinho', {
      carrinho: { idCarrinho: carrinho.idCarrinho },
      curso: { idCurso: idCurso },
    });
  });
};

export const listarItensDoCarrinho = () => {
  return getOuCriarCarrinho().then((carrinho) => {
    return api.get('/itens-carrinho').then((response) => {
      return response.data.filter((item) => item.carrinho?.idCarrinho === carrinho.idCarrinho);
    });
  });
};

export const removerItemDoCarrinho = (idItem) => {
  return api.delete(`/itens-carrinho/${idItem}`);
};