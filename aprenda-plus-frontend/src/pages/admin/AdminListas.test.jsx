// Testes das telas de LISTAGEM do painel admin:
// carregar, filtrar, excluir e mostrar erros.
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderizar } from '../../testUtils';

import AdminAlunos from './AdminAlunos';
import AdminProfessores from './AdminProfessores';
import AdminCursos from './AdminCursos';
import AdminDisciplinas from './AdminDisciplinas';
import AdminPeriodosLetivos from './AdminPeriodosLetivos';
import AdminTurmas from './AdminTurmas';
import AdminInscricoes from './AdminInscricoes';
import AdminMatriculas from './AdminMatriculas';

import { listarAlunos, deletarAluno } from '../../services/alunoService';
import { listarProfessores, deletarProfessor } from '../../services/professorService';
import { listarCursos, deletarCurso } from '../../services/cursoService';
import { listarDisciplinas, deletarDisciplina } from '../../services/disciplinaService';
import { listarPeriodosLetivos, deletarPeriodoLetivo } from '../../services/periodoLetivoService';
import { listarTurmas, deletarTurma } from '../../services/turmaService';
import { listarInscricoes, atualizarInscricao, deletarInscricao } from '../../services/inscricaoService';
import { listarMatriculas, deletarMatricula } from '../../services/matriculaService';

jest.mock('../../services/alunoService');
jest.mock('../../services/professorService');
jest.mock('../../services/cursoService');
jest.mock('../../services/disciplinaService');
jest.mock('../../services/periodoLetivoService');
jest.mock('../../services/turmaService');
jest.mock('../../services/inscricaoService');
jest.mock('../../services/matriculaService');

const busca = (placeholder, valor) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: valor } });

const seleciona = (name, valor) =>
  fireEvent.change(document.querySelector(`select[name="${name}"]`), { target: { value: valor } });

// Linhas da tabela (sem o cabeçalho)
const linhas = () => screen.getAllByRole('row').slice(1);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => window.confirm.mockRestore());

// ===================================================================
// Testes comuns a todas as listas: carregamento, lista vazia, erro e exclusão
// ===================================================================

