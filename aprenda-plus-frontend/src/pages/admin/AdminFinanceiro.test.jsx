import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminFinanceiro from './AdminFinanceiro';
import { renderizar } from '../../testUtils';
import {
  buscarResumoFinanceiro,
  listarParcelas,
  registrarPagamentoDaParcela,
  estornarParcela,
  gerarParcelasQueFaltam,
} from '../../services/financeiroService';
import { baixarArquivo } from '../../utils/financeiro';

jest.mock('../../services/financeiroService');
jest.mock('../../utils/financeiro', () => ({
  ...jest.requireActual('../../utils/financeiro'),
  baixarArquivo: jest.fn(),
}));

const resumo = (dados = {}) => ({
  previstoNoMes: 2000,
  recebidoNoMes: 1500,
  emAtraso: 400,
  parcelasAtrasadas: 1,
  aReceber: 8000,
  inadimplencia: 12.5,
  porMes: [
    { mes: '2026-09', previsto: 1800, recebido: 1800 },
    { mes: '2026-10', previsto: 2000, recebido: 1500 },
  ],
  porCurso: [{ nome: 'Redes', valor: 6000 }],
  porForma: [{ nome: 'Boleto bancário', valor: 6000 }],
  ...dados,
});

const parcela = (id, aluno, status, dados = {}) => ({
  idPagamento: id,
  aluno,
  curso: 'Redes de Computadores',
  turma: 'Turma A',
  numeroParcela: id,
  totalParcelas: 12,
  valor: 400,
  vencimento: '2026-10-19',
  dataPagamento: status === 'pago' ? '2026-10-10' : null,
  formaPagamento: 'Boleto bancário',
  status,
  ...dados,
});

const parcelas = () => [
  parcela(1, 'Lucas Almeida', 'pago'),
  parcela(2, 'Lucas Almeida', 'atrasado'),
  parcela(3, 'Mariana Costa', 'pendente', { formaPagamento: null, turma: null }),
  parcela(4, 'Gabriel Souza', 'cancelado'),
];

