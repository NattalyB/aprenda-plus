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
import * as funcionarioService from './funcionarioService';
import * as financeiroService from './financeiroService';
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
  ['funcionarios', funcionarioService.listarFuncionarios, funcionarioService.buscarFuncionarioPorId, funcionarioService.criarFuncionario, funcionarioService.atualizarFuncionario, funcionarioService.deletarFuncionario],
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
    expect(authAdminService.getAcessoAdmin()).toBeNull();
  });

  test('o login guarda o nível e os módulos do funcionário', () => {
    authAdminService.salvarSessaoAdmin({
      token: 't', idFuncionario: 3, nome: 'Carla', cargo: 'financeiro',
      nivel: 'Financeiro', master: false, modulos: ['matriculas'],
    });

    expect(authAdminService.getAcessoAdmin()).toEqual({ nivel: 'Financeiro', master: false, modulos: ['matriculas'] });
  });

  test('acesso vazio, sem lista ou quebrado', () => {
    authAdminService.salvarAcessoAdmin(null);
    expect(authAdminService.getAcessoAdmin()).toEqual({ nivel: null, master: false, modulos: [] });

    localStorage.setItem('acessoAdmin', JSON.stringify({ nivel: 'X' }));
    expect(authAdminService.getAcessoAdmin()).toBeNull();

    localStorage.setItem('acessoAdmin', '{quebrado');
    expect(authAdminService.getAcessoAdmin()).toBeNull();

    localStorage.removeItem('acessoAdmin');
    expect(authAdminService.getAcessoAdmin()).toBeNull();
  });

  test('busca o próprio nível no servidor', async () => {
    api.get.mockResolvedValue({ data: { nivel: 'Master', master: true, modulos: [] } });

    expect(await authAdminService.buscarMeuAcesso()).toEqual({ nivel: 'Master', master: true, modulos: [] });
    expect(api.get).toHaveBeenCalledWith('/niveis-acesso/meu');
  });
});

describe('níveis de acesso (módulo Sistema)', () => {
  test('rotas de listar, criar, editar e excluir', () => {
    funcionarioService.listarNiveis();
    funcionarioService.criarNivel({ nome: 'X' });
    funcionarioService.atualizarNivel(4, { nome: 'Y' });
    funcionarioService.deletarNivel(4);

    expect(api.get).toHaveBeenCalledWith('/niveis-acesso');
    expect(api.post).toHaveBeenCalledWith('/niveis-acesso', { nome: 'X' });
    expect(api.put).toHaveBeenCalledWith('/niveis-acesso/4', { nome: 'Y' });
    expect(api.delete).toHaveBeenCalledWith('/niveis-acesso/4');
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

describe('cursos e disciplinas do professor', () => {
  test('buscar usa GET /professores/{id}/vinculos', () => {
    professorService.buscarVinculosProfessor(4);
    expect(api.get).toHaveBeenCalledWith('/professores/4/vinculos');
  });

  test('salvar usa PUT com os ids dos cursos e disciplinas', () => {
    professorService.salvarVinculosProfessor(4, { cursos: [1], disciplinas: [10] });
    expect(api.put).toHaveBeenCalledWith('/professores/4/vinculos', { cursos: [1], disciplinas: [10] });
  });
});

describe('área do aluno e turmas disponíveis', () => {
  test('turmas disponíveis de um curso', async () => {
    api.get.mockResolvedValue({ data: [{ idTurma: 3, vagasRestantes: 4 }] });

    const turmas = await turmaService.listarTurmasDisponiveis(2);

    expect(api.get).toHaveBeenCalledWith('/turmas/curso/2/disponiveis');
    expect(turmas).toEqual([{ idTurma: 3, vagasRestantes: 4 }]);
  });

  test('minhas inscrições', async () => {
    api.get.mockResolvedValue({ data: [{ idInscricao: 10 }] });

    expect(await inscricaoService.listarMinhasInscricoes()).toEqual([{ idInscricao: 10 }]);
    expect(api.get).toHaveBeenCalledWith('/inscricoes/minhas');
  });

  test('trocar turma manda só o id da nova turma', async () => {
    api.put.mockResolvedValue({ data: { idInscricao: 10, idTurma: 4 } });

    expect(await inscricaoService.trocarTurmaDaInscricao(10, 4)).toEqual({ idInscricao: 10, idTurma: 4 });
    expect(api.put).toHaveBeenCalledWith('/inscricoes/10/turma', { idTurma: 4 });
  });
});

describe('financeiroService', () => {
  test('rotas do financeiro devolvem os dados da resposta', async () => {
    api.get.mockResolvedValue({ data: ['ok'] });
    api.put.mockResolvedValue({ data: { status: 'pago' } });
    api.post.mockResolvedValue({ data: { matriculas: 2 } });

    expect(await financeiroService.listarParcelas()).toEqual(['ok']);
    expect(await financeiroService.buscarResumoFinanceiro()).toEqual(['ok']);
    expect(await financeiroService.buscarAlertasFinanceiros()).toEqual(['ok']);
    expect(await financeiroService.listarMinhasParcelas()).toEqual(['ok']);
    expect(await financeiroService.registrarPagamentoDaParcela(5, { dataPagamento: '2026-10-12' })).toEqual({ status: 'pago' });
    expect(await financeiroService.estornarParcela(5)).toEqual({ status: 'pago' });
    expect(await financeiroService.gerarParcelasQueFaltam()).toEqual({ matriculas: 2 });

    expect(api.get).toHaveBeenCalledWith('/financeiro/parcelas');
    expect(api.get).toHaveBeenCalledWith('/financeiro/resumo');
    expect(api.get).toHaveBeenCalledWith('/financeiro/alertas');
    expect(api.get).toHaveBeenCalledWith('/financeiro/meus');
    expect(api.put).toHaveBeenCalledWith('/financeiro/parcelas/5/pagamento', { dataPagamento: '2026-10-12' });
    expect(api.put).toHaveBeenCalledWith('/financeiro/parcelas/5/estorno');
    expect(api.post).toHaveBeenCalledWith('/financeiro/gerar-parcelas');
  });
});

