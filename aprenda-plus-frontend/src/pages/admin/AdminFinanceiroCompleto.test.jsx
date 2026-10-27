// Financeiro completo: multa/juros/desconto na baixa, contas a pagar, fluxo de caixa,
// pagamento dos professores e regras de cobrança.
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminFinanceiro from './AdminFinanceiro';
import { renderizar } from '../../testUtils';
import ContasAPagar from '../../components/admin/financeiro/ContasAPagar';
import FluxoDeCaixa from '../../components/admin/financeiro/FluxoDeCaixa';
import PagamentoProfessores, { mesPorExtenso } from '../../components/admin/financeiro/PagamentoProfessores';
import RegrasDeCobranca from '../../components/admin/financeiro/RegrasDeCobranca';
import PagamentosDaInscricao from '../../components/PagamentosDaInscricao';
import * as servico from '../../services/financeiroService';
import { hojeISO } from '../../utils/financeiro';

jest.mock('../../services/financeiroService');

const parcela = (id, status, dados = {}) => ({
  idPagamento: id,
  aluno: 'Lucas Almeida',
  curso: 'Redes',
  turma: 'Turma A',
  numeroParcela: id,
  totalParcelas: 12,
  valor: 400,
  valorAtualizado: 400,
  vencimento: '2026-10-01',
  dataPagamento: status === 'pago' ? '2026-10-10' : null,
  formaPagamento: 'Boleto bancário',
  status,
  ...dados,
});

const resumo = {
  previstoNoMes: 0, recebidoNoMes: 0, emAtraso: 0, parcelasAtrasadas: 0, aReceber: 0, inadimplencia: 0,
  porMes: [], porCurso: [], porForma: [],
};

const conta = (id, situacao, dados = {}) => ({
  idConta: id,
  descricao: `Conta ${id}`,
  categoria: 'Aluguel',
  fornecedor: null,
  valor: 1000,
  dataVencimento: '2026-10-10',
  dataPagamento: situacao === 'pago' ? '2026-10-10' : null,
  formaPagamento: situacao === 'pago' ? 'Pix' : null,
  status: situacao === 'atrasado' ? 'pendente' : situacao,
  situacao,
  ...dados,
});

const linhas = () => screen.getAllByRole('row').slice(1);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  window.confirm = jest.fn(() => true);
  servico.buscarResumoFinanceiro.mockResolvedValue(resumo);
  servico.listarParcelas.mockResolvedValue([]);
  servico.listarCategoriasDeContas.mockResolvedValue(['Aluguel', 'Energia', 'Professores']);
});

