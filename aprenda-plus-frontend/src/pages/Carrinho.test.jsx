import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import Carrinho from './Carrinho';
import { renderizar, logarAluno } from '../testUtils';
import { listarItensDoCarrinho, removerItemDoCarrinho } from '../services/carrinhoService';
import { buscarTurmasPorCurso } from '../services/cursoService';
import { criarInscricao } from '../services/inscricaoService';
import { mostrarAviso } from '../services/avisoService';

jest.mock('../services/carrinhoService');
jest.mock('../services/cursoService');
jest.mock('../services/inscricaoService');
jest.mock('../services/avisoService');

// Dois cursos: um pode ser pago em até 24x, o outro em até 12x
const itens = [
  { idItem: 10, curso: { idCurso: 1, nome: 'Engenharia de Software', categoria: 'superior', modalidade: 'híbrido', cargaHoraria: 3600, valor: 12000, numeroParcelas: 24 } },
  { idItem: 11, curso: { idCurso: 2, nome: 'Curso Sem Imagem', categoria: 'profissionalizante', valor: 6000, numeroParcelas: 12 } },
];

// O resumo do pedido (coluna da direita)
const resumo = () => within(screen.getByText('Resumo do pedido').closest('aside'));
const textoSemEspacoEspecial = (el) => el.textContent.replace(/\s/g, ' ');

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  listarItensDoCarrinho.mockResolvedValue(itens);
  removerItemDoCarrinho.mockResolvedValue({});
  buscarTurmasPorCurso.mockImplementation((idCurso) => Promise.resolve([{ idTurma: idCurso * 100 }]));
  criarInscricao.mockResolvedValue({});
});

describe('estados da página', () => {
  test('sem login, pede pra entrar', async () => {
    renderizar(<Carrinho />);

    expect(await screen.findByText('Faça login para ver seu carrinho')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(listarItensDoCarrinho).not.toHaveBeenCalled();
  });

  test('carrinho vazio', async () => {
    logarAluno();
    listarItensDoCarrinho.mockResolvedValue([]);
    renderizar(<Carrinho />);

    expect(await screen.findByText('Seu carrinho está vazio')).toBeInTheDocument();
  });

  test('erro ao carregar', async () => {
    logarAluno();
    listarItensDoCarrinho.mockRejectedValue(new Error('offline'));
    renderizar(<Carrinho />);

    expect(await screen.findByText('Não foi possível carregar o carrinho.')).toBeInTheDocument();
  });

  test('com itens, lista os cursos e o subtotal', async () => {
    logarAluno();
    renderizar(<Carrinho />);

    expect(await screen.findByText('Meu carrinho')).toBeInTheDocument();
    expect(screen.getByText('2 cursos selecionados')).toBeInTheDocument();
    expect(screen.getByAltText('Banner do curso Engenharia de Software')).toBeInTheDocument();
    expect(screen.getByText('Aprenda+')).toBeInTheDocument();
    expect(textoSemEspacoEspecial(resumo().getByText(/Subtotal/).parentElement)).toContain('R$ 18.000,00');
  });
});

describe('forma de pagamento', () => {
  test('sem escolher a forma de pagamento, não dá pra concluir', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    expect(screen.getByText('Escolha uma opção para continuar.')).toBeInTheDocument();
    expect(screen.getByText('CONCLUIR INSCRIÇÃO')).toBeDisabled();
  });

  test('o máximo de parcelas é o do curso com menor limite', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    // 24x e 12x no carrinho: oferece até 12x
    expect(screen.getAllByText('até 12x')).toHaveLength(2);

    fireEvent.click(screen.getByText('Cartão'));
    expect(screen.getByLabelText('Número de parcelas').querySelectorAll('option')).toHaveLength(12);
  });

  test('Pix aplica 5% de desconto no total', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));

    expect(textoSemEspacoEspecial(resumo().getByText('Desconto Pix (5%)').parentElement)).toContain('- R$ 900,00');
    expect(textoSemEspacoEspecial(resumo().getByText('Total').parentElement)).toContain('R$ 17.100,00');
  });

  test('cartão já sugere o máximo de parcelas e permite trocar', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Cartão'));
    expect(screen.getByLabelText('Número de parcelas')).toHaveValue('12');
    expect(textoSemEspacoEspecial(resumo().getByText('12x de').parentElement)).toContain('R$ 1.500,00');

    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '6' } });
    expect(textoSemEspacoEspecial(resumo().getByText('6x de').parentElement)).toContain('R$ 3.000,00');
    // Parcelado não tem desconto
    expect(textoSemEspacoEspecial(resumo().getByText('Total').parentElement)).toContain('R$ 18.000,00');
  });

  test('curso sem parcelas cadastradas só aceita à vista', async () => {
    logarAluno();
    listarItensDoCarrinho.mockResolvedValue([{ idItem: 1, curso: { idCurso: 9, nome: 'Avulso', valor: 300 } }]);
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    expect(screen.getAllByText('à vista')).toHaveLength(2);
    expect(screen.getByText('1 curso selecionado')).toBeInTheDocument();
  });
});

