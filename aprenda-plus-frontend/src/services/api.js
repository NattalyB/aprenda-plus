import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://aprenda-plus-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Está numa tela do painel admin?
const estaNaAreaAdmin = () => window.location.hash.startsWith('#/admin');

// Antes de cada requisição: envia o token de quem está logado
api.interceptors.request.use((config) => {
  const token = estaNaAreaAdmin()
    ? localStorage.getItem('tokenAdmin')
    : localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Depois de cada resposta: se a sessão expirou, limpa o login e manda pra tela de login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const ehTentativaDeLogin = error.config?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !ehTentativaDeLogin) {
      if (estaNaAreaAdmin()) {
        ['tokenAdmin', 'idFuncionario', 'nomeFuncionario', 'cargoFuncionario'].forEach((chave) =>
          localStorage.removeItem(chave)
        );
        window.location.hash = '#/admin/login';
      } else {
        ['token', 'idAluno', 'nomeAluno'].forEach((chave) => localStorage.removeItem(chave));
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;