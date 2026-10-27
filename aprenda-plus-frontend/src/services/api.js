import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://aprenda-plus-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Está numa tela do painel admin? E no Portal do Professor?
const estaNaAreaAdmin = () => window.location.hash.startsWith('#/admin');
const estaNoPortalDoProfessor = () => window.location.hash.startsWith('#/professor');

// Antes de cada requisição: envia o token de quem está logado
api.interceptors.request.use((config) => {
  // Login do professor (a própria tela de login decide pelo endereço chamado)
  const ehLoginDeProfessor = config.url === '/auth/login-professor';
  let token;
  if (estaNaAreaAdmin()) token = localStorage.getItem('tokenAdmin');
  else if (estaNoPortalDoProfessor() || (config.url || '').startsWith('/docente')) token = localStorage.getItem('tokenProfessor');
  else if (!ehLoginDeProfessor) token = localStorage.getItem('token');

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
        ['tokenAdmin', 'idFuncionario', 'nomeFuncionario', 'cargoFuncionario', 'acessoAdmin'].forEach((chave) =>
          localStorage.removeItem(chave)
        );
        window.location.hash = '#/admin/login';
      } else if (estaNoPortalDoProfessor() || (error.config?.url || '').startsWith('/docente')) {
        ['tokenProfessor', 'idProfessor', 'nomeProfessor'].forEach((chave) => localStorage.removeItem(chave));
        window.location.hash = '#/login?perfil=professor';
      } else {
        ['token', 'idAluno', 'nomeAluno'].forEach((chave) => localStorage.removeItem(chave));
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;