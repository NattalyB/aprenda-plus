import api from './api';
import {
  _reiniciarGoogle,
  buscarConfigGoogle,
  cadastrarComGoogle,
  carregarScriptGoogle,
  entrarAlunoComGoogle,
  entrarProfessorComGoogle,
} from './googleService';

jest.mock('./api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  _reiniciarGoogle();
  delete window.google;
  document.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());
});

test('busca a configuração uma vez só e tenta de novo se falhar', async () => {
  api.get.mockRejectedValueOnce(new Error('offline'));
  await expect(buscarConfigGoogle()).resolves.toEqual({ ativo: false });

  api.get.mockResolvedValue({ data: { ativo: true, idCliente: 'abc' } });
  await expect(buscarConfigGoogle()).resolves.toEqual({ ativo: true, idCliente: 'abc' });
  await buscarConfigGoogle();
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(api.get).toHaveBeenCalledWith('/auth/google/config');
});

test('entra como aluno ou professor com a credencial do Google', async () => {
  api.post.mockResolvedValue({ data: { token: 't' } });
  await expect(entrarAlunoComGoogle('cred')).resolves.toEqual({ token: 't' });
  expect(api.post).toHaveBeenLastCalledWith('/auth/google/aluno', { credencial: 'cred' });
  await entrarProfessorComGoogle('cred');
  expect(api.post).toHaveBeenLastCalledWith('/auth/google/professor', { credencial: 'cred' });
});

test('completa o cadastro com o passe, os dados e o certificado', async () => {
  api.post.mockResolvedValue({ data: { token: 't', idAluno: 9 } });
  const arquivo = new File(['%PDF'], 'c.pdf', { type: 'application/pdf' });
  await expect(cadastrarComGoogle('passe', { nomeCompleto: 'Ana' }, arquivo)).resolves.toEqual({ token: 't', idAluno: 9 });

  const [url, formulario, opcoes] = api.post.mock.calls[0];
  expect(url).toBe('/auth/google/cadastro');
  expect(formulario.get('tokenCadastro')).toBe('passe');
  expect(formulario.get('documento')).toBe(arquivo);
  expect(opcoes.headers['Content-Type']).toBe('multipart/form-data');

  await cadastrarComGoogle('passe', { nomeCompleto: 'Ana' }, null);
  expect(api.post.mock.calls[1][1].get('documento')).toBeNull();
});

test('carrega a biblioteca do Google uma vez e avisa se falhar', async () => {
  const primeira = carregarScriptGoogle();
  expect(carregarScriptGoogle()).toBe(primeira);
  const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
  window.google = { accounts: { id: {} } };
  script.onload();
  await expect(primeira).resolves.toBe(window.google);
  // Já carregada: nem cria outro script
  await expect(carregarScriptGoogle()).resolves.toBe(window.google);

  delete window.google;
  _reiniciarGoogle();
  const falha = carregarScriptGoogle();
  document.querySelectorAll('script[src*="accounts.google.com"]')[1].onerror();
  await expect(falha).rejects.toThrow('Não foi possível carregar o Google.');
});
