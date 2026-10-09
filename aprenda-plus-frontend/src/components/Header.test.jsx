import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import Header from './Header';
import { renderizar, logarAluno } from '../testUtils';
import { listarItensDoCarrinho } from '../services/carrinhoService';
import { listarCursos } from '../services/cursoService';

jest.mock('../services/carrinhoService');
jest.mock('../services/cursoService');

const cursos = [
  { idCurso: 1, nome: 'Análise e Desenvolvimento de Sistemas', categoria: 'superior' },
  { idCurso: 2, nome: 'Ciência de Dados', categoria: 'superior' },
  { idCurso: 3, nome: 'Design Gráfico', categoria: 'profissionalizante' },
];

const campoBusca = () => screen.getByPlaceholderText('Pesquisar cursos...');

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  listarCursos.mockResolvedValue({ data: cursos });
  listarItensDoCarrinho.mockResolvedValue([]);
});

describe('Header: visitante', () => {
  test('mostra os botões de Login e Cadastro e o carrinho zerado', async () => {
    renderizar(<Header />);

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Cadastro')).toBeInTheDocument();
    expect(screen.getByText(/\(0\)/)).toBeInTheDocument();
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());
    // Visitante não tem carrinho pra consultar
    expect(listarItensDoCarrinho).not.toHaveBeenCalled();
  });
});

describe('Header: aluno logado', () => {
  test('mostra só o primeiro nome e a quantidade de itens do carrinho', async () => {
    logarAluno('Maria Silva');
    listarItensDoCarrinho.mockResolvedValue([{ idItem: 1 }, { idItem: 2 }]);

    renderizar(<Header />);

    expect(screen.getByText('Olá, Maria')).toBeInTheDocument();
    expect(await screen.findByText(/\(2\)/)).toBeInTheDocument();
  });

  test('atualiza o contador quando o carrinho muda', async () => {
    logarAluno();
    renderizar(<Header />);
    await screen.findByText(/\(0\)/);

    listarItensDoCarrinho.mockResolvedValue([{ idItem: 1 }]);
    act(() => window.dispatchEvent(new Event('carrinho-atualizado')));

    expect(await screen.findByText(/\(1\)/)).toBeInTheDocument();
  });

  test('se der erro ao buscar o carrinho, mostra zero', async () => {
    logarAluno();
    listarItensDoCarrinho.mockRejectedValue(new Error('falhou'));

    renderizar(<Header />);

    await waitFor(() => expect(listarItensDoCarrinho).toHaveBeenCalled());
    expect(screen.getByText(/\(0\)/)).toBeInTheDocument();
  });

  test('Sair desloga e volta pra Home', async () => {
    logarAluno();
    renderizar(<Header />, { rota: '/carrinho' });

    fireEvent.click(screen.getByText('Sair'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
  });
});

describe('Header: busca com sugestões', () => {
  test('ao clicar na busca, mostra os cursos como sugestão', async () => {
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());

    fireEvent.focus(campoBusca());

    expect(await screen.findAllByRole('option')).toHaveLength(3);
  });

  test('filtra enquanto digita, sem diferenciar acentos', async () => {
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());

    fireEvent.change(campoBusca(), { target: { value: 'ciencia' } });

    const opcoes = await screen.findAllByRole('option');
    expect(opcoes).toHaveLength(1);
    expect(opcoes[0]).toHaveTextContent('Ciência de Dados');
  });

  test('avisa quando nenhum curso combina', async () => {
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());

    fireEvent.change(campoBusca(), { target: { value: 'culinária' } });

    expect(await screen.findByText('Nenhum curso encontrado')).toBeInTheDocument();
  });

  test('clicar numa sugestão preenche a busca e volta pra Home', async () => {
    renderizar(<Header />, { rota: '/carrinho' });
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());
    fireEvent.focus(campoBusca());

    fireEvent.mouseDown(await screen.findByText('Design Gráfico'));

    expect(campoBusca()).toHaveValue('Design Gráfico');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
  });

  test('navega pelo teclado: setas e Enter', async () => {
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());
    fireEvent.focus(campoBusca());
    await screen.findAllByRole('option');

    fireEvent.keyDown(campoBusca(), { key: 'ArrowDown' });
    fireEvent.keyDown(campoBusca(), { key: 'ArrowDown' });
    fireEvent.keyDown(campoBusca(), { key: 'ArrowUp' });
    fireEvent.keyDown(campoBusca(), { key: 'ArrowDown' });

    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(campoBusca(), { key: 'Enter' });

    expect(campoBusca()).toHaveValue('Ciência de Dados');
  });

  test('passar o mouse destaca a sugestão', async () => {
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());
    fireEvent.focus(campoBusca());

    const opcoes = await screen.findAllByRole('option');
    fireEvent.mouseEnter(opcoes[2]);

    expect(opcoes[2]).toHaveClass('ativa');
  });

  test('Enter sem sugestão escolhida só fecha a lista e vai pra Home', async () => {
    renderizar(<Header />, { rota: '/carrinho' });
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());
    fireEvent.change(campoBusca(), { target: { value: 'dados' } });
    await screen.findAllByRole('option');

    fireEvent.keyDown(campoBusca(), { key: 'Enter' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(campoBusca()).toHaveValue('dados');
    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
  });

  test('Esc e sair do campo fecham a lista', async () => {
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());

    fireEvent.focus(campoBusca());
    await screen.findAllByRole('option');
    fireEvent.keyDown(campoBusca(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.focus(campoBusca());
    await screen.findAllByRole('option');
    fireEvent.blur(campoBusca());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('botão da lupa leva pra Home', async () => {
    renderizar(<Header />, { rota: '/carrinho' });
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());

    fireEvent.click(screen.getByText('🔍'));

    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/);
  });

  test('se não conseguir carregar os cursos, não mostra sugestões', async () => {
    listarCursos.mockRejectedValue(new Error('offline'));
    renderizar(<Header />);
    await waitFor(() => expect(listarCursos).toHaveBeenCalled());

    fireEvent.focus(campoBusca());

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
