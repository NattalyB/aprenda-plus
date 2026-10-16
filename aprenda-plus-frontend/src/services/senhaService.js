import api from './api';

// "Esqueci minha senha" (aluno ou funcionário do painel)
export const pedirNovaSenha = (email, tipo) =>
  api.post('/auth/esqueci-senha', { email, tipo }).then((r) => r.data);

export const redefinirSenha = (token, novaSenha) =>
  api.post('/auth/redefinir-senha', { token, novaSenha }).then((r) => r.data);
