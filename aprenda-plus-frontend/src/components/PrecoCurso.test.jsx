import { render, screen } from '@testing-library/react';
import PrecoCurso from './PrecoCurso';

describe('PrecoCurso', () => {
  test('curso parcelado mostra a mensalidade em destaque e o total embaixo', () => {
    render(<PrecoCurso curso={{ valor: 12000, numeroParcelas: 24 }} />);

    expect(screen.getByText(/500,00/)).toBeInTheDocument();
    expect(screen.getByText('/mês')).toBeInTheDocument();
    expect(screen.getByText(/em 24x · total de/)).toHaveTextContent('12.000,00');
  });

  test('curso sem parcelas mostra só o valor total', () => {
    render(<PrecoCurso curso={{ valor: 6500 }} />);

    expect(screen.getByText(/6\.500,00/)).toBeInTheDocument();
    expect(screen.queryByText('/mês')).not.toBeInTheDocument();
  });

  test('aplica a variante visual pedida', () => {
    const { container } = render(<PrecoCurso curso={{ valor: 100 }} variante="carrinho" />);

    expect(container.firstChild).toHaveClass('preco', 'preco-carrinho');
  });
});
