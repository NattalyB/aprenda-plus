// Testes das telas de FORMULÁRIO do painel admin (criar e editar):
// enviar os dados certos, carregar o registro na edição e mostrar erros.
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderizar } from '../../testUtils';

import AdminAlunoForm from './AdminAlunoForm';
import AdminProfessorForm from './AdminProfessorForm';
import AdminCursoForm from './AdminCursoForm';
import AdminDisciplinaForm from './AdminDisciplinaForm';
import AdminPeriodoLetivoForm from './AdminPeriodoLetivoForm';
import AdminTurmaForm from './AdminTurmaForm';
import AdminMatriculaForm from './AdminMatriculaForm';

import { buscarAlunoPorId, criarAluno, atualizarAluno, listarAlunos } from '../../services/alunoService';
import { buscarProfessorPorId, criarProfessor, atualizarProfessor } from '../../services/professorService';
import { buscarCursoPorId, criarCurso, atualizarCurso, listarCursos } from '../../services/cursoService';
import { buscarDisciplinaPorId, criarDisciplina, atualizarDisciplina } from '../../services/disciplinaService';
import { buscarPeriodoLetivoPorId, criarPeriodoLetivo, atualizarPeriodoLetivo, listarPeriodosLetivos } from '../../services/periodoLetivoService';
import { buscarTurmaPorId, criarTurma, atualizarTurma, listarTurmas } from '../../services/turmaService';
import { buscarMatriculaPorId, criarMatricula, atualizarMatricula } from '../../services/matriculaService';

jest.mock('../../services/alunoService');
jest.mock('../../services/professorService');
jest.mock('../../services/cursoService');
jest.mock('../../services/disciplinaService');
jest.mock('../../services/periodoLetivoService');
jest.mock('../../services/turmaService');
jest.mock('../../services/matriculaService');

const digita = (rotulo, valor) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

const salvar = () => fireEvent.submit(screen.getByRole('button', { name: 'SALVAR' }).closest('form'));

const endereco = () => screen.getByTestId('endereco');

// Erro de validação vindo do backend (GlobalExceptionHandler)
const erroDeValidacao = (erros) => ({ response: { status: 400, data: { mensagem: 'Verifique', erros } } });

beforeEach(() => {
  jest.clearAllMocks();
  listarCursos.mockResolvedValue({ data: [{ idCurso: 1, nome: 'ADS' }, { idCurso: 2, nome: 'Design' }] });
  listarPeriodosLetivos.mockResolvedValue({ data: [{ idPeriodoLetivo: 4, nome: '2026/2' }] });
  listarAlunos.mockResolvedValue({ data: [{ idAluno: 7, nomeCompleto: 'Maria Silva', cpf: '12345678900' }] });
  listarTurmas.mockResolvedValue({ data: [{ idTurma: 3, nome: 'Turma A', curso: { nome: 'ADS' } }, { idTurma: 8, nome: 'Turma Z' }] });
});

