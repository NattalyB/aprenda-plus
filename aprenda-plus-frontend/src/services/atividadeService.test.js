import api from './api';
import { buscarAtividades, ultimaAlteracao } from './atividadeService';

jest.mock('./api', () => ({ __esModule: true, default: { get: jest.fn() } }));

test('busca só com os filtros preenchidos', async () => {
  api.get.mockResolvedValue({ data: { itens: [], total: 0 } });

  await expect(buscarAtividades({ modulo: 'Alunos', busca: '', acao: null, tipo: undefined, pagina: 2 })).resolves.toEqual({
    itens: [],
    total: 0,
  });
  expect(api.get).toHaveBeenCalledWith('/atividades', { params: { modulo: 'Alunos', pagina: 2 } });

  await buscarAtividades();
  expect(api.get).toHaveBeenLastCalledWith('/atividades', { params: {} });
});

test('última alteração de um registro', async () => {
  api.get.mockResolvedValue({ data: { criadoPor: 'Ana' } });
  await expect(ultimaAlteracao('alunos', 12)).resolves.toEqual({ criadoPor: 'Ana' });
  expect(api.get).toHaveBeenLastCalledWith('/atividades/ultima', { params: { alvo: 'alunos', id: 12 } });
});
