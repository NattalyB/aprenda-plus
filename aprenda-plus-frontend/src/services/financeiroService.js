import api from './api';

// Painel (módulo Financeiro)
export const listarParcelas = () => api.get('/financeiro/parcelas').then((response) => response.data);
export const buscarResumoFinanceiro = () => api.get('/financeiro/resumo').then((response) => response.data);
export const buscarAlertasFinanceiros = () => api.get('/financeiro/alertas').then((response) => response.data);
export const registrarPagamentoDaParcela = (idPagamento, dados) =>
  api.put(`/financeiro/parcelas/${idPagamento}/pagamento`, dados).then((response) => response.data);
export const estornarParcela = (idPagamento) =>
  api.put(`/financeiro/parcelas/${idPagamento}/estorno`).then((response) => response.data);
export const gerarParcelasQueFaltam = () => api.post('/financeiro/gerar-parcelas').then((response) => response.data);

// Área do aluno
export const listarMinhasParcelas = () => api.get('/financeiro/meus').then((response) => response.data);