// ===================================================================
describe('Formulário de aluno', () => {
  test('novo aluno: envia os dados com a senha e volta pra lista', async () => {
    criarAluno.mockResolvedValue({});
    renderizar(<AdminAlunoForm />, { rota: '/admin/alunos/novo' });

    expect(screen.getByRole('heading', { name: 'Novo aluno' })).toBeInTheDocument();
    digita('Nome completo', 'Maria Silva');
    digita('CPF', '12345678900');
    digita('Senha', 'senha123');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/alunos'));
    expect(criarAluno).toHaveBeenCalledWith(
      expect.objectContaining({ nomeCompleto: 'Maria Silva', cpf: '12345678900', senhaHash: 'senha123', status: 'ativo' })
    );
  });

  test('editar: carrega os dados e não envia senha se ela ficar em branco', async () => {
    buscarAlunoPorId.mockResolvedValue({ data: { idAluno: 3, nomeCompleto: 'João Souza', senhaHash: '$2a$hash', status: 'ativo' } });
    atualizarAluno.mockResolvedValue({});
    renderizar(<AdminAlunoForm />, { rota: '/admin/alunos/3/editar', caminho: '/admin/alunos/:id/editar' });

    expect(await screen.findByDisplayValue('João Souza')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar aluno' })).toBeInTheDocument();
    // O hash da senha nunca aparece no formulário
    expect(screen.getByLabelText('Nova senha (opcional)')).toHaveValue('');
    expect(screen.getByLabelText('Nova senha (opcional)')).not.toBeRequired();

    digita('Status', 'bloqueado');
    salvar();

    await waitFor(() => expect(atualizarAluno).toHaveBeenCalled());
    const [id, dados] = atualizarAluno.mock.calls[0];
    expect(id).toBe('3');
    expect(dados.status).toBe('bloqueado');
    expect(dados).not.toHaveProperty('senhaHash');
  });

  test('editar com senha nova envia a senha', async () => {
    buscarAlunoPorId.mockResolvedValue({ data: { idAluno: 3, nomeCompleto: 'João' } });
    atualizarAluno.mockResolvedValue({});
    renderizar(<AdminAlunoForm />, { rota: '/admin/alunos/3/editar', caminho: '/admin/alunos/:id/editar' });
    await screen.findByDisplayValue('João');

    digita('Nova senha (opcional)', 'novaSenha');
    salvar();

    await waitFor(() => expect(atualizarAluno).toHaveBeenCalledWith('3', expect.objectContaining({ senhaHash: 'novaSenha' })));
  });

  test('mostra os erros de validação do backend', async () => {
    criarAluno.mockRejectedValue(erroDeValidacao({ cpf: 'O CPF deve conter exatamente 11 números.', estado: 'A UF deve ter 2 letras.' }));
    renderizar(<AdminAlunoForm />, { rota: '/admin/alunos/novo' });

    salvar();

    expect(await screen.findByText('O CPF deve conter exatamente 11 números. A UF deve ter 2 letras.')).toBeInTheDocument();
    expect(endereco()).toHaveTextContent('/admin/alunos/novo');
  });

  test('erro sem detalhes mostra mensagem genérica', async () => {
    criarAluno.mockRejectedValue(new Error('offline'));
    renderizar(<AdminAlunoForm />, { rota: '/admin/alunos/novo' });

    salvar();

    expect(await screen.findByText(/Não foi possível salvar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SALVAR' })).toBeEnabled();
  });

  test('preenche todos os campos de endereço', async () => {
    criarAluno.mockResolvedValue({});
    renderizar(<AdminAlunoForm />, { rota: '/admin/alunos/novo' });

    ['E-mail', 'Telefone', 'Data de nascimento', 'Rua/Av', 'Número', 'Complemento (opcional)', 'CEP', 'Bairro', 'Cidade', 'UF'].forEach(
      (campo, i) => digita(campo, campo === 'Data de nascimento' ? '2000-01-0' + (i % 9 + 1) : `valor ${i}`)
    );
    salvar();

    await waitFor(() => expect(criarAluno).toHaveBeenCalledWith(expect.objectContaining({ bairro: 'valor 7', complemento: 'valor 5' })));
  });
});

// ===================================================================
describe('Formulário de professor', () => {
  test('novo professor', async () => {
    criarProfessor.mockResolvedValue({});
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/novo' });

    ['Nome completo', 'E-mail', 'Telefone', 'CPF', 'Rua/Av', 'Número', 'Complemento (opcional)', 'CEP', 'Bairro', 'Cidade', 'UF'].forEach(
      (campo) => digita(campo, 'x')
    );
    digita('Data de nascimento', '1985-03-20');
    digita('Situação do professor', 'inativo');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/professores'));
    expect(criarProfessor).toHaveBeenCalledWith(expect.objectContaining({ nomeCompleto: 'x', dataNascimento: '1985-03-20', status: 'inativo' }));
  });

  test('editar professor carrega os dados e salva', async () => {
    buscarProfessorPorId.mockResolvedValue({ data: { idProfessor: 2, nomeCompleto: 'Ana Lúcia', status: 'ativo' } });
    atualizarProfessor.mockResolvedValue({});
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/2/editar', caminho: '/admin/professores/:id/editar' });

    expect(await screen.findByDisplayValue('Ana Lúcia')).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(atualizarProfessor).toHaveBeenCalledWith('2', expect.objectContaining({ nomeCompleto: 'Ana Lúcia' })));
  });

  test('erros', async () => {
    criarProfessor.mockRejectedValueOnce(erroDeValidacao({ email: 'Informe um e-mail válido.' }));
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/novo' });
    salvar();
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();

    criarProfessor.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText(/Não foi possível salvar/)).toBeInTheDocument();
  });
});

// ===================================================================
describe('Formulário de curso', () => {
  test('mostra a prévia da mensalidade enquanto digita', () => {
    renderizar(<AdminCursoForm />, { rota: '/admin/cursos/novo' });

    expect(screen.getByText('Preencha o valor e as parcelas')).toBeInTheDocument();

    digita('Valor total (R$)', '12000');
    digita('Número de parcelas (mensalidades)', '24');

    expect(screen.getByText(/24x de/)).toHaveTextContent('500,00');
  });

  test('novo curso envia as parcelas como número', async () => {
    criarCurso.mockResolvedValue({});
    renderizar(<AdminCursoForm />, { rota: '/admin/cursos/novo' });

    digita('Nome do curso', 'Ciência de Dados');
    digita('Categoria', 'profissionalizante');
    digita('Modalidade', 'EAD');
    digita('Descrição', 'Um curso');
    digita('Tópicos do curso', 'Python\nSQL');
    digita('Valor total (R$)', '12000');
    digita('Carga horária (horas)', '420');
    digita('Número de parcelas (mensalidades)', '28');
    digita('Pré-requisitos', 'Graduação');
    digita('Formas de pagamento', 'Pix');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/cursos'));
    expect(criarCurso).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Ciência de Dados', categoria: 'profissionalizante', conteudo: 'Python\nSQL', numeroParcelas: 28 })
    );
  });

  test('sem parcelas, envia null', async () => {
    criarCurso.mockResolvedValue({});
    renderizar(<AdminCursoForm />, { rota: '/admin/cursos/novo' });

    digita('Nome do curso', 'Avulso');
    salvar();

    await waitFor(() => expect(criarCurso).toHaveBeenCalledWith(expect.objectContaining({ numeroParcelas: null })));
  });

  test('editar curso carrega e atualiza', async () => {
    buscarCursoPorId.mockResolvedValue({ data: { idCurso: 5, nome: 'ADS', categoria: 'superior', valor: 18000, numeroParcelas: 38 } });
    atualizarCurso.mockResolvedValue({});
    renderizar(<AdminCursoForm />, { rota: '/admin/cursos/5/editar', caminho: '/admin/cursos/:id/editar' });

    expect(await screen.findByDisplayValue('ADS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar curso' })).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(atualizarCurso).toHaveBeenCalledWith('5', expect.objectContaining({ numeroParcelas: 38 })));
  });

  test('erros', async () => {
    criarCurso.mockRejectedValueOnce(erroDeValidacao({ numeroParcelas: 'O número de parcelas deve ser no máximo 120.' }));
    renderizar(<AdminCursoForm />, { rota: '/admin/cursos/novo' });
    salvar();
    expect(await screen.findByText('O número de parcelas deve ser no máximo 120.')).toBeInTheDocument();

    criarCurso.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText('Não foi possível salvar o curso. Confira os campos.')).toBeInTheDocument();
  });
});

