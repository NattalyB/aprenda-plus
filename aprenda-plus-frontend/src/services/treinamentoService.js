import api from './api';

// Treinamentos do painel: vídeos do YouTube e PDFs de como usar o sistema

export const TAMANHO_MAXIMO_PDF = 5 * 1024 * 1024; // 5 MB

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

// Confere o PDF antes de enviar (o servidor confere de novo pelo conteúdo)
export const conferirPdf = (arquivo) => {
  if (!arquivo) return null;
  if (!/\.pdf$/i.test(arquivo.name || '')) return 'O arquivo precisa ser um PDF.';
  if (arquivo.size > TAMANHO_MAXIMO_PDF) return 'O PDF pode ter no máximo 5 MB.';
  return null;
};

const montar = ({ titulo, descricao, videoUrl, ordem }, arquivo, removerPdf) => {
  const dados = new FormData();
  dados.append('titulo', titulo || '');
  dados.append('descricao', descricao || '');
  dados.append('videoUrl', videoUrl || '');
  if (ordem !== '' && ordem !== null && ordem !== undefined) dados.append('ordem', String(ordem));
  if (arquivo) dados.append('pdf', arquivo);
  if (removerPdf) dados.append('removerPdf', 'true');
  return dados;
};

export const listarTreinamentos = () => api.get('/treinamentos').then((r) => r.data);
export const criarTreinamento = (campos, arquivo) =>
  api.post('/treinamentos', montar(campos, arquivo, false), multipart).then((r) => r.data);
export const atualizarTreinamento = (id, campos, arquivo, removerPdf = false) =>
  api.put(`/treinamentos/${id}`, montar(campos, arquivo, removerPdf), multipart).then((r) => r.data);
export const excluirTreinamento = (id) => api.delete(`/treinamentos/${id}`);
export const baixarPdfDoTreinamento = (id) => api.get(`/treinamentos/${id}/pdf`, { responseType: 'blob' });
