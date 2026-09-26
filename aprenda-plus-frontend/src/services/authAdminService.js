import api from './api';

export const loginFuncionario = (email, senha) => api.post('/auth/login-funcionario', { email, senha });

export const salvarSessaoAdmin = (dados) => {
  localStorage.setItem('tokenAdmin', dados.token);
  localStorage.setItem('idFuncionario', dados.idFuncionario);
  localStorage.setItem('nomeFuncionario', dados.nome);
  localStorage.setItem('cargoFuncionario', dados.cargo);
};

export const logoutAdmin = () => {
  localStorage.removeItem('tokenAdmin');
  localStorage.removeItem('idFuncionario');
  localStorage.removeItem('nomeFuncionario');
  localStorage.removeItem('cargoFuncionario');
};

export const estaLogadoAdmin = () => {
  return localStorage.getItem('tokenAdmin') !== null;
};

export const getNomeFuncionario = () => {
  return localStorage.getItem('nomeFuncionario');
};