import { screen, fireEvent } from '@testing-library/react';
import VoltarInicio from './VoltarInicio';
import { renderizar } from '../testUtils';
import { useSearch } from '../context/SearchContext';

// Campo de mentira ligado ao mesmo contexto da busca do topo
function CampoBusca() {
  const { termoBusca, setTermoBusca } = useSearch();
  return <input aria-label="busca" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} />;
}

const telaCom = (rota) =>
  renderizar(
    <>
      <CampoBusca />
      <VoltarInicio />
    </>,
    { rota }
  );

describe('VoltarInicio', () => {
  test('não aparece na página inicial sem pesquisa', () => {
    telaCom('/');
    expect(screen.queryByRole('button', { name: /início|cursos/ })).not.toBeInTheDocument();
  });

  test('nas outras telas leva de volta ao início', () => {
    telaCom('/carrinho');

    fireEvent.click(screen.getByRole('button', { name: /Voltar ao início/ }));

    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
  });

  test('na página inicial com pesquisa, limpa a pesquisa', () => {
    const scrollTo = jest.fn();
    window.scrollTo = scrollTo;
    telaCom('/');
    fireEvent.change(screen.getByLabelText('busca'), { target: { value: 'design' } });

    fireEvent.click(screen.getByRole('button', { name: /Ver todos os cursos/ }));

    expect(screen.getByLabelText('busca')).toHaveValue('');
    expect(scrollTo).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Ver todos os cursos/ })).not.toBeInTheDocument();
  });

  test('pesquisa só com espaços não conta como pesquisa', () => {
    telaCom('/');
    fireEvent.change(screen.getByLabelText('busca'), { target: { value: '   ' } });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('se o navegador não souber rolar suave, continua funcionando', () => {
    window.scrollTo = () => {
      throw new Error('sem suporte');
    };
    telaCom('/login');

    fireEvent.click(screen.getByRole('button', { name: /Voltar ao início/ }));

    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
  });

  test('sem scrollTo no navegador, só navega', () => {
    const original = window.scrollTo;
    delete window.scrollTo;
    telaCom('/cadastro');

    fireEvent.click(screen.getByRole('button', { name: /Voltar ao início/ }));

    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
    window.scrollTo = original;
  });
});
