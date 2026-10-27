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

// Multa, juros e desconto
// Prévia da baixa: quanto a parcela custa se for paga na data { data, isentarEncargos, desconto }
export const calcularParcela = (idPagamento, { data, isentarEncargos, desconto } = {}) => {
  const params = {};
  if (data) params.data = data;
  if (isentarEncargos) params.isentarEncargos = 'true';
  if (desconto !== undefined && desconto !== null && String(desconto).trim() !== '') params.desconto = desconto;
  return api.get(`/financeiro/parcelas/${idPagamento}/calculo`, { params }).then((response) => response.data);
};
export const buscarRegrasDeCobranca = () => api.get('/financeiro/configuracao').then((response) => response.data);
export const salvarRegrasDeCobranca = (regras) => api.put('/financeiro/configuracao', regras).then((response) => response.data);

// Contas a pagar
export const listarContas = () => api.get('/financeiro/contas').then((response) => response.data);
export const listarCategoriasDeContas = () => api.get('/financeiro/contas/categorias').then((response) => response.data);
export const criarConta = (conta, repetirMeses = 1) =>
  api.post('/financeiro/contas', conta, { params: { repetirMeses } }).then((response) => response.data);
export const atualizarConta = (id, conta) => api.put(`/financeiro/contas/${id}`, conta).then((response) => response.data);
export const excluirConta = (id) => api.delete(`/financeiro/contas/${id}`);
export const pagarConta = (id, dados) => api.put(`/financeiro/contas/${id}/pagamento`, dados).then((response) => response.data);
export const estornarConta = (id) => api.put(`/financeiro/contas/${id}/estorno`).then((response) => response.data);

// Fluxo de caixa
export const buscarFluxoDeCaixa = () => api.get('/financeiro/fluxo-caixa').then((response) => response.data);

// Pagamento dos professores (hora-aula)
export const listarFolhaDosProfessores = (referencia) =>
  api.get('/financeiro/professores', { params: { referencia } }).then((response) => response.data);
export const definirValorDaHora = (idProfessor, valorHora) =>
  api.put(`/financeiro/professores/${idProfessor}/valor-hora`, { valorHora }).then((response) => response.data);
export const gerarPagamentoDoProfessor = (idProfessor, dados) =>
  api.post(`/financeiro/professores/${idProfessor}/pagamento`, dados).then((response) => response.data);