// ===================================================================
describe('baixa com multa, juros e desconto', () => {
  const abrirParcelas = async () => {
    renderizar(<AdminFinanceiro />);
    await screen.findByText('Previsto no mês');
    fireEvent.click(screen.getByRole('tab', { name: /Parcelas/ }));
  };

  test('mostra quanto custa hoje e quanto foi pago', async () => {
    servico.listarParcelas.mockResolvedValue([
      parcela(1, 'atrasado', { valorAtualizado: 412.5 }),
      parcela(2, 'pago', { valorAtualizado: 390, valorPago: 390 }),
      parcela(3, 'pendente', { valorAtualizado: 380 }),
      parcela(4, 'cancelado', { valorAtualizado: 999 }),
    ]);
    await abrirParcelas();

    expect(within(linhas()[0]).getByText('hoje R$ 412,50')).toHaveClass('financeiro-encargo');
    expect(within(linhas()[1]).getByText('pago R$ 390,00')).toBeInTheDocument();
    expect(within(linhas()[2]).getByText('hoje R$ 380,00')).not.toHaveClass('financeiro-encargo');
    expect(within(linhas()[3]).queryByText(/R\$ 999/)).not.toBeInTheDocument();
  });

  test('prévia do total e envio com isenção e desconto', async () => {
    servico.listarParcelas.mockResolvedValue([parcela(2, 'atrasado')]);
    servico.calcularParcela.mockResolvedValue({ total: 405, multa: 8, juros: 2, desconto: 5, diasAtraso: 9 });
    servico.registrarPagamentoDaParcela.mockResolvedValue({});
    await abrirParcelas();

    const linha = linhas()[0];
    fireEvent.click(within(linha).getByRole('button', { name: 'Registrar pagamento' }));
    expect(await within(linha).findByText('R$ 405,00')).toBeInTheDocument();
    expect(within(linha).getByText('9 dias de atraso')).toBeInTheDocument();
    expect(within(linha).getByText('multa R$ 8,00 · juros R$ 2,00 · desconto R$ 5,00')).toBeInTheDocument();

    fireEvent.click(within(linha).getByLabelText('Isentar multa e juros'));
    fireEvent.change(within(linha).getByLabelText('Desconto (R$)'), { target: { value: ' 5,00 ' } });
    await waitFor(() =>
      expect(servico.calcularParcela).toHaveBeenLastCalledWith(2, { data: hojeISO(), isentarEncargos: true, desconto: ' 5,00 ' })
    );
    fireEvent.click(within(linha).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(servico.registrarPagamentoDaParcela).toHaveBeenCalledWith(2, {
        dataPagamento: hojeISO(),
        formaPagamento: 'Boleto bancário',
        isentarEncargos: true,
        desconto: '5,00',
      })
    );
  });

  test('prévia sem encargos e prévia que falha não aparecem', async () => {
    servico.listarParcelas.mockResolvedValue([parcela(2, 'pendente'), parcela(3, 'pendente')]);
    servico.calcularParcela
      .mockResolvedValueOnce({ total: 400, multa: 0, juros: 0, desconto: 0, diasAtraso: 1 })
      .mockRejectedValueOnce(new Error('falhou'));
    await abrirParcelas();

    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Registrar pagamento' }));
    expect(await within(linhas()[0]).findByText('1 dia de atraso')).toBeInTheDocument();
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(within(linhas()[1]).getByRole('button', { name: 'Registrar pagamento' }));
    await waitFor(() => expect(servico.calcularParcela).toHaveBeenCalledTimes(2));
    expect(within(linhas()[1]).queryByText(/Total a receber/)).not.toBeInTheDocument();
  });

  test('as abas novas aparecem e não mostram o botão de gerar parcelas', async () => {
    servico.listarContas.mockResolvedValue([]);
    renderizar(<AdminFinanceiro />);
    await screen.findByText('Previsto no mês');
    fireEvent.click(screen.getByRole('tab', { name: 'Contas a pagar' }));
    expect(await screen.findByText(/Nenhuma conta cadastrada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar parcelas que faltam' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Visão geral', 'Parcelas 0', 'Contas a pagar', 'Fluxo de caixa', 'Professores', 'Regras de cobrança',
    ]);
  });
});