const listas = [
  {
    nome: 'Alunos', Pagina: AdminAlunos, listar: listarAlunos, deletar: deletarAluno,
    registro: { idAluno: 5, nomeCompleto: 'Maria Silva', email: 'm@t.com', cpf: '12345678900', status: 'ativo' },
    carregando: 'Carregando alunos...', vazio: 'Nenhum aluno cadastrado ainda.', erro: 'Não foi possível carregar os alunos.',
  },
  {
    nome: 'Professores', Pagina: AdminProfessores, listar: listarProfessores, deletar: deletarProfessor,
    registro: { idProfessor: 5, nomeCompleto: 'João Pereira', email: 'j@t.com', cpf: '98765432100', status: 'ativo' },
    carregando: 'Carregando professores...', vazio: 'Nenhum professor cadastrado ainda.', erro: 'Não foi possível carregar os professores.',
  },
  {
    nome: 'Cursos', Pagina: AdminCursos, listar: listarCursos, deletar: deletarCurso,
    registro: { idCurso: 5, nome: 'Engenharia de Software', categoria: 'superior', modalidade: 'EAD', valor: 48000 },
    carregando: 'Carregando cursos...', vazio: 'Nenhum curso cadastrado ainda.', erro: 'Não foi possível carregar os cursos.',
  },
  {
    nome: 'Disciplinas', Pagina: AdminDisciplinas, listar: listarDisciplinas, deletar: deletarDisciplina,
    registro: { idDisciplina: 5, nome: 'Banco de Dados', cargaHoraria: 80, curso: { idCurso: 1, nome: 'ADS' } },
    carregando: 'Carregando disciplinas...', vazio: 'Nenhuma disciplina cadastrada ainda.', erro: 'Não foi possível carregar as disciplinas.',
  },
  {
    nome: 'Períodos letivos', Pagina: AdminPeriodosLetivos, listar: listarPeriodosLetivos, deletar: deletarPeriodoLetivo,
    registro: { idPeriodoLetivo: 5, nome: '2º Semestre 2026', dataInicio: '2026-08-01', dataFim: '2026-12-15', status: 'ativo' },
    carregando: 'Carregando períodos letivos...', vazio: 'Nenhum período letivo cadastrado ainda.', erro: 'Não foi possível carregar os períodos letivos.',
  },
  {
    nome: 'Turmas', Pagina: AdminTurmas, listar: listarTurmas, deletar: deletarTurma,
    registro: { idTurma: 5, nome: 'Turma A', capacidadeMaxima: 40, status: 'em_andamento', curso: { idCurso: 1, nome: 'ADS' }, periodoLetivo: { nome: '2026/2' } },
    carregando: 'Carregando turmas...', vazio: 'Nenhuma turma cadastrada ainda.', erro: 'Não foi possível carregar as turmas.',
  },
  {
    nome: 'Inscrições', Pagina: AdminInscricoes, listar: listarInscricoes, deletar: deletarInscricao,
    registro: { idInscricao: 5, aluno: { nomeCompleto: 'Maria Silva' }, turma: { nome: 'Turma A' }, valorTotal: 9500, formaPagamento: 'Pix', status: 'pendente_pagamento' },
    carregando: 'Carregando inscrições...', vazio: 'Nenhuma inscrição registrada ainda.', erro: 'Não foi possível carregar as inscrições.',
  },
  {
    nome: 'Matrículas', Pagina: AdminMatriculas, listar: listarMatriculas, deletar: deletarMatricula,
    registro: { idMatricula: 5, aluno: { nomeCompleto: 'Maria Silva', cpf: '12345678900' }, turma: { nome: 'Turma A' }, dataMatricula: '2026-09-30T14:20:00', status: 'ativa' },
    carregando: 'Carregando matrículas...', vazio: 'Nenhuma matrícula registrada ainda.', erro: 'Não foi possível carregar as matrículas.',
  },
];

describe.each(listas)('lista de $nome', ({ Pagina, listar, deletar, registro, carregando, vazio, erro }) => {
  test('mostra "carregando" e depois os registros', async () => {
    listar.mockResolvedValue({ data: [registro] });
    renderizar(<Pagina />);

    expect(screen.getByText(carregando)).toBeInTheDocument();
    await waitFor(() => expect(linhas()).toHaveLength(1));
    expect(screen.getByText(/1 de 1/)).toBeInTheDocument();
  });

  test('lista vazia mostra mensagem', async () => {
    listar.mockResolvedValue({ data: [] });
    renderizar(<Pagina />);

    expect(await screen.findByText(vazio)).toBeInTheDocument();
  });

  test('erro ao carregar mostra mensagem', async () => {
    listar.mockRejectedValue(new Error('offline'));
    renderizar(<Pagina />);

    expect(await screen.findByText(erro)).toBeInTheDocument();
  });

  test('excluir pede confirmação, apaga e recarrega a lista', async () => {
    listar.mockResolvedValue({ data: [registro] });
    deletar.mockResolvedValue({});
    renderizar(<Pagina />);
    await waitFor(() => expect(linhas()).toHaveLength(1));

    fireEvent.click(screen.getByText('Excluir'));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
    expect(deletar).toHaveBeenCalledWith(5);
  });

  test('se cancelar a confirmação, não exclui', async () => {
    window.confirm.mockReturnValue(false);
    listar.mockResolvedValue({ data: [registro] });
    renderizar(<Pagina />);
    await waitFor(() => expect(linhas()).toHaveLength(1));

    fireEvent.click(screen.getByText('Excluir'));

    expect(deletar).not.toHaveBeenCalled();
  });
});

// ===================================================================
// Filtros de cada lista
// ===================================================================

