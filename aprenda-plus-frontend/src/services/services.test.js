import api from './api';
import * as alunoService from './alunoService';
import * as professorService from './professorService';
import * as cursoService from './cursoService';
import * as disciplinaService from './disciplinaService';
import * as periodoLetivoService from './periodoLetivoService';
import * as turmaService from './turmaService';
import * as matriculaService from './matriculaService';
import * as inscricaoService from './inscricaoService';
import * as authService from './authService';
import * as authAdminService from './authAdminService';
import * as carrinhoService from './carrinhoService';
import { mostrarAviso } from './avisoService';

// Troca o axios de verdade por funções de mentira: nenhuma requisição sai do computador
jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({});
});

// ===== Cadastros (CRUD): todos seguem o mesmo padrão de rotas =====

const cadastros = [
  ['alunos', alunoService.listarAlunos, alunoService.buscarAlunoPorId, alunoService.criarAluno, alunoService.atualizarAluno, alunoService.deletarAluno],
  ['professores', professorService.listarProfessores, professorService.buscarProfessorPorId, professorService.criarProfessor, professorService.atualizarProfessor, professorService.deletarProfessor],
  ['cursos', cursoService.listarCursos, cursoService.buscarCursoPorId, cursoService.criarCurso, cursoService.atualizarCurso, cursoService.deletarCurso],
  ['disciplinas', disciplinaService.listarDisciplinas, disciplinaService.buscarDisciplinaPorId, disciplinaService.criarDisciplina, disciplinaService.atualizarDisciplina, disciplinaService.deletarDisciplina],
  ['periodos-letivos', periodoLetivoService.listarPeriodosLetivos, periodoLetivoService.buscarPeriodoLetivoPorId, periodoLetivoService.criarPeriodoLetivo, periodoLetivoService.atualizarPeriodoLetivo, periodoLetivoService.deletarPeriodoLetivo],
  ['turmas', turmaService.listarTurmas, turmaService.buscarTurmaPorId, turmaService.criarTurma, turmaService.atualizarTurma, turmaService.deletarTurma],
  ['matriculas', matriculaService.listarMatriculas, matriculaService.buscarMatriculaPorId, matriculaService.criarMatricula, matriculaService.atualizarMatricula, matriculaService.deletarMatricula],
];

describe.each(cadastros)('service de %s', (rota, listar, buscar, criar, atualizar, deletar) => {
  test('listar usa GET /' + rota, () => {
    listar();
    expect(api.get).toHaveBeenCalledWith(`/${rota}`);
  });

  test('buscar por id usa GET /' + rota + '/{id}', () => {
    buscar(3);
    expect(api.get).toHaveBeenCalledWith(`/${rota}/3`);
  });

  test('criar usa POST com os dados', () => {
    criar({ nome: 'Novo' });
    expect(api.post).toHaveBeenCalledWith(`/${rota}`, { nome: 'Novo' });
  });

  test('atualizar usa PUT /' + rota + '/{id}', () => {
    atualizar(3, { nome: 'Editado' });
    expect(api.put).toHaveBeenCalledWith(`/${rota}/3`, { nome: 'Editado' });
  });

  test('excluir usa DELETE /' + rota + '/{id}', () => {
    deletar(3);
    expect(api.delete).toHaveBeenCalledWith(`/${rota}/3`);
  });
});

// ===== Cursos: turmas de um curso =====

test('buscarTurmasPorCurso devolve só as turmas daquele curso', async () => {
  api.get.mockResolvedValue({
    data: [
      { idTurma: 1, curso: { idCurso: 10 } },
      { idTurma: 2, curso: { idCurso: 20 } },
      { idTurma: 3, curso: { idCurso: 10 } },
      { idTurma: 4 },
    ],
  });

  const turmas = await cursoService.buscarTurmasPorCurso(10);

  expect(api.get).toHaveBeenCalledWith('/turmas');
  expect(turmas.map((t) => t.idTurma)).toEqual([1, 3]);
});

// ===== Inscrições =====

describe('service de inscrições', () => {
  test('criarInscricao envia aluno, turma, valor e forma de pagamento', () => {
    inscricaoService.criarInscricao(7, 2, 9500, 'Pix à vista (5% de desconto)');

    expect(api.post).toHaveBeenCalledWith('/inscricoes', {
      aluno: { idAluno: 7 },
      turma: { idTurma: 2 },
      valorTotal: 9500,
      formaPagamento: 'Pix à vista (5% de desconto)',
    });
  });

  test('sem forma de pagamento, envia "A definir"', () => {
    inscricaoService.criarInscricao(7, 2, 100);
    expect(api.post.mock.calls[0][1].formaPagamento).toBe('A definir');
  });

  test('demais rotas', () => {
    inscricaoService.listarInscricoes();
    inscricaoService.buscarInscricaoPorId(5);
    inscricaoService.atualizarInscricao(5, { status: 'confirmada' });
    inscricaoService.deletarInscricao(5);

    expect(api.get).toHaveBeenCalledWith('/inscricoes');
    expect(api.get).toHaveBeenCalledWith('/inscricoes/5');
    expect(api.put).toHaveBeenCalledWith('/inscricoes/5', { status: 'confirmada' });
    expect(api.delete).toHaveBeenCalledWith('/inscricoes/5');
  });
});