// ===================================================================
describe('Formulário de disciplina', () => {
  test('lista os cursos e cria a disciplina no curso escolhido', async () => {
    criarDisciplina.mockResolvedValue({});
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });

    expect(await screen.findByRole('option', { name: 'Design' })).toBeInTheDocument();
    digita('Curso', '2');
    digita('Nome da disciplina', 'Tipografia');
    digita('Carga horária (horas)', '40');
    digita('Modalidade', 'EAD');
    digita('Pré-requisitos', 'Nenhum');
    digita('Descrição', 'Desc');
    digita('Conteúdo', 'Fontes');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/disciplinas'));
    expect(criarDisciplina).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Tipografia', curso: { idCurso: '2' } }));
  });

  test('editar disciplina', async () => {
    buscarDisciplinaPorId.mockResolvedValue({ data: { idDisciplina: 9, nome: 'Banco de Dados', curso: { idCurso: 1 } } });
    atualizarDisciplina.mockResolvedValue({});
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/9/editar', caminho: '/admin/disciplinas/:id/editar' });

    expect(await screen.findByDisplayValue('Banco de Dados')).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(atualizarDisciplina).toHaveBeenCalledWith('9', expect.objectContaining({ nome: 'Banco de Dados' })));
  });

  test('erros', async () => {
    criarDisciplina.mockRejectedValueOnce(erroDeValidacao({ nome: 'Nome obrigatório.' }));
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });
    salvar();
    expect(await screen.findByText('Nome obrigatório.')).toBeInTheDocument();

    criarDisciplina.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText('Não foi possível salvar a disciplina. Confira os campos.')).toBeInTheDocument();
  });
});

