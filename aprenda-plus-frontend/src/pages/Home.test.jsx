import { screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './Home';
import Header from '../components/Header';
import { renderizar } from '../testUtils';
import { listarCursos } from '../services/cursoService';
import { listarItensDoCarrinho } from '../services/carrinhoService';

jest.mock('../services/cursoService');
jest.mock('../services/carrinhoService');

const cursos = [
  { idCurso: 1, nome: 'Engenharia de Software', categoria: 'superior', valor: 48000, numeroParcelas: 71, conteudo: 'A\nB' },
  { idCurso: 2, nome: 'Ciência de Dados', categoria: 'superior', valor: 12000, numeroParcelas: 28 },
  { idCurso: 3, nome: 'Curso Sem Imagem', categoria: 'profissionalizante', valor: 500 },
];

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  listarCursos.mockResolvedValue({ data: cursos });
  listarItensDoCarrinho.mockResolvedValue([]);
});

test('mostra "carregando" e depois os cursos', async () => {
  renderizar(<Home />);

  expect(screen.getByText('Carregando cursos...')).toBeInTheDocument();
  expect(await screen.findByText('Engenharia de Software')).toBeInTheDocument();
  expect(screen.getAllByText('MAIS DETALHES')).toHaveLength(3);
});

test('cursos com banner mostram a imagem; os outros, o bloco reserva', async () => {
  renderizar(<Home />);
  await screen.findByText('Engenharia de Software');

  expect(screen.getByAltText('Banner do curso Engenharia de Software')).toBeInTheDocument();
  expect(screen.getByText('Aprenda+')).toBeInTheDocument();
});

test('mostra a mensalidade de quem tem parcelas', async () => {
  renderizar(<Home />);
  await screen.findByText('Engenharia de Software');

  expect(screen.getByText(/em 28x · total de/)).toBeInTheDocument();
});

test('erro ao carregar mostra mensagem', async () => {
  listarCursos.mockRejectedValue(new Error('offline'));
  renderizar(<Home />);

  expect(await screen.findByText('Não foi possível carregar os cursos.')).toBeInTheDocument();
});

test('a busca do Header filtra os cursos sem diferenciar acentos', async () => {
  renderizar(
    <>
      <Header />
      <Home />
    </>
  );
  await screen.findByText('Engenharia de Software');

  fireEvent.change(screen.getByPlaceholderText('Pesquisar cursos...'), { target: { value: 'CIENCIA' } });

  await waitFor(() => expect(screen.queryByText('Engenharia de Software')).not.toBeInTheDocument());
  expect(screen.getAllByText('Ciência de Dados').length).toBeGreaterThan(0);
});

test('busca sem resultado mostra aviso', async () => {
  renderizar(
    <>
      <Header />
      <Home />
    </>
  );
  await screen.findByText('Engenharia de Software');

  fireEvent.change(screen.getByPlaceholderText('Pesquisar cursos...'), { target: { value: 'xyz' } });

  expect(await screen.findByText('Nenhum curso encontrado.')).toBeInTheDocument();
});

test('os botões e a imagem abrem o modal do curso, e ele fecha', async () => {
  renderizar(<Home />);
  await screen.findByText('Engenharia de Software');

  fireEvent.click(screen.getAllByText('MAIS DETALHES')[0]);
  expect(screen.getByRole('heading', { level: 2, name: 'Engenharia de Software' })).toBeInTheDocument();
  fireEvent.click(screen.getByText('×'));
  expect(screen.queryByRole('heading', { level: 2, name: 'Engenharia de Software' })).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByText('ADICIONAR AO CARRINHO')[1]);
  expect(screen.getByRole('heading', { level: 2, name: 'Ciência de Dados' })).toBeInTheDocument();
  fireEvent.click(screen.getByText('×'));

  fireEvent.click(screen.getByAltText('Banner do curso Engenharia de Software'));
  expect(screen.getByRole('heading', { level: 2, name: 'Engenharia de Software' })).toBeInTheDocument();
});