const linhas = () => screen.getAllByRole('row').slice(1);
const abrirParcelas = async () => {
  await screen.findByText('Previsto no mês');
  fireEvent.click(screen.getByRole('tab', { name: /Parcelas/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
  buscarResumoFinanceiro.mockResolvedValue(resumo());
  listarParcelas.mockResolvedValue(parcelas());
  window.confirm = jest.fn(() => true);
  window.print = jest.fn();
});

describe('visão geral', () => {
  test('mostra os indicadores e os gráficos', async () => {
    renderizar(<AdminFinanceiro />);

    expect(screen.getByText('Carregando financeiro...')).toBeInTheDocument();
    expect(await screen.findByText('Previsto no mês')).toBeInTheDocument();
    expect(screen.getByText('75% do previsto')).toBeInTheDocument();
    expect(screen.getByText('1 parcela')).toBeInTheDocument();
    expect(screen.getByText('12,5%')).toBeInTheDocument();
    expect(screen.getByText('Em atraso').closest('li')).toHaveClass('financeiro-alerta');
    expect(screen.getByRole('img', { name: 'Receita prevista e recebida por mês' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Receita por curso' })).toHaveTextContent('Redes');
  });

  test('sem nada previsto nem atrasado', async () => {
    buscarResumoFinanceiro.mockResolvedValue(resumo({ previstoNoMes: 0, parcelasAtrasadas: 2 }));
    renderizar(<AdminFinanceiro />);

    expect(await screen.findByText('0% do previsto')).toBeInTheDocument();
    expect(screen.getByText('2 parcelas')).toBeInTheDocument();

    buscarResumoFinanceiro.mockResolvedValue(resumo({ parcelasAtrasadas: 0 }));
  });

  test('sem atraso o cartão não fica em alerta', async () => {
    buscarResumoFinanceiro.mockResolvedValue(resumo({ parcelasAtrasadas: 0 }));
    renderizar(<AdminFinanceiro />);

    expect(await screen.findByText('Em atraso')).toBeInTheDocument();
    expect(screen.getByText('Em atraso').closest('li')).not.toHaveClass('financeiro-alerta');
  });

  test('erro ao carregar', async () => {
    listarParcelas.mockRejectedValue(new Error('offline'));
    renderizar(<AdminFinanceiro />);

    expect(await screen.findByText('Não foi possível carregar o financeiro.')).toBeInTheDocument();
  });
});

describe('parcelas', () => {
  test('lista, filtra por situação e busca por aluno ou curso', async () => {
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    expect(linhas()).toHaveLength(4);
    expect(screen.getByText('4 parcelas · total de R$ 1.600,00', { normalizer: (t) => t.replace(/\s/g, ' ') })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Atrasadas/ }));
    expect(linhas()).toHaveLength(1);
    expect(screen.getByText(/1 parcela ·/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Atrasadas/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Todas/ }));
    fireEvent.change(screen.getByPlaceholderText('Buscar por aluno ou curso...'), { target: { value: 'mariana' } });
    expect(linhas()).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText('Buscar por aluno ou curso...'), { target: { value: 'xyz' } });
    expect(screen.getByText('Nenhuma parcela encontrada com esses filtros.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar planilha/ })).toBeDisabled();
  });

  test('registra o pagamento de uma parcela em aberto', async () => {
    registrarPagamentoDaParcela.mockResolvedValue({});
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    const atrasada = linhas()[1];
    fireEvent.click(within(atrasada).getByRole('button', { name: 'Registrar pagamento' }));
    fireEvent.change(within(atrasada).getByLabelText('Pago em'), { target: { value: '2026-10-11' } });
    fireEvent.change(within(atrasada).getByLabelText('Forma'), { target: { value: 'Pix' } });
    fireEvent.click(within(atrasada).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(registrarPagamentoDaParcela).toHaveBeenCalledWith(2, { dataPagamento: '2026-10-11', formaPagamento: 'Pix' })
    );
    expect(await screen.findByText('Pagamento da parcela 2/12 de Lucas Almeida registrado.')).toBeInTheDocument();
    expect(listarParcelas).toHaveBeenCalledTimes(2);
  });

  test('parcela sem forma de pagamento começa com Pix; cancelar fecha o formulário', async () => {
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    const semForma = linhas()[2];
    fireEvent.click(within(semForma).getByRole('button', { name: 'Registrar pagamento' }));
    expect(within(semForma).getByLabelText('Forma')).toHaveValue('Pix');

    fireEvent.click(within(semForma).getByRole('button', { name: 'Cancelar' }));
    expect(within(semForma).queryByLabelText('Forma')).not.toBeInTheDocument();
  });

  test('erro ao registrar mostra a mensagem do servidor ou a padrão', async () => {
    registrarPagamentoDaParcela.mockRejectedValueOnce({ response: { data: { mensagem: 'A data do pagamento não pode ser no futuro.' } } });
    registrarPagamentoDaParcela.mockRejectedValueOnce(new Error('offline'));
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    fireEvent.click(within(linhas()[1]).getByRole('button', { name: 'Registrar pagamento' }));
    fireEvent.click(within(linhas()[1]).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('A data do pagamento não pode ser no futuro.')).toBeInTheDocument();

    fireEvent.click(within(linhas()[1]).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Não foi possível registrar o pagamento.')).toBeInTheDocument();
  });

  test('desfaz um pagamento depois de confirmar', async () => {
    estornarParcela.mockResolvedValue({});
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    window.confirm = jest.fn(() => false);
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Desfazer' }));
    expect(estornarParcela).not.toHaveBeenCalled();

    window.confirm = jest.fn(() => true);
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(estornarParcela).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Pagamento desfeito. A parcela voltou a ficar em aberto.')).toBeInTheDocument();
  });

  test('erro ao desfazer', async () => {
    estornarParcela.mockRejectedValueOnce(new Error('offline'));
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByText('Não foi possível desfazer o pagamento.')).toBeInTheDocument();
  });

  test('exporta a planilha do que está filtrado e imprime', async () => {
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    fireEvent.click(screen.getByRole('button', { name: /Pagas/ }));
    fireEvent.click(screen.getByRole('button', { name: /Exportar planilha/ }));
    expect(baixarArquivo).toHaveBeenCalledWith(expect.stringMatching(/^parcelas-\d{4}-\d{2}-\d{2}\.csv$/), expect.any(String));
    expect(baixarArquivo.mock.calls[0][1]).toContain('Lucas Almeida');
    expect(baixarArquivo.mock.calls[0][1]).not.toContain('Mariana');

    fireEvent.click(screen.getByRole('button', { name: /Imprimir/ }));
    expect(window.print).toHaveBeenCalled();
  });

  test('sem parcelas ainda, explica como gerar', async () => {
    listarParcelas.mockResolvedValue([]);
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    expect(screen.getByText(/Nenhuma parcela ainda/)).toBeInTheDocument();
  });

  test('parcela sem aluno aparece com traço', async () => {
    listarParcelas.mockResolvedValue([parcela(9, null, 'pendente')]);
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    expect(linhas()[0].cells[0]).toHaveTextContent('-');
    expect(screen.getByText(/1 parcela ·/)).toBeInTheDocument();
  });
});

describe('cobrança automática (Pix e cartão)', () => {
  const comCartao = () => [
    parcela(1, 'Lucas Almeida', 'pago', { formaPagamento: 'Cartão de crédito', cobrancaAutomatica: true, vencimento: '2026-01-10' }),
    parcela(2, 'Lucas Almeida', 'pendente', { formaPagamento: 'Cartão de crédito', cobrancaAutomatica: true, vencimento: '2999-01-10' }),
    parcela(3, 'Mariana Costa', 'pendente'),
    parcela(4, 'Mariana Costa', 'atrasado'),
    parcela(5, 'Gabriel Souza', 'pago', { formaPagamento: 'Cartão de crédito', cobrancaAutomatica: true, vencimento: '2999-02-10' }),
  ];

  test('"A vencer" e "Atrasadas" mostram só boletos; o cartão fica em "Automáticas" sem botão de baixa', async () => {
    listarParcelas.mockResolvedValue(comCartao());
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();

    expect(screen.getByText(/só os boletos precisam de baixa/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /A vencer/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /Automáticas/ })).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: /A vencer/ }));
    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]).toHaveTextContent('Mariana Costa');

    fireEvent.click(screen.getByRole('button', { name: /Automáticas/ }));
    expect(linhas()).toHaveLength(1);
    expect(within(linhas()[0]).getByText('Automática')).toHaveClass('parcela-automatica');
    expect(within(linhas()[0]).getByText('Cai sozinha no vencimento')).toBeInTheDocument();
    expect(within(linhas()[0]).queryByRole('button')).not.toBeInTheDocument();
  });

  test('pagamento no cartão que já caiu não tem "Desfazer"; pago adiantado ainda tem', async () => {
    listarParcelas.mockResolvedValue(comCartao());
    renderizar(<AdminFinanceiro />);
    await abrirParcelas();
    fireEvent.click(screen.getByRole('button', { name: /Pagas/ }));

    const [caiu, adiantado] = linhas();
    expect(within(caiu).queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
    expect(within(adiantado).getByRole('button', { name: 'Desfazer' })).toBeInTheDocument();
  });
});

