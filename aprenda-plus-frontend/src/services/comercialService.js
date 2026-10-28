import api from './api';

// Painel (módulo Comercial)
export const buscarPainelComercial = (dias = 30) =>
  api.get('/comercial/painel', { params: { dias } }).then((response) => response.data);
export const listarLeads = () => api.get('/comercial/leads').then((response) => response.data);
export const listarContatosDoAluno = (idAluno) =>
  api.get('/comercial/contatos', { params: { aluno: idAluno } }).then((response) => response.data);
export const registrarContato = (contato) => api.post('/comercial/contatos', contato).then((response) => response.data);
