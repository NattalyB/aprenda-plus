import api from './api';

// Chamados de suporte.
// - Quem abre: funcionário do painel (/meus-chamados) ou professor (/docente/chamados).
// - Quem atende: módulo Chamados do painel (/chamados).
// Os formulários vão como multipart, porque podem levar um print ou PDF junto.

const dados = (r) => r.data;

// Base das rotas de quem abriu o chamado
export const baseDoSolicitante = (perfil) => (perfil === 'professor' ? '/docente/chamados' : '/meus-chamados');

const formulario = (campos, anexo) => {
  const form = new FormData();
  Object.entries(campos).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') form.append(chave, valor);
  });
  if (anexo) form.append('anexo', anexo);
  return form;
};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

// ===== Quem abriu =====
export const listarMeusChamados = (perfil) => api.get(baseDoSolicitante(perfil)).then(dados);

export const buscarMeuChamado = (perfil, id) => api.get(`${baseDoSolicitante(perfil)}/${id}`).then(dados);

export const abrirChamado = (perfil, { assunto, categoria, prioridade, descricao, tela }, anexo) =>
  api.post(baseDoSolicitante(perfil), formulario({ assunto, categoria, prioridade, descricao, tela }, anexo), multipart)
    .then(dados);

export const escreverNoChamado = (perfil, id, texto, anexo) =>
  api.post(`${baseDoSolicitante(perfil)}/${id}/mensagens`, formulario({ texto }, anexo), multipart).then(dados);

export const fecharChamado = (perfil, id) => api.put(`${baseDoSolicitante(perfil)}/${id}/fechar`).then(dados);

export const baixarAnexoDoMeuChamado = (perfil, id, idMensagem) =>
  api.get(`${baseDoSolicitante(perfil)}/${id}/mensagens/${idMensagem}/anexo`, { responseType: 'blob' });

// ===== Suporte (módulo Chamados) =====
export const listarChamados = () => api.get('/chamados').then(dados);

export const buscarChamado = (id) => api.get(`/chamados/${id}`).then(dados);

export const responderChamado = (id, texto, anexo, status) =>
  api.post(`/chamados/${id}/mensagens`, formulario({ texto, status }, anexo), multipart).then(dados);

// { status, prioridade, responsavelId } — responsavelId 0 tira o responsável
export const atualizarChamado = (id, mudancas) => api.put(`/chamados/${id}`, mudancas).then(dados);

export const baixarAnexoDoChamado = (id, idMensagem) =>
  api.get(`/chamados/${id}/mensagens/${idMensagem}/anexo`, { responseType: 'blob' });
