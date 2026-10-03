import api from './api';

// Avisa os componentes (ex: Header) que o carrinho mudou
const avisarCarrinhoAtualizado = () => {
  window.dispatchEvent(new Event('carrinho-atualizado'));
};

// Busca (ou cria) o carrinho do aluno logado. O backend identifica o aluno pelo token.
const getMeuCarrinho = () => api.get('/carrinhos/meu').then((response) => response.data);

export const adicionarAoCarrinho = (idCurso) => {
  return getMeuCarrinho()
    .then((carrinho) => {
      return api.post('/itens-carrinho', {
        carrinho: { idCarrinho: carrinho.idCarrinho },
        curso: { idCurso: idCurso },
      });
    })
    .then((response) => {
      avisarCarrinhoAtualizado();
      return response;
    });
};

// Lista só os itens do carrinho do aluno logado
export const listarItensDoCarrinho = () => {
  return api.get('/itens-carrinho/meus').then((response) => response.data);
};

export const removerItemDoCarrinho = (idItem) => {
  return api.delete(`/itens-carrinho/${idItem}`).then((response) => {
    avisarCarrinhoAtualizado();
    return response;
  });
};