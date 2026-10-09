import api from './api';

// Pega as funções que o api.js registrou como "interceptadores"
const antesDaRequisicao = api.interceptors.request.handlers[0].fulfilled;
const respostaOk = api.interceptors.response.handlers[0].fulfilled;
const respostaComErro = api.interceptors.response.handlers[0].rejected;

const erroHttp = (status, url = '/alunos') => ({ config: { url }, response: { status } });

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('envio do token', () => {
  test('no site, envia o token do aluno', () => {
    localStorage.setItem('token', 'token-aluno');
    localStorage.setItem('tokenAdmin', 'token-admin');
    window.location.hash = '#/carrinho';

    const config = antesDaRequisicao({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-aluno');
  });

  test('no painel admin, envia o token do funcionário', () => {
    localStorage.setItem('token', 'token-aluno');
    localStorage.setItem('tokenAdmin', 'token-admin');
    window.location.hash = '#/admin/alunos';

    const config = antesDaRequisicao({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-admin');
  });

  test('sem login, não envia token', () => {
    const config = antesDaRequisicao({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('sessão expirada (erro 401)', () => {
  test('no site, desloga o aluno e manda para o login', async () => {
    localStorage.setItem('token', 'x');
    localStorage.setItem('idAluno', '7');
    localStorage.setItem('nomeAluno', 'Maria');
    window.location.hash = '#/carrinho';

    await expect(respostaComErro(erroHttp(401))).rejects.toBeTruthy();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('nomeAluno')).toBeNull();
    expect(window.location.hash).toBe('#/login');
  });

  test('no admin, desloga o funcionário e manda para o login do admin', async () => {
    localStorage.setItem('tokenAdmin', 'x');
    localStorage.setItem('nomeFuncionario', 'Admin');
    window.location.hash = '#/admin/cursos';

    await expect(respostaComErro(erroHttp(401))).rejects.toBeTruthy();

    expect(localStorage.getItem('tokenAdmin')).toBeNull();
    expect(window.location.hash).toBe('#/admin/login');
  });

  test('senha errada no login (401 em /auth) não desloga ninguém', async () => {
    localStorage.setItem('token', 'x');
    window.location.hash = '#/login';

    await expect(respostaComErro(erroHttp(401, '/auth/login'))).rejects.toBeTruthy();

    expect(localStorage.getItem('token')).toBe('x');
  });

  test('outros erros só são repassados', async () => {
    localStorage.setItem('token', 'x');
    const erro = erroHttp(500);

    await expect(respostaComErro(erro)).rejects.toBe(erro);
    expect(localStorage.getItem('token')).toBe('x');
  });
});

test('respostas de sucesso passam direto', () => {
  const resposta = { data: [1, 2] };
  expect(respostaOk(resposta)).toBe(resposta);
});
