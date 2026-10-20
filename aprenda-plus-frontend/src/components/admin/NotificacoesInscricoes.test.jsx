import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import NotificacoesInscricoes, { INTERVALO_MS } from './NotificacoesInscricoes';
import { renderizar } from '../../testUtils';
import { listarInscricoes } from '../../services/inscricaoService';
import { buscarAlertasFinanceiros } from '../../services/financeiroService';
import { situacaoDosDocumentos } from '../../services/documentoService';

jest.mock('../../services/inscricaoService');
jest.mock('../../services/financeiroService');
jest.mock('../../services/documentoService', () => ({
  ...jest.requireActual('../../services/documentoService'),
  situacaoDosDocumentos: jest.fn(),
}));

const inscricao = (id, nome = `Aluno ${id}`) => ({
  idInscricao: id,
  aluno: { nomeCompleto: nome },
  turma: { nome: 'Turma A - Noite' },
  formaPagamento: 'Pix à vista (5% de desconto)',
  valorTotal: 9500,
});

const botao = () => screen.getByRole('button', { name: /Notificações/ });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('idFuncionario', '1');
  situacaoDosDocumentos.mockResolvedValue({ data: {} });
});

test('no primeiro acesso começa em dia, sem avisar o que já existia', async () => {
  listarInscricoes.mockResolvedValue({ data: [inscricao(1), inscricao(2)] });
  renderizar(<NotificacoesInscricoes />);

  await waitFor(() => expect(localStorage.getItem('inscricoesVistas:1')).toBe('2'));
  expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');
});

test('mostra quantas inscrições chegaram desde a última visita e lista as mais novas', async () => {
  localStorage.setItem('inscricoesVistas:1', '2');
  listarInscricoes.mockResolvedValue({
    data: [inscricao(1), inscricao(2), inscricao(3, 'Maria Silva'), { idInscricao: 4 }],
  });
  renderizar(<NotificacoesInscricoes />);

  await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 2 inscrições novas'));
  expect(screen.getByText('2')).toBeInTheDocument();

  fireEvent.click(botao());

  const itens = screen.getAllByRole('listitem');
  expect(itens).toHaveLength(2);
  // A mais nova primeiro; dados que faltam aparecem de forma neutra
  expect(itens[0]).toHaveTextContent('Aluno');
  expect(itens[0]).toHaveTextContent('Turma a definir');
  expect(itens[1]).toHaveTextContent('Maria Silva');
  expect(itens[1]).toHaveTextContent('Pix à vista (5% de desconto) · R$');
});

test('uma inscrição nova usa o singular', async () => {
  localStorage.setItem('inscricoesVistas:1', '2');
  listarInscricoes.mockResolvedValue({ data: [inscricao(3)] });
  renderizar(<NotificacoesInscricoes />);

  await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova'));
});

test('mais de 9 novas mostra 9+ e avisa quantas ficaram fora da lista', async () => {
  localStorage.setItem('inscricoesVistas:1', '0');
  listarInscricoes.mockResolvedValue({ data: Array.from({ length: 12 }, (_, i) => inscricao(i + 1)) });
  renderizar(<NotificacoesInscricoes />);

  expect(await screen.findByText('9+')).toBeInTheDocument();
  fireEvent.click(botao());
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByText('e mais 7...')).toBeInTheDocument();
});

test('"Marcar todas como lidas" zera o contador e guarda a última vista', async () => {
  localStorage.setItem('inscricoesVistas:1', '2');
  listarInscricoes.mockResolvedValue({ data: [inscricao(2), inscricao(5)] });
  renderizar(<NotificacoesInscricoes />);
  await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova'));

  fireEvent.click(botao());
  expect(screen.getByText('1 nova')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '✓ Marcar todas como lidas' }));

  expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');
  expect(localStorage.getItem('inscricoesVistas:1')).toBe('5');
  // O painel continua aberto, agora "em dia"
  expect(screen.getByText('✓ Tudo lido')).toBeInTheDocument();
  expect(screen.queryByText('1 nova')).not.toBeInTheDocument();
});

test('"Ver inscrições" marca como vistas e abre a lista de inscrições', async () => {
  localStorage.setItem('inscricoesVistas:1', '0');
  listarInscricoes.mockResolvedValue({ data: [inscricao(1)] });
  renderizar(<NotificacoesInscricoes />, { rota: '/admin/cursos' });
  await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova'));

  fireEvent.click(botao());
  fireEvent.click(screen.getByRole('button', { name: 'Ver inscrições' }));

  expect(screen.getByTestId('endereco')).toHaveTextContent('/admin/inscricoes');
  expect(localStorage.getItem('inscricoesVistas:1')).toBe('1');
});

