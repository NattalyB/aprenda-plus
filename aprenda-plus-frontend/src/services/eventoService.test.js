import api from './api';
import {
  codigoDaSessao,
  esquecerBuscasRegistradas,
  normalizarTermo,
  registrarBusca,
  registrarCursoNoCarrinho,
  registrarCursoVisto,
} from './eventoService';

jest.mock('./api', () => ({ __esModule: true, default: { post: jest.fn() } }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  esquecerBuscasRegistradas();
  api.post.mockResolvedValue({});
});

test('cria um código de sessão anônimo e reaproveita o mesmo', () => {
  const codigo = codigoDaSessao();
  expect(codigo).toMatch(UUID);
  expect(codigoDaSessao()).toBe(codigo);
  expect(localStorage.getItem('sessaoVisitante')).toBe(codigo);
});

test('gera um código válido mesmo sem crypto.randomUUID', () => {
  const original = crypto.randomUUID;
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
  try {
    expect(codigoDaSessao()).toMatch(UUID);
  } finally {
    Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
  }
});

test('sem armazenamento no navegador, usa um código só desta visita', () => {
  const ler = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('bloqueado');
  });
  const codigo = codigoDaSessao();
  expect(codigo).toMatch(UUID);
  expect(codigoDaSessao()).toBe(codigo);
  ler.mockRestore();
});

test('registra a busca uma vez por termo, sem diferenciar acento e maiúscula', async () => {
  await expect(registrarBusca(' Ciência ', 2)).resolves.toBe(true);
  expect(api.post).toHaveBeenCalledWith('/eventos', {
    tipo: 'BUSCA',
    termo: 'Ciência',
    resultados: 2,
    sessao: codigoDaSessao(),
  });

  await expect(registrarBusca('ciencia', 2)).resolves.toBe(false);
  await expect(registrarBusca('a', 0)).resolves.toBe(false);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('registra curso visto e curso no carrinho', async () => {
  await registrarCursoVisto(3);
  await registrarCursoNoCarrinho(3);
  expect(api.post).toHaveBeenNthCalledWith(1, '/eventos', expect.objectContaining({ tipo: 'VISUALIZACAO', idCurso: 3 }));
  expect(api.post).toHaveBeenNthCalledWith(2, '/eventos', expect.objectContaining({ tipo: 'CARRINHO', idCurso: 3 }));
  await expect(registrarCursoVisto(null)).resolves.toBe(false);
  await expect(registrarCursoNoCarrinho(undefined)).resolves.toBe(false);
});

test('falha no servidor não atrapalha o site', async () => {
  api.post.mockRejectedValue(new Error('fora do ar'));
  await expect(registrarCursoVisto(3)).resolves.toBe(false);
});

test('normaliza termos', () => {
  expect(normalizarTermo('  Ciência   de DADOS ')).toBe('ciencia de dados');
  expect(normalizarTermo(null)).toBe('');
});
