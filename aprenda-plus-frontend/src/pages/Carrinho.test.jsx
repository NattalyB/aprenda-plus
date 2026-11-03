import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import Carrinho from './Carrinho';
import { renderizar, logarAluno } from '../testUtils';
import { listarItensDoCarrinho, removerItemDoCarrinho } from '../services/carrinhoService';
import { listarTurmasDisponiveis } from '../services/turmaService';
import { criarInscricao } from '../services/inscricaoService';
import { mostrarAviso } from '../services/avisoService';

jest.mock('../services/carrinhoService');
jest.mock('../services/turmaService');
jest.mock('../services/inscricaoService');
jest.mock('../services/avisoService');
jest.mock('../services/documentoService', () => ({
  ...jest.requireActual('../services/documentoService'),
  listarMeusDocumentos: jest.fn(() => Promise.resolve({ data: [{ idDocumento: 1, status: 'aprovado', nomeArquivo: 'c.pdf' }] })),
}));

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
  listarTurmasDisponiveis.mockImplementation((idCurso) => Promise.resolve([{ idTurma: idCurso * 100, vagasRestantes: 5 }]));
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

  test('o máximo de parcelas é o do curso com MAIOR limite', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    // 24x e 12x no carrinho: oferece até 24x
    expect(screen.getAllByText('até 24x')).toHaveLength(2);

    fireEvent.click(screen.getByText('Cartão'));
    expect(screen.getByLabelText('Número de parcelas').querySelectorAll('option')).toHaveLength(24);
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
    expect(screen.getByLabelText('Número de parcelas')).toHaveValue('24');
    expect(textoSemEspacoEspecial(resumo().getByText('24x de').parentElement)).toContain('R$ 750,00');

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
    expect(criarInscricao).toHaveBeenCalledWith('7', 100, 12000, 'Boleto bancário · 24x');
    expect(criarInscricao).toHaveBeenCalledWith('7', 200, 6000, 'Boleto bancário · 24x');
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

  test('curso sem turma com inscrições abertas mostra o erro e não esvazia o carrinho', async () => {
    logarAluno();
    listarTurmasDisponiveis.mockImplementation((idCurso) => Promise.resolve(idCurso === 2 ? [] : [{ idTurma: 1, vagasRestantes: 3 }]));
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(
      await screen.findByText('O curso "Curso Sem Imagem" não tem turmas com inscrições abertas no momento.')
    ).toBeInTheDocument();
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

  test('pula as turmas lotadas e usa a primeira com vaga', async () => {
    logarAluno();
    listarTurmasDisponiveis.mockImplementation((idCurso) =>
      Promise.resolve([
        { idTurma: idCurso * 100, vagasRestantes: 0 },
        { idTurma: idCurso * 100 + 1, vagasRestantes: 2 },
      ])
    );
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    expect(criarInscricao).toHaveBeenCalledWith('7', 101, expect.any(Number), expect.any(String));
    expect(screen.getByRole('link', { name: 'Ver minhas inscrições' })).toHaveAttribute('href', '/minhas-inscricoes');
  });

  test('com todas as turmas lotadas, o aluno entra na lista de espera da primeira', async () => {
    logarAluno();
    listarTurmasDisponiveis.mockResolvedValue([
      { idTurma: 9, vagasRestantes: 0 },
      { idTurma: 10, vagasRestantes: 0 },
    ]);
    criarInscricao.mockResolvedValue({ data: { status: 'aguardando_vaga' } });
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Você está na lista de espera!')).toBeInTheDocument();
    expect(criarInscricao).toHaveBeenCalledWith('7', 9, expect.any(Number), expect.any(String));
    expect(screen.getByRole('status')).toHaveTextContent('"Engenharia de Software", "Curso Sem Imagem" estão cheias');
    expect(screen.queryByText(/Reservamos uma vaga/)).not.toBeInTheDocument();
    // A inscrição foi registrada (na fila), então o carrinho é esvaziado
    expect(removerItemDoCarrinho).toHaveBeenCalledWith(10);
  });

  test('se só um curso estiver lotado, conclui a compra e avisa da lista de espera dele', async () => {
    logarAluno();
    criarInscricao.mockImplementation((idAluno, idTurma) =>
      Promise.resolve({ data: { status: idTurma === 200 ? 'aguardando_vaga' : 'pendente_pagamento' } })
    );
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    expect(screen.getByText(/Reservamos uma vaga/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('as turmas de "Curso Sem Imagem" estão cheias');
  });

  test('sem lista de espera, não mostra o aviso da fila', async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');

    fireEvent.click(screen.getByText('Pix'));
    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    expect(screen.queryByText(/Lista de espera/)).not.toBeInTheDocument();
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

describe('pagamento dividido em duas formas', () => {
  const dividir = async () => {
    logarAluno();
    renderizar(<Carrinho />);
    await screen.findByText('Meu carrinho');
    fireEvent.click(screen.getByText('Pagar com duas formas (ex.: dois cartões)'));
  };
  const formasDa = (parte) => within(screen.getByRole('group', { name: `Forma de pagamento da ${parte}` }));
  const digitarValor = (valor) => fireEvent.change(screen.getByLabelText('Valor'), { target: { value: valor } });

  test('dois cartões: o restante vai sozinho para o segundo', async () => {
    await dividir();
    const concluir = screen.getByText('CONCLUIR INSCRIÇÃO');
    expect(concluir).toBeDisabled();

    digitarValor('1500');
    // Pedido de R$ 18.000: R$ 16.500 no segundo cartão
    expect(textoSemEspacoEspecial(screen.getByLabelText('Restante'))).toBe('R$ 16.500,00');
    const [parcelas1, parcelas2] = screen.getAllByLabelText('Parcelas');
    fireEvent.change(parcelas1, { target: { value: '10' } });
    fireEvent.change(parcelas2, { target: { value: '5' } });
    expect(textoSemEspacoEspecial(resumo().getByLabelText('Como fica o pagamento'))).toContain('Cartão · 10x de R$ 150,00');
    expect(concluir).toBeEnabled();

    fireEvent.click(concluir);

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    const partes = [
      { forma: 'cartao', parcelas: 10, valor: 1500 },
      { forma: 'cartao', parcelas: 5, valor: 16500 },
    ];
    expect(criarInscricao).toHaveBeenCalledWith('7', 100, 12000, expect.stringContaining('Cartão de crédito · 10x'), partes);
    expect(criarInscricao).toHaveBeenCalledWith('7', 200, 6000, expect.any(String), partes);
    expect(screen.getByText('Pagamento dividido em duas formas')).toBeInTheDocument();
    expect(textoSemEspacoEspecial(screen.getByText(/5x de/).closest('li'))).toContain('Cartão · 5x de R$ 3.300,00');
    expect(screen.getAllByText(/cobrança no cartão/)).toHaveLength(1);
  });

  test('parte no Pix ganha o desconto só nela', async () => {
    await dividir();

    fireEvent.click(formasDa('1ª forma').getByText('Pix'));
    fireEvent.click(formasDa('2ª forma').getByText('Boleto'));
    digitarValor('1000');

    expect(screen.getByText(/Com 5% de desconto no Pix/)).toBeInTheDocument();
    expect(textoSemEspacoEspecial(resumo().getByText('Desconto Pix (5%)').parentElement)).toContain('- R$ 50,00');
    expect(textoSemEspacoEspecial(resumo().getByText('Total').parentElement)).toContain('R$ 17.950,00');
    // O Pix é à vista: só o boleto tem parcelas
    expect(screen.getAllByLabelText('Parcelas')).toHaveLength(1);

    fireEvent.click(screen.getByText('CONCLUIR INSCRIÇÃO'));

    expect(await screen.findByText('Inscrição concluída!')).toBeInTheDocument();
    expect(criarInscricao).toHaveBeenCalledWith('7', 100, expect.any(Number), expect.stringContaining('Pix à vista'), [
      { forma: 'pix', parcelas: 1, valor: 1000 },
      { forma: 'boleto', parcelas: 24, valor: 17000 },
    ]);
    expect(screen.getByText(/código Pix/)).toBeInTheDocument();
    expect(screen.getByText(/boletos serão enviados/)).toBeInTheDocument();
    expect(screen.getByText(/Pix · à vista/)).toBeInTheDocument();
  });

  test('valor que não serve bloqueia a conclusão e dá para voltar para uma forma só', async () => {
    await dividir();

    digitarValor('18000');
    expect(screen.getByRole('alert')).toHaveTextContent('precisa ser menor que o total do pedido');
    expect(screen.getByText('CONCLUIR INSCRIÇÃO')).toBeDisabled();
    expect(screen.getByText('—')).toBeInTheDocument();

    digitarValor('0');
    expect(screen.getByRole('alert')).toHaveTextContent('maior que zero');

    fireEvent.click(screen.getByText('Voltar para uma forma só'));
    expect(screen.getByText('Escolha uma opção para continuar.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument();
    expect(criarInscricao).not.toHaveBeenCalled();
  });

  test('sem valor digitado, só a dica aparece (sem mensagem de erro)', async () => {
    await dividir();

    expect(screen.getByText(/O restante vai para a 2ª automaticamente/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: '24x' }).length).toBeGreaterThan(0);
  });

  test('ao remover um curso, as parcelas da divisão respeitam o novo limite', async () => {
    await dividir();
    digitarValor('1000');
    const [parcelas1] = screen.getAllByLabelText('Parcelas');
    expect(parcelas1).toHaveValue('24');

    listarItensDoCarrinho.mockResolvedValue([itens[1]]);
    fireEvent.click(screen.getAllByText('Remover')[0]);

    await waitFor(() => expect(screen.getAllByLabelText('Parcelas')[0]).toHaveValue('12'));
  });
});