describe('remover curso', () => {
  test('remove, avisa e recarrega a lista', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');
    listarItensDoCarrinho.mockResolvedValue([itens[1]]);

    fireEvent.click(screen.getAllByText('Remover')[0]);

    await waitFor(() => expect(screen.queryByText('Engenharia de Software')).not.toBeInTheDocument());
    expect(removerItemDoCarrinho).toHaveBeenCalledWith(10);
    expect(mostrarAviso).toHaveBeenCalledWith('"Engenharia de Software" foi removido do carrinho.', 'sucesso');
  });

  test('se der erro, avisa', async () => {
    logarAluno();
    removerItemDoCarrinho.mockRejectedValue(new Error('falhou'));
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getAllByText('Remover')[0]);

    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith(expect.any(String), 'erro'));
  });
});

describe('concluir inscrição', () => {
  test('no Pix, cria as inscrições com desconto e esvazia o carrinho', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    // Uma inscrição por curso, na primeira turma de cada um, com 5% de desconto
    expect(criarInscricao).toHaveBeenCalledWith('7', 100, 11400, 'Pix à vista (5% de desconto)');
    expect(criarInscricao).toHaveBeenCalledWith('7', 200, 5700, 'Pix à vista (5% de desconto)');
    expect(removerItemDoCarrinho).toHaveBeenCalledWith(10);
    expect(removerItemDoCarrinho).toHaveBeenCalledWith(11);
    expect(screen.getByText(/código Pix/)).toBeInTheDocument();
  });

  test('no cartão, registra a quantidade de parcelas', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Cartão'));
    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    expect(criarInscricao).toHaveBeenCalledWith('7', 100, 12000, 'Cartão de crédito · 10x');
    expect(screen.getByText(/10x de/)).toBeInTheDocument();
    expect(screen.getByText(/cobrança no cartão/)).toBeInTheDocument();
  });

  test('no boleto, mostra a mensagem do boleto', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Boleto'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    expect(criarInscricao).toHaveBeenCalledWith('7', 100, 12000, 'Boleto bancário · 12x');
    expect(screen.getByText(/boletos serão enviados/)).toBeInTheDocument();
  });

  test('pagamento à vista mostra só o total na tela de sucesso', async () => {
    logarAluno();
    listarItensDoCarrinho.mockResolvedValue([{ idItem: 1, curso: { idCurso: 9, nome: 'Avulso', valor: 300 } }]);
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Boleto'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText(/Total:/)).toBeInTheDocument();
  });

  test('curso sem turma disponível mostra o erro e não esvazia o carrinho', async () => {
    logarAluno();
    buscarTurmasPorCurso.mockImplementation((idCurso) => Promise.resolve(idCurso === 2 ? [] : [{ idTurma: 1 }]));
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('O curso "Curso Sem Imagem" ainda não tem turma disponível.')).toBeInTheDocument();
    expect(removerItemDoCarrinho).not.toHaveBeenCalled();
    expect(screen.getByText('CONCLUIR INSCRIÇÃO')).toBeEnabled();
  });

  test('se o servidor recusar a compra, mostra a mensagem do servidor', async () => {
    logarAluno();
    criarInscricao.mockRejectedValue({
      message: 'Request failed with status code 400',
      response: { data: { mensagem: 'O curso "Engenharia de Software" pode ser pago em no máximo 24x.' } },
    });
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('O curso "Engenharia de Software" pode ser pago em no máximo 24x.')).toBeInTheDocument();
    expect(removerItemDoCarrinho).not.toHaveBeenCalled();
  });

  test('erro sem mensagem mostra o texto padrão', async () => {
    logarAluno();
    criarInscricao.mockRejectedValue({});
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Não foi possível concluir a inscrição.')).toBeInTheDocument();
  });
});