describe('Alunos: busca por nome ou CPF', () => {
  const alunos = [
    { idAluno: 1, nomeCompleto: 'João Souza', cpf: '11122233344', status: 'ativo' },
    { idAluno: 2, nomeCompleto: 'Maria Silva', cpf: '55566677788', status: 'bloqueado' },
  ];

  beforeEach(() => listarAlunos.mockResolvedValue({ data: alunos }));

  test('mostra o CPF formatado e o status', async () => {
    renderizar(<AdminAlunos />);
    expect(await screen.findByText('111.222.333-44')).toBeInTheDocument();
    expect(screen.getByText('bloqueado')).toHaveClass('status-bloqueado');
  });

  test('busca pelo nome sem acento', async () => {
    renderizar(<AdminAlunos />);
    await screen.findByText('João Souza');

    busca('Buscar por nome ou CPF...', 'joao');

    expect(linhas()).toHaveLength(1);
    expect(screen.getByText('1 de 2 aluno(s)')).toBeInTheDocument();
  });

  test('busca pelo CPF com ou sem pontuação', async () => {
    renderizar(<AdminAlunos />);
    await screen.findByText('João Souza');

    busca('Buscar por nome ou CPF...', '555.666');
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.queryByText('João Souza')).not.toBeInTheDocument();
  });

  test('busca sem resultado', async () => {
    renderizar(<AdminAlunos />);
    await screen.findByText('João Souza');

    busca('Buscar por nome ou CPF...', 'Pedro');
    expect(screen.getByText('Nenhum aluno encontrado para essa busca.')).toBeInTheDocument();
  });
});

describe('Professores: busca por nome ou CPF', () => {
  beforeEach(() =>
    listarProfessores.mockResolvedValue({
      data: [
        { idProfessor: 1, nomeCompleto: 'Ana Lúcia', cpf: '12345678900', status: 'ativo' },
        { idProfessor: 2, nomeCompleto: 'Bruno Lima', cpf: '99988877766', status: 'inativo' },
      ],
    })
  );

  test('filtra por nome e por CPF', async () => {
    renderizar(<AdminProfessores />);
    await screen.findByText('Ana Lúcia');

    busca('Buscar por nome ou CPF...', 'lucia');
    expect(linhas()).toHaveLength(1);

    busca('Buscar por nome ou CPF...', '999');
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();

    busca('Buscar por nome ou CPF...', 'zzz');
    expect(screen.getByText('Nenhum professor encontrado para essa busca.')).toBeInTheDocument();
  });
});