describe('gerar parcelas que faltam', () => {
  test('avisa quantas matrículas receberam parcelas', async () => {
    gerarParcelasQueFaltam.mockResolvedValueOnce({ matriculas: 3 });
    gerarParcelasQueFaltam.mockResolvedValueOnce({ matriculas: 1 });
    gerarParcelasQueFaltam.mockResolvedValueOnce({ matriculas: 0 });
    renderizar(<AdminFinanceiro />);
    await screen.findByText('Previsto no mês');

    const botao = screen.getByRole('button', { name: 'Gerar parcelas que faltam' });
    fireEvent.click(botao);
    expect(await screen.findByText('Parcelas geradas para 3 matrículas.')).toBeInTheDocument();
    fireEvent.click(botao);
    expect(await screen.findByText('Parcelas geradas para 1 matrícula.')).toBeInTheDocument();
    fireEvent.click(botao);
    expect(await screen.findByText('Todas as matrículas ativas já têm parcelas.')).toBeInTheDocument();
  });

  test('erro ao gerar', async () => {
    gerarParcelasQueFaltam.mockRejectedValue({ response: { data: { mensagem: 'Falhou.' } } });
    renderizar(<AdminFinanceiro />);
    await screen.findByText('Previsto no mês');

    fireEvent.click(screen.getByRole('button', { name: 'Gerar parcelas que faltam' }));
    expect(await screen.findByText('Falhou.')).toBeInTheDocument();
  });

  test('erro ao gerar sem mensagem', async () => {
    gerarParcelasQueFaltam.mockRejectedValue(new Error('offline'));
    renderizar(<AdminFinanceiro />);
    await screen.findByText('Previsto no mês');

    fireEvent.click(screen.getByRole('button', { name: 'Gerar parcelas que faltam' }));
    expect(await screen.findByText('Não foi possível gerar as parcelas.')).toBeInTheDocument();
  });
});
