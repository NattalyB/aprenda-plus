import api from './api';
import {
  criarAtualizacao,
  editarAtualizacao,
  excluirAtualizacao,
  listarAtualizacoes,
  listarManutencoes,
} from './atualizacaoService';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [{ idAtualizacao: 1 }] });
  api.post.mockResolvedValue({ data: { idAtualizacao: 2 } });
  api.put.mockResolvedValue({ data: { idAtualizacao: 2 } });
  api.delete.mockResolvedValue({});
});

test('lista as atualizações e as manutenções de cada perfil', async () => {
  await expect(listarAtualizacoes()).resolves.toEqual([{ idAtualizacao: 1 }]);
  expect(api.get).toHaveBeenLastCalledWith('/atualizacoes');

  await listarManutencoes();
  expect(api.get).toHaveBeenLastCalledWith('/atualizacoes/manutencoes');
  await listarManutencoes('professor');
  expect(api.get).toHaveBeenLastCalledWith('/docente/manutencoes');
});

test('publica, edita e exclui', async () => {
  const dados = { titulo: 'Nova tela', tipo: 'novidade' };
  await expect(criarAtualizacao(dados)).resolves.toEqual({ idAtualizacao: 2 });
  expect(api.post).toHaveBeenCalledWith('/atualizacoes', dados);

  await editarAtualizacao(2, dados);
  expect(api.put).toHaveBeenCalledWith('/atualizacoes/2', dados);

  await excluirAtualizacao(2);
  expect(api.delete).toHaveBeenCalledWith('/atualizacoes/2');
});