describe('Cursos: busca e categoria', () => {
  beforeEach(() =>
    listarCursos.mockResolvedValue({
      data: [
        { idCurso: 1, nome: 'Ciência de Dados', categoria: 'superior', valor: 12000 },
        { idCurso: 2, nome: 'Design Gráfico', categoria: 'profissionalizante', valor: 6500 },
      ],
    })
  );

  test('filtra pela categoria', async () => {
    renderizar(<AdminCursos />);
    await screen.findByText('Ciência de Dados');

    fireEvent.click(screen.getByRole('button', { name: 'Profissionalizante' }));
    expect(linhas()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Profissionalizante' })).toHaveClass('ativo');

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(linhas()).toHaveLength(2);
  });

  test('busca pelo nome e combina com a categoria', async () => {
    renderizar(<AdminCursos />);
    await screen.findByText('Ciência de Dados');

    busca('Buscar curso pelo nome...', 'ciencia');
    expect(linhas()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Profissionalizante' }));
    expect(screen.getByText('Nenhum curso encontrado com esses filtros.')).toBeInTheDocument();
  });

  test('mostra o valor em reais', async () => {
    renderizar(<AdminCursos />);
    expect(await screen.findByText(/12\.000,00/)).toBeInTheDocument();
  });
});

describe('Disciplinas: busca e curso', () => {
  beforeEach(() =>
    listarDisciplinas.mockResolvedValue({
      data: [
        { idDisciplina: 1, nome: 'Banco de Dados', cargaHoraria: 80, curso: { idCurso: 1, nome: 'ADS' } },
        { idDisciplina: 2, nome: 'Estatística', cargaHoraria: 60, curso: { idCurso: 2, nome: 'Ciência de Dados' } },
        { idDisciplina: 3, nome: 'Lógica', cargaHoraria: 40, curso: { idCurso: 1, nome: 'ADS' } },
        { idDisciplina: 4, nome: 'Sem curso', cargaHoraria: 10 },
      ],
    })
  );

  test('o seletor lista cada curso uma vez só e filtra', async () => {
    renderizar(<AdminDisciplinas />);
    await screen.findByText('Banco de Dados');

    const opcoes = document.querySelectorAll('select[name="filtroCurso"] option');
    expect(opcoes).toHaveLength(3); // "Todos os cursos" + ADS + Ciência de Dados

    seleciona('filtroCurso', '1');
    expect(linhas()).toHaveLength(2);
  });

  test('busca pelo nome', async () => {
    renderizar(<AdminDisciplinas />);
    await screen.findByText('Banco de Dados');

    busca('Buscar disciplina pelo nome...', 'estatistica');
    expect(linhas()).toHaveLength(1);

    busca('Buscar disciplina pelo nome...', 'xyz');
    expect(screen.getByText('Nenhuma disciplina encontrada com esses filtros.')).toBeInTheDocument();
  });
});

describe('Períodos letivos: busca, status e datas', () => {
  beforeEach(() =>
    listarPeriodosLetivos.mockResolvedValue({
      data: [
        { idPeriodoLetivo: 1, nome: '1º Semestre 2026', dataInicio: '2026-02-01', dataFim: '2026-06-30', status: 'encerrado' },
        { idPeriodoLetivo: 2, nome: '2º Semestre 2026', dataInicio: '2026-08-01', dataFim: null, status: 'ativo' },
      ],
    })
  );

  test('mostra as datas no formato brasileiro', async () => {
    renderizar(<AdminPeriodosLetivos />);
    expect(await screen.findByText('01/02/2026')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  test('filtra pelo status e pela busca', async () => {
    renderizar(<AdminPeriodosLetivos />);
    await screen.findByText('1º Semestre 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Encerrado' }));
    expect(linhas()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    busca('Buscar período pelo nome...', '2º');
    expect(screen.getByText('2º Semestre 2026')).toBeInTheDocument();

    busca('Buscar período pelo nome...', 'xyz');
    expect(screen.getByText('Nenhum período encontrado com esses filtros.')).toBeInTheDocument();
  });
});

describe('Turmas: busca, curso e status', () => {
  beforeEach(() =>
    listarTurmas.mockResolvedValue({
      data: [
        { idTurma: 1, nome: 'Turma A - Noite', status: 'inscricoes_abertas', curso: { idCurso: 1, nome: 'ADS' }, periodoLetivo: { nome: '2026/2' } },
        { idTurma: 2, nome: 'Turma B - Manhã', status: 'encerrada', curso: { idCurso: 2, nome: 'Design' } },
        { idTurma: 3, nome: 'Turma C', status: 'status_novo' },
      ],
    })
  );

  test('mostra o status com nome legível', async () => {
    renderizar(<AdminTurmas />);
    expect(await screen.findByText('Inscrições abertas', { selector: 'span' })).toBeInTheDocument();
    // Status desconhecido aparece como veio do banco
    expect(screen.getByText('status_novo')).toBeInTheDocument();
  });

  test('filtra por curso, status e nome', async () => {
    renderizar(<AdminTurmas />);
    await screen.findByText('Turma A - Noite');

    seleciona('filtroCurso', '2');
    expect(linhas()).toHaveLength(1);

    seleciona('filtroCurso', '');
    seleciona('filtroStatus', 'inscricoes_abertas');
    expect(linhas()).toHaveLength(1);

    seleciona('filtroStatus', '');
    busca('Buscar turma pelo nome...', 'manha');
    expect(screen.getByText('Turma B - Manhã')).toBeInTheDocument();

    busca('Buscar turma pelo nome...', 'xyz');
    expect(screen.getByText('Nenhuma turma encontrada com esses filtros.')).toBeInTheDocument();
  });
});

describe('Inscrições: status, forma de pagamento e filtros', () => {
  const inscricoes = [
    { idInscricao: 1, aluno: { nomeCompleto: 'Maria Silva' }, turma: { nome: 'Turma A' }, valorTotal: 9500, formaPagamento: 'Pix à vista (5% de desconto)', status: 'pendente_pagamento' },
    { idInscricao: 2, aluno: { nomeCompleto: 'João Souza' }, turma: { nome: 'Turma B' }, valorTotal: 6000, status: 'confirmada' },
  ];

  beforeEach(() => listarInscricoes.mockResolvedValue({ data: inscricoes }));

  test('mostra a forma de pagamento escolhida', async () => {
    renderizar(<AdminInscricoes />);
    expect(await screen.findByText('Pix à vista (5% de desconto)')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  test('trocar o status salva na hora', async () => {
    atualizarInscricao.mockResolvedValue({});
    renderizar(<AdminInscricoes />);
    await screen.findByText('Maria Silva');

    fireEvent.change(document.querySelector('select[name="status-1"]'), { target: { value: 'confirmada' } });

    await waitFor(() => expect(atualizarInscricao).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'confirmada' })));
    await waitFor(() => expect(listarInscricoes).toHaveBeenCalledTimes(2));
  });

  test('erro ao trocar o status mostra mensagem', async () => {
    atualizarInscricao.mockRejectedValue(new Error('falhou'));
    renderizar(<AdminInscricoes />);
    await screen.findByText('Maria Silva');

    fireEvent.change(document.querySelector('select[name="status-1"]'), { target: { value: 'cancelada' } });

    expect(await screen.findByText('Não foi possível atualizar o status da inscrição.')).toBeInTheDocument();
  });

  test('filtra por aluno, turma e status', async () => {
    renderizar(<AdminInscricoes />);
    await screen.findByText('Maria Silva');

    busca('Buscar por aluno ou turma...', 'joao');
    expect(linhas()).toHaveLength(1);

    busca('Buscar por aluno ou turma...', 'turma a');
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();

    busca('Buscar por aluno ou turma...', '');
    seleciona('filtroStatus', 'confirmada');
    expect(linhas()).toHaveLength(1);

    busca('Buscar por aluno ou turma...', 'xyz');
    expect(screen.getByText('Nenhuma inscrição encontrada com esses filtros.')).toBeInTheDocument();
  });
});

describe('Matrículas: busca e status', () => {
  beforeEach(() =>
    listarMatriculas.mockResolvedValue({
      data: [
        { idMatricula: 1, aluno: { nomeCompleto: 'Maria Silva', cpf: '12345678900' }, turma: { nome: 'Turma A' }, dataMatricula: '2026-09-30T14:20:00', status: 'ativa' },
        { idMatricula: 2, aluno: { nomeCompleto: 'João Souza', cpf: '99988877766' }, turma: { nome: 'Turma B' }, dataMatricula: null, status: 'trancada' },
        { idMatricula: 3, status: 'outro' },
      ],
    })
  );

  test('mostra data formatada e status legível', async () => {
    renderizar(<AdminMatriculas />);
    expect(await screen.findByText('30/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Trancada', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('outro')).toBeInTheDocument();
  });

  test('busca por nome, CPF ou turma e filtra por status', async () => {
    renderizar(<AdminMatriculas />);
    await screen.findByText('Maria Silva');

    busca('Buscar por aluno, CPF ou turma...', '999.888');
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(linhas()).toHaveLength(1);

    busca('Buscar por aluno, CPF ou turma...', 'turma a');
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();

    busca('Buscar por aluno, CPF ou turma...', '');
    fireEvent.click(screen.getByRole('button', { name: 'Trancada' }));
    expect(linhas()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    busca('Buscar por aluno, CPF ou turma...', 'xyz');
    expect(screen.getByText('Nenhuma matrícula encontrada com esses filtros.')).toBeInTheDocument();
  });
});
