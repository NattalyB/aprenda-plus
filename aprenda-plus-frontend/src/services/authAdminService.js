import api from './api';

export const loginFuncionario = (email, senha) => api.post('/auth/login-funcionario', { email, senha });

const CHAVE_ACESSO = 'acessoAdmin';

// Nível e módulos do funcionário: { nivel, master, modulos }
export const salvarAcessoAdmin = (acesso) => {
  localStorage.setItem(
    CHAVE_ACESSO,
    JSON.stringify({
      nivel: acesso?.nivel || null,
      master: Boolean(acesso?.master),
      modulos: acesso?.modulos || [],
    })
  );
};

export const getAcessoAdmin = () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ACESSO));
    return salvo && Array.isArray(salvo.modulos) ? salvo : null;
  } catch {
    return null;
  }
};

// Busca no servidor o nível atual (se o Master mudou as permissões, já vale)
export const buscarMeuAcesso = () => api.get('/niveis-acesso/meu').then((response) => response.data);

export const salvarSessaoAdmin = (dados) => {
  localStorage.setItem('tokenAdmin', dados.token);
  localStorage.setItem('idFuncionario', dados.idFuncionario);
  localStorage.setItem('nomeFuncionario', dados.nome);
  localStorage.setItem('cargoFuncionario', dados.cargo);
  salvarAcessoAdmin(dados);
};

export const CHAVES_SESSAO_ADMIN = ['tokenAdmin', 'idFuncionario', 'nomeFuncionario', 'cargoFuncionario', CHAVE_ACESSO];

export const logoutAdmin = () => {
  CHAVES_SESSAO_ADMIN.forEach((chave) => localStorage.removeItem(chave));
};

export const estaLogadoAdmin = () => {
  return localStorage.getItem('tokenAdmin') !== null;
};

export const getNomeFuncionario = () => {
  return localStorage.getItem('nomeFuncionario');
};
