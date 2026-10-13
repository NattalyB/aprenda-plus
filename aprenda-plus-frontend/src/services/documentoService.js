import api from './api';

// Documento de escolaridade (certificado de conclusão do ensino médio)

export const TAMANHO_MAXIMO_DOCUMENTO = 5 * 1024 * 1024; // 5 MB
export const TIPOS_DOCUMENTO = '.pdf,.jpg,.jpeg,.png';

// Confere o arquivo antes de enviar. Devolve a mensagem de erro ou null se estiver tudo certo.
// (O servidor confere de novo pelo conteúdo do arquivo.)
export const conferirArquivoDoDocumento = (arquivo) => {
  if (!arquivo) return 'Anexe o certificado de conclusão (PDF, JPG ou PNG).';
  const nome = (arquivo.name || '').toLowerCase();
  if (!/\.(pdf|jpe?g|png)$/.test(nome)) return 'Envie o documento em PDF, JPG ou PNG.';
  if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) return 'O arquivo pode ter no máximo 5 MB.';
  return null;
};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

// ===== Aluno =====
export const listarMeusDocumentos = () => api.get('/documentos/meus');

export const enviarMeuDocumento = (arquivo) => {
  const dados = new FormData();
  dados.append('arquivo', arquivo);
  return api.post('/documentos/meus', dados, multipart);
};

// ===== Painel =====
export const listarDocumentosDoAluno = (idAluno) => api.get(`/documentos/aluno/${idAluno}`);
export const situacaoDosDocumentos = () => api.get('/documentos/situacao');
export const revisarDocumento = (id, status, observacao) =>
  api.put(`/documentos/${id}/revisao`, { status, observacao });

// O arquivo vem como Blob (PDF ou imagem), pra abrir numa janela ou mostrar na tela
export const baixarArquivoDoDocumento = (id) => api.get(`/documentos/${id}/arquivo`, { responseType: 'blob' });

export const STATUS_DOCUMENTO = {
  pendente: { texto: 'Em análise', classe: 'doc-status-pendente', icone: '⏳' },
  aprovado: { texto: 'Aprovado', classe: 'doc-status-aprovado', icone: '✅' },
  recusado: { texto: 'Recusado', classe: 'doc-status-recusado', icone: '❌' },
};

export const formatarTamanho = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
};