// ===== Login do aluno =====

describe('authService (aluno)', () => {
  test('login envia e-mail e senha', () => {
    authService.login('maria@teste.com', '123');
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'maria@teste.com', senha: '123' });
  });

  test('salvar sessão, consultar e sair', () => {
    expect(authService.estaLogado()).toBe(false);

    authService.salvarSessao({ token: 'abc', idAluno: 7, nome: 'Maria Silva' });

    expect(authService.estaLogado()).toBe(true);
    expect(authService.getNomeAluno()).toBe('Maria Silva');
    expect(localStorage.getItem('idAluno')).toBe('7');

    authService.logout();

    expect(authService.estaLogado()).toBe(false);
    expect(authService.getNomeAluno()).toBeNull();
  });
});

// ===== Login do admin =====

describe('authAdminService (funcionário)', () => {
  test('login envia e-mail e senha para a rota de funcionário', () => {
    authAdminService.loginFuncionario('admin@teste.com', 'x');
    expect(api.post).toHaveBeenCalledWith('/auth/login-funcionario', { email: 'admin@teste.com', senha: 'x' });
  });

  test('salvar sessão, consultar e sair', () => {
    expect(authAdminService.estaLogadoAdmin()).toBe(false);

    authAdminService.salvarSessaoAdmin({ token: 't', idFuncionario: 1, nome: 'Admin', cargo: 'administrativo' });

    expect(authAdminService.estaLogadoAdmin()).toBe(true);
    expect(authAdminService.getNomeFuncionario()).toBe('Admin');
    expect(localStorage.getItem('cargoFuncionario')).toBe('administrativo');

    authAdminService.logoutAdmin();

    expect(authAdminService.estaLogadoAdmin()).toBe(false);
  });
});

// ===== Carrinho =====

describe('carrinhoService', () => {
  test('adicionar busca o carrinho do aluno e cria o item nele', async () => {
    api.get.mockResolvedValue({ data: { idCarrinho: 4, idAluno: 7 } });
    api.post.mockResolvedValue({ data: { idItem: 9 } });
    const aviso = jest.fn();
    window.addEventListener('carrinho-atualizado', aviso);

    const resposta = await carrinhoService.adicionarAoCarrinho(2);

    expect(api.get).toHaveBeenCalledWith('/carrinhos/meu');
    expect(api.post).toHaveBeenCalledWith('/itens-carrinho', {
      carrinho: { idCarrinho: 4 },
      curso: { idCurso: 2 },
    });
    expect(resposta.data.idItem).toBe(9);
    // Avisa o Header pra atualizar o contador
    expect(aviso).toHaveBeenCalledTimes(1);
    window.removeEventListener('carrinho-atualizado', aviso);
  });

  test('listar usa a rota que devolve só os itens do aluno logado', async () => {
    api.get.mockResolvedValue({ data: [{ idItem: 1 }, { idItem: 2 }] });

    const itens = await carrinhoService.listarItensDoCarrinho();

    expect(api.get).toHaveBeenCalledWith('/itens-carrinho/meus');
    expect(itens).toHaveLength(2);
  });

  test('remover apaga o item e avisa o Header', async () => {
    const aviso = jest.fn();
    window.addEventListener('carrinho-atualizado', aviso);

    await carrinhoService.removerItemDoCarrinho(9);

    expect(api.delete).toHaveBeenCalledWith('/itens-carrinho/9');
    expect(aviso).toHaveBeenCalledTimes(1);
    window.removeEventListener('carrinho-atualizado', aviso);
  });
});

// ===== Avisos (toast) =====

test('mostrarAviso dispara o evento com a mensagem e o tipo', () => {
  const ouvinte = jest.fn();
  window.addEventListener('mostrar-aviso', ouvinte);

  mostrarAviso('Curso adicionado!');
  mostrarAviso('Ops', 'erro');

  expect(ouvinte.mock.calls[0][0].detail).toEqual({ mensagem: 'Curso adicionado!', tipo: 'sucesso' });
  expect(ouvinte.mock.calls[1][0].detail).toEqual({ mensagem: 'Ops', tipo: 'erro' });
  window.removeEventListener('mostrar-aviso', ouvinte);
});