test('sem novidades, o painel diz que não há inscrição nova', async () => {
  localStorage.setItem('inscricoesVistas:1', '9');
  listarInscricoes.mockResolvedValue({ data: [] });
  renderizar(<NotificacoesInscricoes />);
  await waitFor(() => expect(listarInscricoes).toHaveBeenCalled());

  fireEvent.click(botao());

  expect(screen.getByText('Nenhuma inscrição nova.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Marcar todas/ })).not.toBeInTheDocument();
  // Clicar de novo fecha
  fireEvent.click(botao());
  expect(screen.queryByText('Nenhuma inscrição nova.')).not.toBeInTheDocument();
});

test('fecha com Esc ou clicando fora do painel', async () => {
  localStorage.setItem('inscricoesVistas:1', '9');
  listarInscricoes.mockResolvedValue({ data: [] });
  renderizar(<NotificacoesInscricoes />);
  await waitFor(() => expect(listarInscricoes).toHaveBeenCalled());

  fireEvent.click(botao());
  // Clicar dentro do painel não fecha
  fireEvent.mouseDown(screen.getByText('Notificações', { selector: 'strong' }));
  expect(screen.getByRole('region', { name: 'Notificações do painel' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Notificações do painel' })).not.toBeInTheDocument();

  fireEvent.click(botao());
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(screen.getByRole('region', { name: 'Notificações do painel' })).toBeInTheDocument();
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole('region', { name: 'Notificações do painel' })).not.toBeInTheDocument();
});

test('confere de novo a cada minuto e ignora falhas de conexão', async () => {
  jest.useFakeTimers();
  try {
    localStorage.removeItem('idFuncionario');
    localStorage.setItem('inscricoesVistas:admin', '1');
    listarInscricoes.mockRejectedValueOnce(new Error('offline'));
    renderizar(<NotificacoesInscricoes />);
    await act(async () => {});
    expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');

    listarInscricoes.mockResolvedValue({ data: [inscricao(1), inscricao(2)] });
    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_MS);
    });

    expect(listarInscricoes).toHaveBeenCalledTimes(2);
    expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova');
  } finally {
    jest.useRealTimers();
  }
});

test('resposta sem dados não quebra', async () => {
  listarInscricoes.mockResolvedValue({});
  renderizar(<NotificacoesInscricoes />);

  await waitFor(() => expect(localStorage.getItem('inscricoesVistas:1')).toBe('0'));
});

const alertas = (vencendo = [], atrasadas = []) => ({
  vencendoEmBreve: vencendo.length,
  atrasadas: atrasadas.length,
  idsVencendo: vencendo,
  idsAtrasadas: atrasadas,
});

describe('avisos do financeiro (só boletos)', () => {
  test('mostra boletos em atraso e vencendo, e "Ver financeiro" marca como lido', async () => {
    localStorage.setItem('inscricoesVistas:1', '5');
    listarInscricoes.mockResolvedValue({ data: [inscricao(6)] });
    buscarAlertasFinanceiros.mockResolvedValue(alertas([10, 11, 12], [20, 21]));
    renderizar(<NotificacoesInscricoes financeiro />, { rota: '/admin' });

    await waitFor(() =>
      expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova e 5 avisos financeiros')
    );
    expect(screen.getByText('6')).toBeInTheDocument();

    fireEvent.click(botao());
    expect(screen.getByText(/2 boletos em atraso/)).toBeInTheDocument();
    expect(screen.getByText(/3 boletos vencem nos próximos 7 dias/)).toBeInTheDocument();
    expect(screen.getByText('5 novas')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver financeiro' }));
    expect(screen.getByTestId('endereco')).toHaveTextContent('/admin/financeiro');
    expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova');
    expect(JSON.parse(localStorage.getItem('notificacoesLidas:1')).financeiro).toEqual(['v10', 'v11', 'v12', 'a20', 'a21']);
  });

  test('o que já foi lido não conta; boleto que passa a atrasar volta a avisar', async () => {
    jest.useFakeTimers();
    try {
      localStorage.setItem('notificacoesLidas:1', JSON.stringify({ documentos: [], financeiro: ['v10', 'a20'] }));
      buscarAlertasFinanceiros.mockResolvedValueOnce(alertas([10], [20]));
      renderizar(<NotificacoesInscricoes inscricoes={false} financeiro />);
      await act(async () => {});
      expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');

      // O boleto 10 venceu e não foi pago: agora é aviso de atraso, que ainda não foi lido
      buscarAlertasFinanceiros.mockResolvedValueOnce(alertas([], [10, 20]));
      await act(async () => {
        jest.advanceTimersByTime(INTERVALO_MS);
      });
      expect(botao()).toHaveAccessibleName('Notificações: 1 aviso financeiro');
    } finally {
      jest.useRealTimers();
    }
  });

  test('só financeiro, no singular e sem a parte de inscrições', async () => {
    buscarAlertasFinanceiros.mockResolvedValue(alertas([3]));
    renderizar(<NotificacoesInscricoes inscricoes={false} financeiro />);

    await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 aviso financeiro'));
    expect(listarInscricoes).not.toHaveBeenCalled();

    fireEvent.click(botao());
    expect(screen.getByText(/1 boleto vence nos próximos 7 dias/)).toBeInTheDocument();
    expect(screen.queryByText('Novas inscrições')).not.toBeInTheDocument();
  });

  test('um boleto em atraso no singular', async () => {
    buscarAlertasFinanceiros.mockResolvedValue(alertas([], [4]));
    renderizar(<NotificacoesInscricoes inscricoes={false} financeiro />);

    await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 aviso financeiro'));
    fireEvent.click(botao());
    expect(screen.getByText(/1 boleto em atraso/)).toBeInTheDocument();
  });

  test('nada no financeiro, resposta vazia ou falha de conexão', async () => {
    buscarAlertasFinanceiros.mockResolvedValueOnce(null);
    buscarAlertasFinanceiros.mockRejectedValueOnce(new Error('offline'));
    const { unmount } = renderizar(<NotificacoesInscricoes inscricoes={false} financeiro />);

    await waitFor(() => expect(buscarAlertasFinanceiros).toHaveBeenCalled());
    expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');
    fireEvent.click(botao());
    expect(screen.getByText('Nenhum boleto vencendo nem em atraso.')).toBeInTheDocument();
    unmount();

    renderizar(<NotificacoesInscricoes inscricoes={false} financeiro />);
    await waitFor(() => expect(buscarAlertasFinanceiros).toHaveBeenCalledTimes(2));
    expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');
  });

  test('marcação de lidas quebrada no navegador começa do zero', async () => {
    localStorage.setItem('notificacoesLidas:1', '{quebrado');
    buscarAlertasFinanceiros.mockResolvedValue(alertas([1]));
    renderizar(<NotificacoesInscricoes inscricoes={false} financeiro />);
    await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 aviso financeiro'));
  });
});

describe('documentos para analisar (só quem cuida de alunos)', () => {
  test('conta os certificados em análise e "Analisar documentos" marca como lido', async () => {
    listarInscricoes.mockResolvedValue({ data: [] });
    situacaoDosDocumentos.mockResolvedValue({ data: { 7: 'pendente', 8: 'aprovado', 9: 'pendente' } });
    renderizar(<NotificacoesInscricoes documentos />, { rota: '/admin' });

    await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 2 documentos para analisar'));
    fireEvent.click(botao());
    expect(screen.getByText(/2 certificados de conclusão aguardam análise/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Analisar documentos' }));
    expect(screen.getByTestId('endereco')).toHaveTextContent('/admin/inscricoes');
    expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');

    // Continua aparecendo no painel (ainda precisa ser analisado), mas sem contar como novo
    fireEvent.click(botao());
    expect(screen.getByText(/2 certificados de conclusão aguardam análise/)).toBeInTheDocument();
    expect(screen.queryByText('2 novas')).not.toBeInTheDocument();
  });

  test('marcar todas como lidas vale para documentos e financeiro juntos', async () => {
    listarInscricoes.mockResolvedValue({ data: [] });
    situacaoDosDocumentos.mockResolvedValue({ data: { 7: 'pendente' } });
    buscarAlertasFinanceiros.mockResolvedValue(alertas([3]));
    renderizar(<NotificacoesInscricoes documentos financeiro />);
    await waitFor(() =>
      expect(botao()).toHaveAccessibleName('Notificações: 1 documento para analisar e 1 aviso financeiro')
    );

    fireEvent.click(botao());
    fireEvent.click(screen.getByRole('button', { name: '✓ Marcar todas como lidas' }));

    expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');
    expect(JSON.parse(localStorage.getItem('notificacoesLidas:1'))).toEqual({ documentos: ['7'], financeiro: ['v3'] });
  });

  test('um documento no singular; falha ou resposta vazia não mostra nada', async () => {
    listarInscricoes.mockResolvedValue({ data: [] });
    situacaoDosDocumentos.mockResolvedValueOnce({ data: { 7: 'pendente' } });
    const { unmount } = renderizar(<NotificacoesInscricoes documentos />);
    await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 documento para analisar'));
    fireEvent.click(botao());
    expect(screen.getByText(/1 certificado de conclusão aguarda análise/)).toBeInTheDocument();
    unmount();

    situacaoDosDocumentos.mockResolvedValueOnce(undefined);
    const segundo = renderizar(<NotificacoesInscricoes documentos />);
    await waitFor(() => expect(situacaoDosDocumentos).toHaveBeenCalledTimes(2));
    expect(botao()).toHaveAccessibleName('Notificações: nenhuma não lida');
    segundo.unmount();

    situacaoDosDocumentos.mockRejectedValueOnce(new Error('rede'));
    renderizar(<NotificacoesInscricoes documentos />);
    await waitFor(() => expect(situacaoDosDocumentos).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('Documentos')).not.toBeInTheDocument();
  });

  test('o financeiro não vê documentos', async () => {
    buscarAlertasFinanceiros.mockResolvedValue(alertas());
    renderizar(<NotificacoesInscricoes inscricoes financeiro />);
    await waitFor(() => expect(buscarAlertasFinanceiros).toHaveBeenCalled());
    expect(situacaoDosDocumentos).not.toHaveBeenCalled();
  });
});
