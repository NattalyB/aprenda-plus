import api from './api';

// Assistente virtual do site: o back-end fala com a IA (a chave nunca fica no navegador)
// historico: [{ autor: 'aluno' | 'assistente', texto }]
export const enviarPergunta = (mensagem, historico = []) =>
  api.post('/chat', { mensagem, historico }).then((r) => r.data);
