import api from './api';

// Atualizações do sistema: o que mudou e as manutenções programadas.
// Toda a equipe consulta; só o Master publica, edita e exclui.
const dados = (r) => r.data;

export const listarAtualizacoes = () => api.get('/atualizacoes').then(dados);

// Manutenções que ainda não terminaram (o professor usa a rota do portal)
export const listarManutencoes = (perfil = 'funcionario') =>
  api.get(perfil === 'professor' ? '/docente/manutencoes' : '/atualizacoes/manutencoes').then(dados);

export const criarAtualizacao = (atualizacao) => api.post('/atualizacoes', atualizacao).then(dados);

export const editarAtualizacao = (id, atualizacao) => api.put(`/atualizacoes/${id}`, atualizacao).then(dados);

export const excluirAtualizacao = (id) => api.delete(`/atualizacoes/${id}`);
