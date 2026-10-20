import { render, screen, fireEvent, within } from '@testing-library/react';
import PagamentosDaInscricao from './PagamentosDaInscricao';

const parcela = (id, numero, status, dados = {}) => ({
  idPagamento: id,
  numeroParcela: numero,
  totalParcelas: 3,
  valor: 400,
  vencimento: `2026-1${numero - 1}-19`,
  dataPagamento: status === 'pago' ? '2026-10-18' : null,
  formaPagamento: 'Boleto bancário',
  curso: 'Redes',
  turma: 'Turma A',
  status,
  ...dados,
});

const parcelas = [parcela(1, 1, 'pago'), parcela(2, 2, 'atrasado'), parcela(3, 3, 'pendente'), parcela(4, 4, 'cancelado')];

test('sem parcelas não mostra nada', () => {
  const { container } = render(<PagamentosDaInscricao parcelas={[]} />);
  expect(container).toBeEmptyDOMElement();
  render(<PagamentosDaInscricao />);
});

test('resume as parcelas e lista ao abrir', () => {
  render(<PagamentosDaInscricao parcelas={parcelas} aluno="Lucas Almeida" />);

  expect(screen.getByText(/1 de 3/)).toBeInTheDocument();
  expect(screen.getByText(/Próxima: R\$\s?400,00 em 19\/11\/2026/)).toBeInTheDocument();
  expect(screen.getByText(/1 em atraso/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Ver parcelas' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getByText('Atrasada')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Esconder parcelas' }));
  expect(screen.queryByText('Atrasada')).not.toBeInTheDocument();
});

test('tudo pago: singular e sem próxima parcela', () => {
  render(<PagamentosDaInscricao parcelas={[parcela(1, 1, 'pago', { totalParcelas: 1 })]} />);

  expect(screen.getByText(/parcela paga/)).toBeInTheDocument();
  expect(screen.queryByText(/Próxima/)).not.toBeInTheDocument();
  expect(screen.queryByText(/em atraso/)).not.toBeInTheDocument();
});

test('abre o recibo de uma parcela paga, imprime e fecha', () => {
  window.print = jest.fn();
  render(<PagamentosDaInscricao parcelas={parcelas} aluno="Lucas Almeida" />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver parcelas' }));

  fireEvent.click(screen.getByRole('button', { name: 'Recibo' }));

  const recibo = screen.getByRole('dialog', { name: 'Recibo de pagamento' });
  expect(within(recibo).getByText('Recibo nº 000001')).toBeInTheDocument();
  expect(recibo).toHaveTextContent('Recebemos de Lucas Almeida');
  expect(recibo).toHaveTextContent('parcela 1 de 3');
  expect(recibo).toHaveTextContent('(Turma A)');
  expect(recibo).toHaveTextContent('Documento sem valor fiscal');

  fireEvent.click(within(recibo).getByRole('button', { name: 'Imprimir / salvar PDF' }));
  expect(window.print).toHaveBeenCalled();

  fireEvent.click(within(recibo).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('recibo sem nome do aluno, turma ou forma usa textos neutros', () => {
  render(
    <PagamentosDaInscricao parcelas={[parcela(7, 1, 'pago', { turma: null, formaPagamento: null, totalParcelas: 1 })]} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ver parcelas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Recibo' }));

  const recibo = screen.getByRole('dialog');
  expect(recibo).toHaveTextContent('Recebemos de Aluno(a)');
  expect(recibo).not.toHaveTextContent('(Turma');
  expect(within(recibo).getByText('Forma de pagamento').nextSibling).toHaveTextContent('-');
});

test('parcelas do cartão aparecem como cobrança automática, nunca como atraso', () => {
  const cartao = [
    parcela(1, 1, 'pago', { formaPagamento: 'Cartão de crédito', cobrancaAutomatica: true }),
    parcela(2, 2, 'pendente', { formaPagamento: 'Cartão de crédito', cobrancaAutomatica: true }),
    parcela(3, 3, 'atrasado', { formaPagamento: 'Cartão de crédito', cobrancaAutomatica: true }),
  ];
  render(<PagamentosDaInscricao parcelas={cartao} aluno="Lucas" />);

  expect(screen.queryByText(/em atraso/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver parcelas' }));
  expect(screen.getAllByText('Automática')).toHaveLength(2);
  expect(screen.getAllByText('Automática')[0]).toHaveClass('parcela-automatica');
});