// ===================================================================
describe('Formulário de período letivo', () => {
  test('não deixa a data de fim ser antes da de início', () => {
    renderizar(<AdminPeriodoLetivoForm />, { rota: '/admin/periodos-letivos/novo' });

    digita('Nome do período', '2026/2');
    digita('Data de início', '2026-08-01');
    digita('Data de fim', '2026-07-01');
    salvar();

    expect(screen.getByText('A data de fim não pode ser anterior à data de início.')).toBeInTheDocument();
    expect(criarPeriodoLetivo).not.toHaveBeenCalled();
  });

  test('datas certas: salva e volta pra lista', async () => {
    criarPeriodoLetivo.mockResolvedValue({});
    renderizar(<AdminPeriodoLetivoForm />, { rota: '/admin/periodos-letivos/novo' });

    digita('Nome do período', '2026/2');
    digita('Data de início', '2026-08-01');
    digita('Data de fim', '2026-12-15');
    digita('Status', 'encerrado');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/periodos-letivos'));
    expect(criarPeriodoLetivo).toHaveBeenCalledWith(expect.objectContaining({ dataFim: '2026-12-15', status: 'encerrado' }));
  });

  test('editar período', async () => {
    buscarPeriodoLetivoPorId.mockResolvedValue({ data: { idPeriodoLetivo: 4, nome: '2026/1', dataInicio: '2026-02-01', dataFim: '2026-06-30', status: 'ativo' } });
    atualizarPeriodoLetivo.mockResolvedValue({});
    renderizar(<AdminPeriodoLetivoForm />, { rota: '/admin/periodos-letivos/4/editar', caminho: '/admin/periodos-letivos/:id/editar' });

    expect(await screen.findByDisplayValue('2026/1')).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(atualizarPeriodoLetivo).toHaveBeenCalledWith('4', expect.objectContaining({ nome: '2026/1' })));
  });

  test('erros', async () => {
    criarPeriodoLetivo.mockRejectedValueOnce(erroDeValidacao({ nome: 'Nome obrigatório.' }));
    renderizar(<AdminPeriodoLetivoForm />, { rota: '/admin/periodos-letivos/novo' });
    salvar();
    expect(await screen.findByText('Nome obrigatório.')).toBeInTheDocument();

    criarPeriodoLetivo.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText('Não foi possível salvar o período letivo. Confira os campos.')).toBeInTheDocument();
  });
});

