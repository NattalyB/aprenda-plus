import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import MinhasInscricoes from './MinhasInscricoes';
import { renderizar, logarAluno } from '../testUtils';
import { listarMinhasInscricoes, trocarTurmaDaInscricao } from '../services/inscricaoService';
import { listarTurmasDisponiveis } from '../services/turmaService';
import { mostrarAviso } from '../services/avisoService';
import { listarMinhasParcelas } from '../services/financeiroService';
import { listarMeusDocumentos } from '../services/documentoService';

jest.mock('../services/inscricaoService');
jest.mock('../services/turmaService');
jest.mock('../services/avisoService');
jest.mock('../services/financeiroService');
jest.mock('../services/documentoService', () => ({
  ...jest.requireActual('../services/documentoService'),
  listarMeusDocumentos: jest.fn(),
}));

const inscricao = (dados = {}) => ({
  idInscricao: 10,
  idCurso: 2,
  curso: 'Redes de Computadores',
  idTurma: 3,
  turma: 'Turma A - Noite',
  modalidade: 'Presencial',
  diasHorarios: 'Seg a Qua 19h-22h',
  status: 'pendente_pagamento',
  formaPagamento: 'Pix à vista (5% de desconto)',
  valorTotal: 9500,
  dataInscricao: '2026-10-11T14:50:59',
  podeTrocarTurma: true,
  ...dados,
});

const turmasDoCurso = [
  { idTurma: 3, nome: 'Turma A - Noite', diasHorarios: 'Seg a Qua 19h-22h', modalidade: 'Presencial', vagasRestantes: 4 },
  { idTurma: 4, nome: 'Turma B - Manhã', diasHorarios: 'Ter e Qui 8h-12h', modalidade: 'Presencial', periodoLetivo: '2026/2', vagasRestantes: 1 },
  { idTurma: 5, nome: 'Turma C - Sábado', diasHorarios: 'Sáb 8h-12h', vagasRestantes: 0 },
  { idTurma: 6, nome: 'Turma D - EAD', vagasRestantes: 12 },
];

const card = () => screen.getByText('Redes de Computadores').closest('li');

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  listarMinhasInscricoes.mockResolvedValue([inscricao()]);
  listarTurmasDisponiveis.mockResolvedValue(turmasDoCurso);
  listarMinhasParcelas.mockResolvedValue([]);
  listarMeusDocumentos.mockResolvedValue({ data: [] });
});

