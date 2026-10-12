import { render, screen, fireEvent } from '@testing-library/react';
import { GraficoMensal, BarrasHorizontais, formatarCompacto, topoDoEixo } from './GraficosFinanceiro';

const meses = [
  { mes: '2026-09', previsto: 1000, recebido: 800 },
  { mes: '2026-10', previsto: 2500, recebido: 0 },
];

test('números compactos e topo do eixo redondo', () => {
  expect(formatarCompacto(950)).toBe('950');
  expect(formatarCompacto(12500)).toBe('12,5 mil');
  expect(formatarCompacto(2300000)).toBe('2,3 mi');
  expect(formatarCompacto(null)).toBe('0');
  expect(topoDoEixo(0)).toBe(1);
  expect(topoDoEixo(2500)).toBe(5000);
  expect(topoDoEixo(1000)).toBe(1000);
  expect(topoDoEixo(7300)).toBe(10000);
});

test('gráfico mensal com legenda, destaque do mês atual, dica ao passar o mouse e tabela', () => {
  render(<GraficoMensal dados={meses} mesAtual="2026-10" />);

  expect(screen.getByRole('img', { name: 'Receita prevista e recebida por mês' })).toBeInTheDocument();
  expect(screen.getAllByText('Previsto').length).toBeGreaterThan(0);
  expect(screen.getAllByText('out/26')[0]).toHaveClass('grafico-eixo-atual');

  fireEvent.mouseEnter(screen.getByTestId('mes-2026-09'));
  expect(screen.getByRole('tooltip')).toHaveTextContent('set/26');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Recebido: R$');
  fireEvent.mouseLeave(screen.getByTestId('mes-2026-09'));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  expect(screen.getByText('Ver em tabela')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(3);
});

test('gráfico mensal sem valores não quebra', () => {
  render(<GraficoMensal dados={[{ mes: '2026-10', previsto: 0, recebido: 0 }]} mesAtual="2026-11" />);
  expect(screen.getByRole('img')).toBeInTheDocument();
});

test('barras horizontais mostram valor e porcentagem', () => {
  render(
    <BarrasHorizontais
      rotulo="Por curso"
      itens={[
        { nome: 'Redes', valor: 300 },
        { nome: 'Design', valor: 100 },
      ]}
    />
  );

  const itens = screen.getAllByRole('listitem');
  expect(itens[0]).toHaveTextContent('Redes');
  expect(itens[0]).toHaveTextContent('75%');
  expect(itens[1]).toHaveAttribute('title', expect.stringContaining('Design'));
});

test('barras sem dados mostram a mensagem', () => {
  const { rerender } = render(<BarrasHorizontais rotulo="x" itens={[]} />);
  expect(screen.getByText('Sem dados ainda.')).toBeInTheDocument();

  rerender(<BarrasHorizontais rotulo="x" itens={[{ nome: 'A', valor: 0 }]} vazio="Nada aqui." />);
  expect(screen.getByText('Nada aqui.')).toBeInTheDocument();
});
