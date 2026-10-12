import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import NotificacoesInscricoes, { INTERVALO_MS } from './NotificacoesInscricoes';
import { renderizar } from '../../testUtils';
import { listarInscricoes } from '../../services/inscricaoService';

jest.mock('../../services/inscricaoService');

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
});

test('no primeiro acesso começa em dia, sem avisar o que já existia', async () => {
  listarInscricoes.mockResolvedValue({ data: [inscricao(1), inscricao(2)] });
  renderizar(<NotificacoesInscricoes />);

  await waitFor(() => expect(localStorage.getItem('inscricoesVistas:1')).toBe('2'));
  expect(botao()).toHaveAccessibleName('Notificações: nenhuma inscrição nova');
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

test('marcar como vistas zera o contador e guarda a última vista', async () => {
  localStorage.setItem('inscricoesVistas:1', '2');
  listarInscricoes.mockResolvedValue({ data: [inscricao(2), inscricao(5)] });
  renderizar(<NotificacoesInscricoes />);
  await waitFor(() => expect(botao()).toHaveAccessibleName('Notificações: 1 inscrição nova'));

  fireEvent.click(botao());
  fireEvent.click(screen.getByRole('button', { name: 'Marcar como vistas' }));

  expect(botao()).toHaveAccessibleName('Notificações: nenhuma inscrição nova');
  expect(localStorage.getItem('inscricoesVistas:1')).toBe('5');
  expect(screen.queryByRole('region', { name: 'Novas inscrições' })).not.toBeInTheDocument();
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
  expect(screen.queryByRole('button', { name: 'Marcar como vistas' })).not.toBeInTheDocument();
  // Clicar de novo fecha
  fireEvent.click(botao());
  expect(screen.queryByText('Nenhuma inscrição nova.')).not.toBeInTheDocument();
});

test('confere de novo a cada minuto e ignora falhas de conexão', async () => {
  jest.useFakeTimers();
  try {
    localStorage.removeItem('idFuncionario');
    localStorage.setItem('inscricoesVistas:admin', '1');
    listarInscricoes.mockRejectedValueOnce(new Error('offline'));
    renderizar(<NotificacoesInscricoes />);
    await act(async () => {});
    expect(botao()).toHaveAccessibleName('Notificações: nenhuma inscrição nova');

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