describe('estados da página', () => {
  test('inscrição na lista de espera explica o que acontece', async () => {
    logarAluno();
    listarMinhasInscricoes.mockResolvedValue([inscricao({ status: 'aguardando_vaga' })]);
    renderizar(<MinhasInscricoes />);

    await screen.findByText('Redes de Computadores');
    expect(within(card()).getByText('Aguardando vaga')).toBeInTheDocument();
    expect(within(card()).getByText(/Você está na lista de espera desta turma/)).toBeInTheDocument();
  });

  test('inscrição com vaga garantida não mostra o aviso da fila', async () => {
    logarAluno();
    renderizar(<MinhasInscricoes />);

    await screen.findByText('Redes de Computadores');
    expect(screen.queryByText(/lista de espera/)).not.toBeInTheDocument();
  });

  test('sem login, pede para entrar', () => {
    renderizar(<MinhasInscricoes />);

    expect(screen.getByText('Faça login para ver suas inscrições')).toBeInTheDocument();
    expect(listarMinhasInscricoes).not.toHaveBeenCalled();
  });

  test('carregando e depois a lista', async () => {
    logarAluno();
    renderizar(<MinhasInscricoes />);

    expect(screen.getByText('Carregando suas inscrições...')).toBeInTheDocument();
    expect(await screen.findByText('Redes de Computadores')).toBeInTheDocument();
  });

  test('sem inscrições, convida a ver os cursos', async () => {
    logarAluno();
    listarMinhasInscricoes.mockResolvedValue([]);
    renderizar(<MinhasInscricoes />);

    expect(await screen.findByText('Você ainda não tem inscrições')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cursos' })).toBeInTheDocument();
  });

  test('erro ao carregar', async () => {
    logarAluno();
    listarMinhasInscricoes.mockRejectedValue(new Error('offline'));
    renderizar(<MinhasInscricoes />);

    expect(await screen.findByText('Não foi possível carregar suas inscrições.')).toBeInTheDocument();
  });
});

describe('detalhes da inscrição', () => {
  test('mostra curso, status, turma, horário, pagamento e data', async () => {
    logarAluno();
    renderizar(<MinhasInscricoes />);
    await screen.findByText('Redes de Computadores');

    const c = within(card());
    expect(c.getByText('Pendente de pagamento')).toBeInTheDocument();
    expect(c.getByText('Turma A - Noite')).toBeInTheDocument();
    expect(c.getByText('Seg a Qua 19h-22h · Presencial')).toBeInTheDocument();
    expect(c.getByText(/Total de R\$\s9\.500,00/)).toBeInTheDocument();
    expect(c.getByText('11/10/2026')).toBeInTheDocument();
  });

  test('dados que faltam aparecem de forma neutra', async () => {
    logarAluno();
    listarMinhasInscricoes.mockResolvedValue([
      inscricao({
        curso: null, turma: null, diasHorarios: null, modalidade: null, formaPagamento: null,
        valorTotal: null, dataInscricao: null, status: 'status_novo', podeTrocarTurma: false,
      }),
    ]);
    renderizar(<MinhasInscricoes />);

    expect(await screen.findByText('Curso')).toBeInTheDocument();
    expect(screen.getByText('A definir')).toBeInTheDocument();
    expect(screen.getByText('status_novo')).toBeInTheDocument();
    expect(screen.queryByText('Inscrição feita em')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar de turma' })).not.toBeInTheDocument();
  });
});

describe('troca de turma', () => {
  const abrirTroca = async () => {
    logarAluno();
    renderizar(<MinhasInscricoes />);
    await screen.findByText('Redes de Computadores');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar de turma' }));
    await screen.findByText('Escolha sua nova turma');
  };

  test('lista só as outras turmas com vaga, sem mostrar quantas vagas restam', async () => {
    await abrirTroca();

    expect(listarTurmasDisponiveis).toHaveBeenCalledWith(2);
    // A turma atual e a turma lotada (Turma C) não aparecem
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.queryByText('Turma C - Sábado')).not.toBeInTheDocument();
    expect(screen.getByText('Ter e Qui 8h-12h · Presencial · 2026/2')).toBeInTheDocument();
    expect(screen.getByText('Horário a definir')).toBeInTheDocument();
    expect(screen.queryByText(/vagas?$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Lotada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar troca' })).toBeDisabled();
  });

  test('confirma a troca, atualiza o card e avisa', async () => {
    trocarTurmaDaInscricao.mockResolvedValue(inscricao({ idTurma: 4, turma: 'Turma B - Manhã', diasHorarios: 'Ter e Qui 8h-12h' }));
    await abrirTroca();

    fireEvent.click(screen.getByRole('radio', { name: /Turma B - Manhã/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar troca' }));

    await waitFor(() => expect(trocarTurmaDaInscricao).toHaveBeenCalledWith(10, 4));
    expect(await within(card()).findByText('Turma B - Manhã')).toBeInTheDocument();
    expect(screen.queryByText('Escolha sua nova turma')).not.toBeInTheDocument();
    expect(mostrarAviso).toHaveBeenCalledWith('Pronto! Agora você está na Turma B - Manhã.', 'sucesso');
  });

  test('se a turma lotar antes de confirmar, mostra a mensagem do servidor', async () => {
    trocarTurmaDaInscricao.mockRejectedValue({ response: { data: { mensagem: 'A turma "Turma B - Manhã" não tem mais vagas.' } } });
    await abrirTroca();

    fireEvent.click(screen.getByRole('radio', { name: /Turma B - Manhã/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar troca' }));

    expect(await screen.findByText('A turma "Turma B - Manhã" não tem mais vagas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar troca' })).toBeEnabled();
  });

  test('erro sem mensagem mostra texto padrão', async () => {
    trocarTurmaDaInscricao.mockRejectedValue(new Error('offline'));
    await abrirTroca();

    fireEvent.click(screen.getByRole('radio', { name: /Turma D - EAD/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar troca' }));

    expect(await screen.findByText('Não foi possível trocar de turma.')).toBeInTheDocument();
  });

  test('cancelar fecha a escolha', async () => {
    await abrirTroca();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Escolha sua nova turma')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar de turma' })).toBeInTheDocument();
  });

  test('só turmas lotadas: avisa que não há outra turma disponível', async () => {
    listarTurmasDisponiveis.mockResolvedValue([turmasDoCurso[0], turmasDoCurso[2]]);
    logarAluno();
    renderizar(<MinhasInscricoes />);
    await screen.findByText('Redes de Computadores');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar de turma' }));

    expect(await screen.findByText('Não há outras turmas disponíveis para este curso no momento.')).toBeInTheDocument();
  });

  test('curso sem outras turmas avisa', async () => {
    listarTurmasDisponiveis.mockResolvedValue([turmasDoCurso[0]]);
    logarAluno();
    renderizar(<MinhasInscricoes />);
    await screen.findByText('Redes de Computadores');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar de turma' }));

    expect(await screen.findByText('Não há outras turmas disponíveis para este curso no momento.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.getByRole('button', { name: 'Trocar de turma' })).toBeInTheDocument();
  });

  test('erro ao carregar as turmas', async () => {
    listarTurmasDisponiveis.mockRejectedValue(new Error('offline'));
    logarAluno();
    renderizar(<MinhasInscricoes />);
    await screen.findByText('Redes de Computadores');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar de turma' }));

    expect(await screen.findByText('Não foi possível carregar as turmas. Tente novamente.')).toBeInTheDocument();
  });

  test('mostra "carregando" enquanto busca as turmas', async () => {
    listarTurmasDisponiveis.mockReturnValue(new Promise(() => {}));
    logarAluno();
    renderizar(<MinhasInscricoes />);
    await screen.findByText('Redes de Computadores');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar de turma' }));

    expect(screen.getByText('Carregando turmas...')).toBeInTheDocument();
  });
});

describe('pagamentos da inscrição', () => {
  test('mostra as parcelas da turma da inscrição', async () => {
    logarAluno('Lucas Almeida');
    listarMinhasParcelas.mockResolvedValue([
      { idPagamento: 1, idTurma: 3, numeroParcela: 1, totalParcelas: 2, valor: 4750, vencimento: '2026-10-19', status: 'pago', dataPagamento: '2026-10-12', curso: 'Redes de Computadores' },
      { idPagamento: 2, idTurma: 3, numeroParcela: 2, totalParcelas: 2, valor: 4750, vencimento: '2026-11-19', status: 'pendente', curso: 'Redes de Computadores' },
      { idPagamento: 3, idTurma: 99, numeroParcela: 1, totalParcelas: 1, valor: 10, vencimento: '2026-11-19', status: 'pendente', curso: 'Outro' },
    ]);
    renderizar(<MinhasInscricoes />);

    await screen.findByText('Redes de Computadores');
    expect(await within(card()).findByText(/1 de 2/)).toBeInTheDocument();
    fireEvent.click(within(card()).getByRole('button', { name: 'Ver parcelas' }));
    expect(within(card()).getAllByText(/Parcela \d\/2/)).toHaveLength(2);
  });

  test('se as parcelas não carregarem, a tela continua funcionando', async () => {
    logarAluno();
    listarMinhasParcelas.mockRejectedValue(new Error('offline'));
    renderizar(<MinhasInscricoes />);

    await screen.findByText('Redes de Computadores');
    expect(screen.queryByText(/parcelas pagas/)).not.toBeInTheDocument();
  });

  test('resposta vazia vira lista vazia', async () => {
    logarAluno();
    listarMinhasParcelas.mockResolvedValue(null);
    renderizar(<MinhasInscricoes />);

    await screen.findByText('Redes de Computadores');
    expect(screen.queryByText('Ver parcelas')).not.toBeInTheDocument();
  });
});


describe('sala de aula', () => {
  test('inscrição confirmada ou concluída tem o atalho para a sala de aula', async () => {
    logarAluno();
    listarMinhasInscricoes.mockResolvedValue([
      inscricao({ status: 'confirmada' }),
      inscricao({ idInscricao: 11, curso: 'Design', idTurma: 8, status: 'concluida' }),
      inscricao({ idInscricao: 12, curso: 'Redes', idTurma: 9, status: 'pendente_pagamento' }),
    ]);
    renderizar(<MinhasInscricoes />);

    await screen.findByText('Redes de Computadores');
    const links = screen.getAllByRole('link', { name: /Entrar na sala de aula/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/sala/3', '/sala/8']);
  });
});
