import api from './api';

export const login = (email, senha) => api.post('/auth/login', { email, senha });

export const salvarSessao = (dados) => {
  localStorage.setItem('token', dados.token);
  localStorage.setItem('idAluno', dados.idAluno);
  localStorage.setItem('nomeAluno', dados.nome);
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('idAluno');
  localStorage.removeItem('nomeAluno');
};

export const estaLogado = () => {
  return localStorage.getItem('token') !== null;
};

export const getNomeAluno = () => {
  return localStorage.getItem('nomeAluno');
};