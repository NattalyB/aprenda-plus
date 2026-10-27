import api from './api';
import {
  conferirPdf,
  listarTreinamentos,
  criarTreinamento,
  atualizarTreinamento,
  excluirTreinamento,
  baixarPdfDoTreinamento,
  TAMANHO_MAXIMO_PDF,
} from './treinamentoService';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const campos = (dados) => Object.fromEntries(dados.entries());

test('confere o PDF antes de enviar', () => {
  expect(conferirPdf(null)).toBeNull();
  expect(conferirPdf({ name: 'manual.PDF', size: 100 })).toBeNull();
  expect(conferirPdf({ name: 'foto.png', size: 100 })).toBe('O arquivo precisa ser um PDF.');
  expect(conferirPdf({ name: 'grande.pdf', size: TAMANHO_MAXIMO_PDF + 1 })).toBe('O PDF pode ter no máximo 5 MB.');
  expect(conferirPdf({ size: 1 })).toBe('O arquivo precisa ser um PDF.');
});

test('lista, cria, edita, exclui e baixa', async () => {
  api.get.mockResolvedValue({ data: [{ idTreinamento: 1 }] });
  api.post.mockResolvedValue({ data: { idTreinamento: 2 } });
  api.put.mockResolvedValue({ data: { idTreinamento: 2 } });

  await expect(listarTreinamentos()).resolves.toEqual([{ idTreinamento: 1 }]);
  expect(api.get).toHaveBeenCalledWith('/treinamentos');

  const pdf = new File(['%PDF'], 'manual.pdf', { type: 'application/pdf' });
  await expect(criarTreinamento({ titulo: 'T', videoUrl: 'v', ordem: 2 }, pdf)).resolves.toEqual({ idTreinamento: 2 });
  const [url, dados, config] = api.post.mock.calls[0];
  expect(url).toBe('/treinamentos');
  expect(campos(dados)).toMatchObject({ titulo: 'T', descricao: '', videoUrl: 'v', ordem: '2' });
  expect(dados.get('pdf')).toBe(pdf);
  expect(dados.get('removerPdf')).toBeNull();
  expect(config.headers['Content-Type']).toBe('multipart/form-data');

  await atualizarTreinamento(2, { titulo: 'Novo', ordem: '' }, null, true);
  const [urlPut, dadosPut] = api.put.mock.calls[0];
  expect(urlPut).toBe('/treinamentos/2');
  expect(dadosPut.get('removerPdf')).toBe('true');
  expect(dadosPut.get('ordem')).toBeNull();
  expect(dadosPut.get('pdf')).toBeNull();

  await atualizarTreinamento(2, {}, null);
  expect(api.put.mock.calls[1][1].get('titulo')).toBe('');

  excluirTreinamento(2);
  expect(api.delete).toHaveBeenCalledWith('/treinamentos/2');
  baixarPdfDoTreinamento(2);
  expect(api.get).toHaveBeenLastCalledWith('/treinamentos/2/pdf', { responseType: 'blob' });
});
