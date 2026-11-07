import api from './api';
import {
  abrirChamado,
  atualizarChamado,
  baixarAnexoDoChamado,
  baixarAnexoDoMeuChamado,
  baseDoSolicitante,
  buscarChamado,
  buscarMeuChamado,
  escreverNoChamado,
  fecharChamado,
  listarChamados,
  listarMeusChamados,
  responderChamado,
} from './chamadoService';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const campos = (dados) => Object.fromEntries(dados.entries());

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [{ idChamado: 1 }] });
  api.post.mockResolvedValue({ data: { idChamado: 2 } });
  api.put.mockResolvedValue({ data: { idChamado: 2 } });
});

test('quem abriu: funcionário usa /meus-chamados e professor /docente/chamados', async () => {
  expect(baseDoSolicitante('funcionario')).toBe('/meus-chamados');
  expect(baseDoSolicitante('professor')).toBe('/docente/chamados');

  await expect(listarMeusChamados('professor')).resolves.toEqual([{ idChamado: 1 }]);
  expect(api.get).toHaveBeenCalledWith('/docente/chamados');
  await buscarMeuChamado('funcionario', 3);
  expect(api.get).toHaveBeenCalledWith('/meus-chamados/3');

  const print = new File(['x'], 'print.png', { type: 'image/png' });
  await expect(abrirChamado('funcionario', { assunto: 'A', categoria: 'erro', prioridade: 'alta', descricao: 'D', tela: '' }, print))
    .resolves.toEqual({ idChamado: 2 });
  const [url, dados, config] = api.post.mock.calls[0];
  expect(url).toBe('/meus-chamados');
  expect(campos(dados)).toMatchObject({ assunto: 'A', categoria: 'erro', prioridade: 'alta', descricao: 'D' });
  expect(dados.has('tela')).toBe(false);          // campo vazio não vai
  expect(dados.get('anexo')).toBe(print);
  expect(config.headers['Content-Type']).toBe('multipart/form-data');

  await escreverNoChamado('professor', 3, 'Oi', null);
  expect(api.post.mock.calls[1][0]).toBe('/docente/chamados/3/mensagens');
  expect(api.post.mock.calls[1][1].has('anexo')).toBe(false);

  await fecharChamado('funcionario', 3);
  expect(api.put).toHaveBeenCalledWith('/meus-chamados/3/fechar');
  await baixarAnexoDoMeuChamado('professor', 3, 9);
  expect(api.get).toHaveBeenCalledWith('/docente/chamados/3/mensagens/9/anexo', { responseType: 'blob' });
});

test('suporte: lista, abre, responde, atualiza e baixa anexo', async () => {
  await listarChamados();
  expect(api.get).toHaveBeenCalledWith('/chamados');
  await buscarChamado(4);
  expect(api.get).toHaveBeenCalledWith('/chamados/4');

  await responderChamado(4, 'Feito', null, 'resolvido');
  const [url, dados] = api.post.mock.calls[0];
  expect(url).toBe('/chamados/4/mensagens');
  expect(campos(dados)).toEqual({ texto: 'Feito', status: 'resolvido' });

  await responderChamado(4, 'Só a resposta');
  expect(api.post.mock.calls[1][1].has('status')).toBe(false);

  await atualizarChamado(4, { prioridade: 'alta' });
  expect(api.put).toHaveBeenCalledWith('/chamados/4', { prioridade: 'alta' });
  await baixarAnexoDoChamado(4, 2);
  expect(api.get).toHaveBeenCalledWith('/chamados/4/mensagens/2/anexo', { responseType: 'blob' });
});
