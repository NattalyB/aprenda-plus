import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CursoModal from './CursoModal';
import { adicionarAoCarrinho } from '../services/carrinhoService';
import { mostrarAviso } from '../services/avisoService';

jest.mock('../services/carrinhoService');
jest.mock('../services/avisoService');

const curso = {
  idCurso: 2,
  nome: 'Engenharia de Software',
  categoria: 'superior',
  descricao: 'Formação completa em software.',
  cargaHoraria: 3600,
  modalidade: 'híbrido',
  preRequisitos: 'Ensino Médio',
  conteudo: 'Algoritmos\nBanco de Dados\nDevOps',
  valor: 48000,
  numeroParcelas: 71,
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('CursoModal', () => {
  test('sem curso selecionado não mostra nada', () => {
    const { container } = render(<CursoModal curso={null} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('mostra os detalhes e o conteúdo em tópicos', () => {
    render(<CursoModal curso={curso} onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Engenharia de Software' })).toBeInTheDocument();
    expect(screen.getByText('3600h')).toBeInTheDocument();
    expect(screen.getByText('Ensino Médio')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('DevOps')).toBeInTheDocument();
  });

  test('conteúdo separado por ponto e vírgula também vira lista', () => {
    render(<CursoModal curso={{ ...curso, conteudo: 'Python; SQL' }} onClose={jest.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('conteúdo de um tópico só aparece como parágrafo', () => {
    render(<CursoModal curso={{ ...curso, conteudo: 'Texto corrido', preRequisitos: '' }} onClose={jest.fn()} />);

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getByText('Texto corrido')).toBeInTheDocument();
    expect(screen.getByText('Nenhum')).toBeInTheDocument();
  });

  test('sem login, avisa que precisa entrar e não adiciona', () => {
    render(<CursoModal curso={curso} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText('ADICIONAR AO CARRINHO'));

    expect(mostrarAviso).toHaveBeenCalledWith(expect.stringMatching(/precisa fazer login/), 'aviso');
    expect(adicionarAoCarrinho).not.toHaveBeenCalled();
  });

  test('logado, adiciona o curso, avisa e fecha o modal', async () => {
    localStorage.setItem('token', 'x');
    adicionarAoCarrinho.mockResolvedValue({});
    const onClose = jest.fn();
    render(<CursoModal curso={curso} onClose={onClose} />);

    fireEvent.click(screen.getByText('ADICIONAR AO CARRINHO'));

    expect(screen.getByText('ADICIONANDO...')).toBeDisabled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(adicionarAoCarrinho).toHaveBeenCalledWith(2);
    expect(mostrarAviso).toHaveBeenCalledWith('"Engenharia de Software" foi adicionado ao carrinho!', 'sucesso');
  });

  test('se der erro, mostra aviso de erro e o modal continua aberto', async () => {
    localStorage.setItem('token', 'x');
    adicionarAoCarrinho.mockRejectedValue(new Error('falhou'));
    const onClose = jest.fn();
    render(<CursoModal curso={curso} onClose={onClose} />);

    fireEvent.click(screen.getByText('ADICIONAR AO CARRINHO'));

    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith(expect.any(String), 'erro'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('ADICIONAR AO CARRINHO')).toBeEnabled();
  });

  test('fecha pelo X e clicando fora do cartão', () => {
    const onClose = jest.fn();
    const { container } = render(<CursoModal curso={curso} onClose={onClose} />);

    fireEvent.click(screen.getByText('×'));
    fireEvent.click(container.querySelector('.modal-overlay'));
    // Clicar dentro do cartão não fecha
    fireEvent.click(container.querySelector('.modal-card'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
