import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminHistorico from './AdminHistorico';
import { buscarAtividades } from '../../services/atividadeService';

jest.mock('../../services/atividadeService');

const registro = (id, dados = {}) => ({
  idRegistro: id,
  quando: '2026-10-27T18:45:00',
  usuarioTipo: 'funcionario',
  usuarioNome: 'Carla Nascimento',
  modulo: 'Alunos',
  acao: 'alterou',
  descricao: `Alterou aluno #${id}`,
  ...dados,
});

const pagina = (itens, extra = {}) => ({ itens, total: itens.length, pagina: 1, tamanho: 20, totalPaginas: 1, ...extra });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

test('lista quem fez o quê e quando', async () => {
  buscarAtividades.mockResolvedValue(
    pagina([
      registro(1),
      registro(2, { usuarioTipo: 'aluno', usuarioNome: 'Maria', acao: 'cadastrou', modulo: 'Inscrições', descricao: 'Fez inscrição em curso pelo site' }),
      registro(3, { usuarioTipo: 'visitante', usuarioNome: 'Visitante do site', acao: 'outra', descricao: 'Algo' }),
      registro(4, { usuarioTipo: 'robo', acao: 'importou', descricao: 'Importou planilha de alunos' }),
    ])
  );
  render(<AdminHistorico />);

  expect(screen.getByText('Carregando histórico...')).toBeInTheDocument();
  expect(await screen.findByText('Alterou aluno #1')).toBeInTheDocument();
  expect(screen.getAllByText('27/10/2026 às 18:45')).toHaveLength(4);
  expect(screen.getByText('Maria')).toBeInTheDocument();
  expect(screen.getByText('Aluno', { selector: 'span' })).toHaveClass('hist-tipo-aluno');
  expect(screen.getByText('Visitante', { selector: 'span' })).toBeInTheDocument();
  expect(screen.getByText('robo')).toBeInTheDocument();
  expect(screen.getByText('Cadastrou', { selector: 'span' })).toHaveClass('hist-acao-cadastrou');
  expect(screen.getAllByText('Alterou', { selector: 'span' })).toHaveLength(2);
  expect(screen.getByText('Importou', { selector: 'span' })).toHaveClass('hist-acao-importou');
  expect(buscarAtividades).toHaveBeenCalledWith({
    busca: '', modulo: '', acao: '', tipo: '', de: '', ate: '', pagina: 1, tamanho: 20,
  });
});

test('filtros, busca com espera e limpar', async () => {
  buscarAtividades.mockResolvedValue(pagina([registro(1)]));
  render(<AdminHistorico />);
  await screen.findByText('Alterou aluno #1');
  expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Alunos' } });
  fireEvent.change(screen.getByLabelText('Ação'), { target: { value: 'excluiu' } });
  fireEvent.change(screen.getByLabelText('Quem fez'), { target: { value: 'aluno' } });
  fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-27' } });
  await waitFor(() =>
    expect(buscarAtividades).toHaveBeenLastCalledWith(
      expect.objectContaining({ modulo: 'Alunos', acao: 'excluiu', tipo: 'aluno', de: '2026-10-01', ate: '2026-10-27' })
    )
  );

  jest.useFakeTimers();
  fireEvent.change(screen.getByLabelText('Buscar no histórico'), { target: { value: ' carla ' } });
  expect(buscarAtividades).not.toHaveBeenLastCalledWith(expect.objectContaining({ busca: 'carla' }));
  await act(async () => {
    jest.advanceTimersByTime(450);
  });
  jest.useRealTimers();
  await waitFor(() => expect(buscarAtividades).toHaveBeenLastCalledWith(expect.objectContaining({ busca: 'carla' })));

  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
  await waitFor(() =>
    expect(buscarAtividades).toHaveBeenLastCalledWith(
      expect.objectContaining({ busca: '', modulo: '', acao: '', tipo: '', de: '', ate: '' })
    )
  );
  expect(screen.getByLabelText('Módulo')).toHaveValue('');
});

test('vazio, vazio com filtro e erro', async () => {
  buscarAtividades.mockResolvedValueOnce(pagina([]));
  render(<AdminHistorico />);
  expect(await screen.findByText('Nenhuma alteração registrada ainda.')).toBeInTheDocument();

  buscarAtividades.mockResolvedValueOnce({});
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Cursos' } });
  expect(await screen.findByText('Nenhuma alteração encontrada com esses filtros.')).toBeInTheDocument();

  buscarAtividades.mockRejectedValueOnce({ response: { data: { erro: 'Seu nível de acesso não permite usar este módulo.' } } });
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Turmas' } });
  expect(await screen.findByText('Seu nível de acesso não permite usar este módulo.')).toBeInTheDocument();

  buscarAtividades.mockRejectedValueOnce({ response: { data: { mensagem: 'Data inválida.' } } });
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Alunos' } });
  expect(await screen.findByText('Data inválida.')).toBeInTheDocument();

  buscarAtividades.mockRejectedValueOnce(new Error('rede'));
  fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Financeiro' } });
  expect(await screen.findByText('Não foi possível carregar o histórico.')).toBeInTheDocument();
});

test('páginas e quantidade por página', async () => {
  const muitos = Array.from({ length: 20 }, (_, i) => registro(i + 1));
  buscarAtividades.mockImplementation(({ pagina: p, tamanho }) =>
    Promise.resolve(pagina(muitos, { total: 65, pagina: p, tamanho, totalPaginas: Math.ceil(65 / tamanho) }))
  );
  render(<AdminHistorico />);
  await screen.findByText('Alterou aluno #1');
  expect(screen.getByText('1–20')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
  await waitFor(() => expect(buscarAtividades).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })));
  expect(await screen.findByText('21–40')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
  await waitFor(() => expect(buscarAtividades).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 3 })));

  fireEvent.change(screen.getByRole('combobox', { name: 'Por página' }), { target: { value: '50' } });
  await waitFor(() =>
    expect(buscarAtividades).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, tamanho: 50 }))
  );
});

test('desmontar antes da resposta não atualiza a tela', async () => {
  let responder;
  buscarAtividades.mockReturnValueOnce(new Promise((r) => (responder = r)));
  const { unmount } = render(<AdminHistorico />);
  unmount();
  await act(async () => responder(pagina([registro(1)])));
  expect(buscarAtividades).toHaveBeenCalledTimes(1);
});

test('erro depois de desmontar também é ignorado', async () => {
  let falhar;
  buscarAtividades.mockReturnValueOnce(new Promise((_, f) => (falhar = f)));
  const { unmount } = render(<AdminHistorico />);
  unmount();
  await act(async () => falhar(new Error('x')));
  expect(buscarAtividades).toHaveBeenCalledTimes(1);
});