// ===================================================================
describe('contas a pagar', () => {
  const contas = () => [
    conta(1, 'pendente', { fornecedor: 'Imobiliária', observacao: 'Contrato 2026' }),
    conta(2, 'atrasado', { categoria: 'Energia', descricao: 'Luz' }),
    conta(3, 'pago'),
    conta(4, 'cancelado'),
  ];

  test('lista, filtra e busca', async () => {
    servico.listarContas.mockResolvedValue(contas());
    render(<ContasAPagar />);

    expect(await screen.findByText('Imobiliária')).toBeInTheDocument();
    expect(screen.getByText('4 contas · total de R$ 4.000,00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Atrasadas/ }));
    expect(screen.getByText('1 conta · total de R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Todas/ }));
    fireEvent.change(screen.getByPlaceholderText(/Buscar por descrição/), { target: { value: 'imobili' } });
    expect(linhas()).toHaveLength(1);
    fireEvent.change(screen.getByPlaceholderText(/Buscar por descrição/), { target: { value: 'nada' } });
    expect(screen.getByText('Nenhuma conta encontrada com esses filtros.')).toBeInTheDocument();
  });

  test('cadastra conta fixa repetindo todo mês', async () => {
    servico.listarContas.mockResolvedValue([]);
    servico.criarConta.mockResolvedValue([{}, {}, {}]);
    render(<ContasAPagar />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Nova conta' }));

    const janela = screen.getByRole('dialog', { name: 'Nova conta' });
    fireEvent.change(within(janela).getByLabelText('Descrição'), { target: { value: 'Aluguel' } });
    fireEvent.change(within(janela).getByLabelText('Categoria'), { target: { value: 'Aluguel' } });
    fireEvent.change(within(janela).getByLabelText('Valor (R$)'), { target: { value: '3500,50' } });
    fireEvent.change(within(janela).getByLabelText('Vencimento'), { target: { value: '2026-11-10' } });
    fireEvent.change(within(janela).getByLabelText('Repetir todo mês'), { target: { value: '3' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'SALVAR' }));

    expect(await screen.findByText('3 contas cadastradas (uma por mês).')).toBeInTheDocument();
    expect(servico.criarConta).toHaveBeenCalledWith(
      expect.objectContaining({ descricao: 'Aluguel', valor: '3500.50', dataVencimento: '2026-11-10', status: 'pendente' }),
      3
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('cadastro de uma conta só e erro do servidor', async () => {
    servico.listarContas.mockResolvedValue([]);
    servico.criarConta
      .mockRejectedValueOnce({ response: { data: { mensagem: 'Informe um valor maior que zero.' } } })
      .mockResolvedValueOnce([{}]);
    render(<ContasAPagar />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Nova conta' }));
    const janela = screen.getByRole('dialog');
    fireEvent.change(within(janela).getByLabelText('Descrição'), { target: { value: 'Luz' } });
    fireEvent.change(within(janela).getByLabelText('Categoria'), { target: { value: 'Energia' } });
    fireEvent.change(within(janela).getByLabelText('Valor (R$)'), { target: { value: '0' } });
    fireEvent.submit(within(janela).getByRole('button', { name: 'SALVAR' }).closest('form'));
    expect(await within(janela).findByText('Informe um valor maior que zero.')).toBeInTheDocument();

    fireEvent.submit(within(janela).getByRole('button', { name: 'SALVAR' }).closest('form'));
    expect(await screen.findByText('Conta cadastrada.')).toBeInTheDocument();
  });

  test('edita, cancela a janela com Esc e exclui', async () => {
    servico.listarContas.mockResolvedValue([conta(1, 'pendente')]);
    servico.atualizarConta.mockResolvedValue({});
    servico.excluirConta.mockResolvedValue({});
    render(<ContasAPagar />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const janela = screen.getByRole('dialog', { name: 'Editar conta' });
    expect(within(janela).getByLabelText('Descrição')).toHaveValue('Conta 1');
    fireEvent.change(within(janela).getByLabelText('Situação'), { target: { value: 'cancelado' } });
    fireEvent.click(within(janela).getByRole('button', { name: 'SALVAR' }));
    expect(await screen.findByText('Conta atualizada.')).toBeInTheDocument();
    expect(servico.atualizarConta).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'cancelado' }));

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Conta excluída.')).toBeInTheDocument();
    expect(servico.excluirConta).toHaveBeenCalledWith(1);
  });

  test('paga, desfaz e mostra os erros', async () => {
    servico.listarContas.mockResolvedValue([conta(1, 'atrasado'), conta(2, 'pago')]);
    servico.pagarConta.mockResolvedValueOnce({}).mockRejectedValueOnce({});
    servico.estornarConta.mockRejectedValueOnce({ response: { data: { mensagem: 'Não deu.' } } });
    servico.excluirConta.mockRejectedValueOnce({});
    render(<ContasAPagar />);

    fireEvent.click(await screen.findByRole('button', { name: 'Pagar' }));
    fireEvent.change(screen.getByLabelText('Forma'), { target: { value: 'Boleto bancário' } });
    fireEvent.change(screen.getByLabelText('Pago em'), { target: { value: '2026-10-11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Pagamento de "Conta 1" registrado.')).toBeInTheDocument();
    expect(servico.pagarConta).toHaveBeenCalledWith(1, { dataPagamento: '2026-10-11', formaPagamento: 'Boleto bancário' });

    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Não foi possível registrar o pagamento.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByText('Não deu.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Não foi possível excluir a conta.')).toBeInTheDocument();
  });

  test('desfaz pagamento; sem confirmar não faz nada', async () => {
    servico.listarContas.mockResolvedValue([conta(2, 'pago')]);
    servico.estornarConta.mockResolvedValue({});
    render(<ContasAPagar />);

    window.confirm = jest.fn(() => false);
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    expect(servico.estornarConta).not.toHaveBeenCalled();

    window.confirm = jest.fn(() => true);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByText('Pagamento desfeito. A conta voltou a ficar em aberto.')).toBeInTheDocument();
  });

  test('erro ao carregar e categorias padrão quando a lista falha', async () => {
    servico.listarContas.mockRejectedValue(new Error('x'));
    servico.listarCategoriasDeContas.mockRejectedValue(new Error('x'));
    render(<ContasAPagar />);
    expect(await screen.findByText('Não foi possível carregar as contas a pagar.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Nova conta' }));
    expect(within(screen.getByLabelText('Categoria')).getByRole('option', { name: 'Sistemas e softwares' })).toBeInTheDocument();
  });
});

// ===================================================================
describe('fluxo de caixa', () => {
  const fluxo = (dados = {}) => ({
    entradasNoMes: 5000,
    saidasNoMes: 6000,
    saldoNoMes: -1000,
    aReceberNoMes: 800,
    aPagarNoMes: 350,
    contasAtrasadas: 2,
    valorContasAtrasadas: 350,
    meses: [
      { mes: '2026-09', entradasRealizadas: 4000, entradasPrevistas: 0, saidasRealizadas: 3000, saidasPrevistas: 0, saldo: 1000, saldoAcumulado: 1000 },
      { mes: '2026-10', entradasRealizadas: 5000, entradasPrevistas: 800, saidasRealizadas: 6000, saidasPrevistas: 350, saldo: -550, saldoAcumulado: 450 },
      { mes: '2026-11', entradasRealizadas: 0, entradasPrevistas: 5000, saidasRealizadas: 0, saidasPrevistas: 4000, saldo: 1000, saldoAcumulado: 1450 },
    ],
    despesasPorCategoria: [{ nome: 'Aluguel', valor: 3500 }],
    ...dados,
  });

  test('indicadores, gráfico com dica e despesas por categoria', async () => {
    servico.buscarFluxoDeCaixa.mockResolvedValue(fluxo());
    render(<FluxoDeCaixa />);

    expect(await screen.findByText('Saldo do mês')).toBeInTheDocument();
    expect(screen.getByText('-R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('▼ saiu mais do que entrou')).toBeInTheDocument();
    expect(screen.getByText('⚠ 2 contas atrasadas')).toBeInTheDocument();
    expect(screen.getByText(/o saldo acumulado até nov\/26 fica em/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Despesas do mês por categoria' })).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('fluxo-2026-10'));
    const dica = screen.getByRole('tooltip');
    expect(within(dica).getByText('Entradas: R$ 5.800,00')).toBeInTheDocument();
    expect(within(dica).getByText('(R$ 800,00 previsto)')).toBeInTheDocument();
    expect(within(dica).getByText('Saídas: R$ 6.350,00')).toBeInTheDocument();
    expect(within(dica).getByText('Saldo do mês: -R$ 550,00')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId('fluxo-2026-10'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('fluxo-2026-09'));
    expect(within(screen.getByRole('tooltip')).queryByText(/previsto\)/)).not.toBeInTheDocument();
  });

  test('saldo positivo, sem atraso e sem despesas', async () => {
    servico.buscarFluxoDeCaixa.mockResolvedValue(
      fluxo({ saldoNoMes: 200, contasAtrasadas: 0, despesasPorCategoria: [], meses: [] })
    );
    render(<FluxoDeCaixa />);
    expect(await screen.findByText('▲ entrou mais do que saiu')).toBeInTheDocument();
    expect(screen.getByText('neste mês')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma despesa neste mês/)).toBeInTheDocument();
  });

  test('uma conta atrasada no singular e erro ao carregar', async () => {
    servico.buscarFluxoDeCaixa.mockResolvedValueOnce(fluxo({ contasAtrasadas: 1 }));
    const { unmount } = render(<FluxoDeCaixa />);
    expect(await screen.findByText('⚠ 1 conta atrasada')).toBeInTheDocument();
    unmount();

    servico.buscarFluxoDeCaixa.mockRejectedValueOnce(new Error('x'));
    render(<FluxoDeCaixa />);
    expect(await screen.findByText('Não foi possível carregar o fluxo de caixa.')).toBeInTheDocument();
  });
});

// ===================================================================
describe('pagamento dos professores', () => {
  const folha = () => [
    {
      idProfessor: 1, nome: 'Ana Souza', status: 'ativo', valorHora: 50, turmas: ['ADS 2026/2'],
      horasSugeridas: 40, idConta: null, situacaoConta: null, horasLancadas: null, valorConta: null,
    },
    {
      idProfessor: 2, nome: 'Bruno Lima', status: 'ativo', valorHora: null, turmas: [],
      horasSugeridas: null, idConta: null, situacaoConta: null, horasLancadas: null, valorConta: null,
    },
    {
      idProfessor: 3, nome: 'Carla Dias', status: 'inativo', valorHora: 60, turmas: [],
      horasSugeridas: null, idConta: 9, situacaoConta: 'pendente', horasLancadas: 20.5, valorConta: 1230,
    },
  ];

  test('mostra a folha do mês com as horas sugeridas e o que já foi gerado', async () => {
    servico.listarFolhaDosProfessores.mockResolvedValue(folha());
    render(<PagamentoProfessores />);

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(servico.listarFolhaDosProfessores).toHaveBeenCalledWith(hojeISO().slice(0, 7));
    expect(screen.getByLabelText('Horas de Ana Souza')).toHaveValue('40');
    expect(within(linhas()[0]).getByText('R$ 2.000,00')).toBeInTheDocument();
    expect(screen.getByText('Sem turmas ativas · inativo')).toBeInTheDocument();
    expect(within(linhas()[2]).getByText('20,5 h')).toBeInTheDocument();
    expect(within(linhas()[2]).getByText('A pagar')).toBeInTheDocument();
    expect(screen.getByText(/gerado em .*: R\$ 1\.230,00/)).toBeInTheDocument();
    // Sem valor da hora não dá para gerar
    expect(within(linhas()[1]).getByRole('button', { name: 'Gerar pagamento' })).toBeDisabled();
  });

  test('salva e remove o valor da hora', async () => {
    servico.listarFolhaDosProfessores.mockResolvedValue(folha());
    servico.definirValorDaHora.mockResolvedValue({});
    render(<PagamentoProfessores />);

    fireEvent.change(await screen.findByLabelText('Valor da hora de Bruno Lima'), { target: { value: '45,5' } });
    // Com o valor mudado e não salvo, também não gera
    fireEvent.click(within(linhas()[1]).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Valor da hora de Bruno Lima salvo.')).toBeInTheDocument();
    expect(servico.definirValorDaHora).toHaveBeenCalledWith(2, '45.5');

    fireEvent.change(screen.getByLabelText('Valor da hora de Ana Souza'), { target: { value: '' } });
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Valor da hora de Ana Souza removido.')).toBeInTheDocument();
    expect(servico.definirValorDaHora).toHaveBeenLastCalledWith(1, null);
  });

  test('gera o pagamento e avisa onde ele aparece', async () => {
    servico.listarFolhaDosProfessores.mockResolvedValue(folha());
    servico.gerarPagamentoDoProfessor.mockResolvedValue({ valor: 1875 });
    render(<PagamentoProfessores />);

    fireEvent.change(await screen.findByLabelText('Horas de Ana Souza'), { target: { value: '37,5' } });
    expect(within(linhas()[0]).getByText('R$ 1.875,00')).toBeInTheDocument();
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Gerar pagamento' }));

    expect(await screen.findByText(/Pagamento de Ana Souza gerado \(R\$ 1\.875,00\)/)).toBeInTheDocument();
    expect(servico.gerarPagamentoDoProfessor).toHaveBeenCalledWith(1, { referencia: hojeISO().slice(0, 7), horas: '37.5' });
  });

  test('sem horas avisa; erro do servidor aparece; trocar o mês recarrega', async () => {
    servico.listarFolhaDosProfessores.mockResolvedValue(folha());
    servico.gerarPagamentoDoProfessor.mockRejectedValue({ response: { data: { mensagem: 'Já foi gerado.' } } });
    servico.definirValorDaHora.mockRejectedValue({});
    render(<PagamentoProfessores />);

    fireEvent.change(await screen.findByLabelText('Horas de Ana Souza'), { target: { value: '' } });
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Gerar pagamento' }));
    expect(screen.getByText(/Informe as horas-aula de Ana Souza em/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Horas de Ana Souza'), { target: { value: '10' } });
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Gerar pagamento' }));
    expect(await screen.findByText('Já foi gerado.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Valor da hora de Ana Souza'), { target: { value: '70' } });
    fireEvent.click(within(linhas()[0]).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Não foi possível salvar o valor da hora.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mês de referência'), { target: { value: '2026-09' } });
    await waitFor(() => expect(servico.listarFolhaDosProfessores).toHaveBeenLastCalledWith('2026-09'));
  });

  test('lista vazia e erro ao carregar', async () => {
    servico.listarFolhaDosProfessores.mockResolvedValueOnce([]);
    const { unmount } = render(<PagamentoProfessores />);
    expect(await screen.findByText('Nenhum professor ativo cadastrado.')).toBeInTheDocument();
    unmount();

    servico.listarFolhaDosProfessores.mockRejectedValueOnce({ response: { data: { mensagem: 'Mês inválido.' } } });
    render(<PagamentoProfessores />);
    expect(await screen.findByText('Mês inválido.')).toBeInTheDocument();
  });

  test('mês por extenso', () => {
    expect(mesPorExtenso('2026-03')).toBe('março de 2026');
  });
});

// ===================================================================
describe('regras de cobrança', () => {
  test('carrega, mostra o exemplo e salva', async () => {
    servico.buscarRegrasDeCobranca.mockResolvedValue({
      multaPercentual: 2, jurosMesPercentual: 1, descontoPontualidadePercentual: 5, diasCarencia: 0,
    });
    servico.salvarRegrasDeCobranca.mockResolvedValue({});
    render(<RegrasDeCobranca />);

    expect(await screen.findByLabelText('Multa por atraso (%)')).toHaveValue('2');
    expect(screen.getByText('Paga até o vencimento: R$ 475,00 (desconto de R$ 25,00)')).toBeInTheDocument();
    expect(screen.getByText('Paga com 15 dias de atraso: R$ 512,50 (multa R$ 10,00 + juros R$ 2,50)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Juros ao mês (%)'), { target: { value: '0,5' } });
    fireEvent.change(screen.getByLabelText('Dias de carência'), { target: { value: '20' } });
    expect(screen.getByText('Paga com 15 dias de atraso: R$ 500,00 (ainda na carência)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SALVAR REGRAS' }));

    expect(await screen.findByText('Regras de cobrança salvas. Valem para as próximas baixas.')).toBeInTheDocument();
    expect(servico.salvarRegrasDeCobranca).toHaveBeenCalledWith({
      multaPercentual: 2, jurosMesPercentual: 0.5, descontoPontualidadePercentual: 5, diasCarencia: 20,
    });
  });

  test('sem desconto, erro ao salvar e erro ao carregar', async () => {
    servico.buscarRegrasDeCobranca.mockResolvedValueOnce({});
    servico.salvarRegrasDeCobranca
      .mockRejectedValueOnce({ response: { data: { mensagem: 'A multa deve ficar entre 0% e 2%.' } } })
      .mockRejectedValueOnce({});
    const { unmount } = render(<RegrasDeCobranca />);

    expect(await screen.findByText('Paga até o vencimento: R$ 500,00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SALVAR REGRAS' }));
    expect(await screen.findByText('A multa deve ficar entre 0% e 2%.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SALVAR REGRAS' }));
    expect(await screen.findByText('Não foi possível salvar as regras.')).toBeInTheDocument();
    unmount();

    servico.buscarRegrasDeCobranca.mockRejectedValueOnce(new Error('x'));
    render(<RegrasDeCobranca />);
    expect(await screen.findByText('Não foi possível carregar as regras de cobrança.')).toBeInTheDocument();
  });
});

// ===================================================================
describe('área do aluno', () => {
  test('parcela atrasada mostra o valor com multa e o recibo mostra os encargos', () => {
    render(
      <PagamentosDaInscricao
        aluno="Lucas"
        parcelas={[
          parcela(1, 'pago', { valorPago: 412.5, multa: 8, juros: 4.5, desconto: 0 }),
          parcela(2, 'atrasado', { valorAtualizado: 410 }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver parcelas' }));
    expect(screen.getByText('hoje R$ 410,00 com multa e juros')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Recibo' }));
    const recibo = screen.getByRole('dialog', { name: 'Recibo de pagamento' });
    expect(within(recibo).getByText('R$ 412,50')).toBeInTheDocument();
    expect(within(recibo).getByText('Multa')).toBeInTheDocument();
    expect(within(recibo).getByText('R$ 4,50')).toBeInTheDocument();
    expect(within(recibo).queryByText('Desconto')).not.toBeInTheDocument();
  });

  test('recibo com desconto', () => {
    render(<PagamentosDaInscricao parcelas={[parcela(1, 'pago', { valorPago: 380, desconto: 20 })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver parcelas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recibo' }));
    expect(screen.getByText('- R$ 20,00')).toBeInTheDocument();
  });
});