// ===================================================================
describe('Formulário de turma', () => {
  test('lista cursos e períodos e cria a turma', async () => {
    criarTurma.mockResolvedValue({});
    renderizar(<AdminTurmaForm />, { rota: '/admin/turmas/novo' });

    expect(await screen.findByRole('option', { name: '2026/2' })).toBeInTheDocument();
    digita('Nome da turma', 'Turma A');
    digita('Curso', '1');
    digita('Período letivo', '4');
    digita('Capacidade máxima', '40');
    digita('Carga horária (horas)', '3000');
    digita('Modalidade', 'EAD');
    digita('Dias e horários', 'seg/qua');
    digita('Situação da turma', 'em_andamento');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/turmas'));
    expect(criarTurma).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Turma A', curso: { idCurso: '1' }, periodoLetivo: { idPeriodoLetivo: '4' }, status: 'em_andamento' })
    );
  });

  test('editar turma', async () => {
    buscarTurmaPorId.mockResolvedValue({ data: { idTurma: 3, nome: 'Turma B', curso: { idCurso: 2 }, periodoLetivo: { idPeriodoLetivo: 4 } } });
    atualizarTurma.mockResolvedValue({});
    renderizar(<AdminTurmaForm />, { rota: '/admin/turmas/3/editar', caminho: '/admin/turmas/:id/editar' });

    expect(await screen.findByDisplayValue('Turma B')).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(atualizarTurma).toHaveBeenCalledWith('3', expect.objectContaining({ nome: 'Turma B' })));
  });

  test('erros', async () => {
    criarTurma.mockRejectedValueOnce(erroDeValidacao({ capacidadeMaxima: 'Capacidade inválida.' }));
    renderizar(<AdminTurmaForm />, { rota: '/admin/turmas/novo' });
    salvar();
    expect(await screen.findByText('Capacidade inválida.')).toBeInTheDocument();

    criarTurma.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText('Não foi possível salvar a turma. Confira os campos.')).toBeInTheDocument();
  });
});

// ===================================================================
describe('Formulário de matrícula', () => {
  test('mostra aluno com CPF e turma com curso', async () => {
    renderizar(<AdminMatriculaForm />, { rota: '/admin/matriculas/nova' });

    expect(await screen.findByRole('option', { name: 'Maria Silva — CPF 123.456.789-00' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Turma A — ADS' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Turma Z' })).toBeInTheDocument();
  });

  test('cria a matrícula', async () => {
    criarMatricula.mockResolvedValue({});
    renderizar(<AdminMatriculaForm />, { rota: '/admin/matriculas/nova' });
    await screen.findByRole('option', { name: 'Turma A — ADS' });

    digita('Aluno', '7');
    digita('Turma', '3');
    digita('Status', 'trancada');
    digita('Plano de pagamento', '12x');
    digita('Link do contrato (opcional)', 'https://contrato');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/matriculas'));
    expect(criarMatricula).toHaveBeenCalledWith(
      expect.objectContaining({ aluno: { idAluno: '7' }, turma: { idTurma: '3' }, status: 'trancada', planoPagamento: '12x' })
    );
  });

  test('editar matrícula', async () => {
    buscarMatriculaPorId.mockResolvedValue({ data: { idMatricula: 2, aluno: { idAluno: 7 }, turma: { idTurma: 3 }, status: 'ativa', planoPagamento: '6x' } });
    atualizarMatricula.mockResolvedValue({});
    renderizar(<AdminMatriculaForm />, { rota: '/admin/matriculas/2/editar', caminho: '/admin/matriculas/:id/editar' });

    expect(await screen.findByDisplayValue('6x')).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(atualizarMatricula).toHaveBeenCalledWith('2', expect.objectContaining({ planoPagamento: '6x' })));
  });

  test('erros', async () => {
    criarMatricula.mockRejectedValueOnce(erroDeValidacao({ aluno: 'Aluno obrigatório.' }));
    renderizar(<AdminMatriculaForm />, { rota: '/admin/matriculas/nova' });
    salvar();
    expect(await screen.findByText('Aluno obrigatório.')).toBeInTheDocument();

    criarMatricula.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText(/já pode estar matriculado/)).toBeInTheDocument();
  });
});
