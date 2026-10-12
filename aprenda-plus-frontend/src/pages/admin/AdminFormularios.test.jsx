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
import AdminFuncionarioForm from './AdminFuncionarioForm';

import { buscarAlunoPorId, criarAluno, atualizarAluno, listarAlunos } from '../../services/alunoService';
import {
  buscarProfessorPorId,
  criarProfessor,
  atualizarProfessor,
  buscarVinculosProfessor,
  salvarVinculosProfessor,
} from '../../services/professorService';
import { buscarCursoPorId, criarCurso, atualizarCurso, listarCursos } from '../../services/cursoService';
import { buscarDisciplinaPorId, criarDisciplina, atualizarDisciplina, listarDisciplinas } from '../../services/disciplinaService';
import { buscarPeriodoLetivoPorId, criarPeriodoLetivo, atualizarPeriodoLetivo, listarPeriodosLetivos } from '../../services/periodoLetivoService';
import { buscarTurmaPorId, criarTurma, atualizarTurma, listarTurmas } from '../../services/turmaService';
import { buscarMatriculaPorId, criarMatricula, atualizarMatricula } from '../../services/matriculaService';
import { buscarFuncionarioPorId, criarFuncionario, atualizarFuncionario, listarNiveis } from '../../services/funcionarioService';
import { buscarEnderecoPorCep } from '../../services/cepService';

jest.mock('../../services/alunoService');
jest.mock('../../services/professorService');
jest.mock('../../services/cursoService');
jest.mock('../../services/disciplinaService');
jest.mock('../../services/periodoLetivoService');
jest.mock('../../services/turmaService');
jest.mock('../../services/matriculaService');
jest.mock('../../services/funcionarioService');
jest.mock('../../services/cepService', () => ({
  ...jest.requireActual('../../services/cepService'),
  buscarEnderecoPorCep: jest.fn(),
}));

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
  listarDisciplinas.mockResolvedValue({ data: [] });
  buscarVinculosProfessor.mockResolvedValue({ data: { cursos: [], disciplinas: [] } });
  salvarVinculosProfessor.mockResolvedValue({});
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
describe('Endereço pelo CEP', () => {
  test.each([
    ['professor', AdminProfessorForm, '/admin/professores/novo'],
    ['aluno', AdminAlunoForm, '/admin/alunos/novo'],
  ])('no cadastro de %s, o CEP preenche o endereço', async (_, Formulario, rota) => {
    buscarEnderecoPorCep.mockResolvedValue({ rua: 'Rua Araçá', bairro: 'Igara', cidade: 'Canoas', estado: 'RS' });
    renderizar(<Formulario />, { rota });

    digita('CEP', '92035540');

    await waitFor(() => expect(screen.getByLabelText('Rua/Av')).toHaveValue('Rua Araçá'));
    expect(screen.getByLabelText('CEP')).toHaveValue('92035-540');
    expect(screen.getByLabelText('Bairro')).toHaveValue('Igara');
    expect(screen.getByLabelText('Cidade')).toHaveValue('Canoas');
    expect(screen.getByLabelText('UF')).toHaveValue('RS');
  });
});

describe('Professor: cursos e disciplinas', () => {
  // ADS tem 3 disciplinas (uma inativa); Design tem 1; Redes não tem nenhuma
  const disciplinas = [
    { idDisciplina: 10, nome: 'Banco de Dados', cargaHoraria: 80, status: 'ativa', cursos: [{ idCurso: 1, nome: 'ADS' }] },
    { idDisciplina: 11, nome: 'Algoritmos', cargaHoraria: 60, cursos: [{ idCurso: 1, nome: 'ADS' }] },
    { idDisciplina: 12, nome: 'Cobol', cargaHoraria: 40, status: 'inativa', cursos: [{ idCurso: 1, nome: 'ADS' }] },
    { idDisciplina: 20, nome: 'Tipografia', cargaHoraria: 40, status: 'ativa', cursos: [{ idCurso: 2, nome: 'Design' }] },
  ];

  beforeEach(() => {
    listarCursos.mockResolvedValue({
      data: [{ idCurso: 1, nome: 'ADS' }, { idCurso: 2, nome: 'Design' }, { idCurso: 3, nome: 'Redes' }],
    });
    listarDisciplinas.mockResolvedValue({ data: disciplinas });
  });

  // Caixa pelo começo do nome (o nome da disciplina vem antes dos cursos dela)
  const caixa = (nome) => screen.getByRole('checkbox', { name: new RegExp(`^${nome}`) });
  const totalDeHoras = () => screen.getByTestId('horas-totais');

  const abrirNovo = async () => {
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/novo' });
    await screen.findByRole('checkbox', { name: 'ADS' });
  };

  const abrirEdicao = async () => {
    buscarProfessorPorId.mockResolvedValue({ data: { idProfessor: 2, nomeCompleto: 'Ana Lúcia', status: 'ativo' } });
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/2/editar', caminho: '/admin/professores/:id/editar' });
    await screen.findByDisplayValue('Ana Lúcia');
    await screen.findByRole('checkbox', { name: 'ADS' });
  };

  test('ao marcar um curso aparecem as disciplinas dele, e o total soma as horas', async () => {
    await abrirNovo();
    expect(screen.getByText('Marque um ou mais cursos para escolher as disciplinas.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Banco de Dados/ })).not.toBeInTheDocument();

    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Banco de Dados'));
    fireEvent.click(caixa('Algoritmos'));

    expect(totalDeHoras()).toHaveTextContent('140h');
    expect(totalDeHoras()).toHaveTextContent('2 disciplinas selecionadas');

    fireEvent.click(caixa('Algoritmos'));
    expect(totalDeHoras()).toHaveTextContent('80h');
    expect(totalDeHoras()).toHaveTextContent('1 disciplina selecionada');
  });

  test('pode lecionar em mais de um curso', async () => {
    await abrirNovo();

    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Design'));
    fireEvent.click(caixa('Banco de Dados'));
    fireEvent.click(caixa('Tipografia'));

    // Uma lista só, com as disciplinas dos dois cursos e o curso de cada uma
    expect(screen.getByText('Disciplinas dos cursos marcados')).toBeInTheDocument();
    expect(caixa('Banco de Dados')).toHaveAccessibleName(expect.stringContaining('ADS'));
    expect(caixa('Tipografia')).toHaveAccessibleName(expect.stringContaining('Design'));
    expect(totalDeHoras()).toHaveTextContent('120h');
  });

  test('disciplina de dois cursos aparece uma vez só, com os dois cursos, e conta uma vez no total', async () => {
    listarDisciplinas.mockResolvedValue({
      data: [
        { idDisciplina: 50, nome: 'Lógica', cargaHoraria: 60, cursos: [{ idCurso: 1, nome: 'ADS' }, { idCurso: 2, nome: 'Design' }] },
      ],
    });
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Design'));

    expect(screen.getAllByRole('checkbox', { name: /Lógica/ })).toHaveLength(1);
    expect(caixa('Lógica')).toHaveAccessibleName(expect.stringContaining('ADS · Design'));
    fireEvent.click(caixa('Lógica'));

    expect(caixa('Lógica')).toBeChecked();
    expect(totalDeHoras()).toHaveTextContent('60h');
    expect(totalDeHoras()).toHaveTextContent('1 disciplina selecionada');

    // Desmarcando só o ADS, a disciplina continua (ainda está no Design)
    fireEvent.click(caixa('ADS'));
    expect(caixa('Lógica')).toBeChecked();
    expect(totalDeHoras()).toHaveTextContent('60h');

    // Desmarcando o Design também, aí ela sai
    fireEvent.click(caixa('Design'));
    expect(screen.queryByRole('checkbox', { name: /Lógica/ })).not.toBeInTheDocument();
  });

  test('disciplina selecionada que sumiu da lista não atrapalha ao desmarcar curso', async () => {
    buscarVinculosProfessor.mockResolvedValue({ data: { cursos: [1], disciplinas: [10, 999] } });
    atualizarProfessor.mockResolvedValue({ data: { idProfessor: 2 } });
    await abrirEdicao();

    fireEvent.click(caixa('Design'));
    fireEvent.click(caixa('Design'));
    salvar();

    await waitFor(() => expect(salvarVinculosProfessor).toHaveBeenCalledWith('2', { cursos: [1], disciplinas: [10, 999] }));
  });

  test('desmarcar o curso tira as disciplinas dele', async () => {
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Design'));
    fireEvent.click(caixa('Banco de Dados'));
    fireEvent.click(caixa('Tipografia'));

    fireEvent.click(caixa('ADS'));

    expect(screen.queryByRole('checkbox', { name: /Banco de Dados/ })).not.toBeInTheDocument();
    expect(totalDeHoras()).toHaveTextContent('40h');
  });

  test('as disciplinas aparecem em ordem alfabética', async () => {
    await abrirNovo();
    fireEvent.click(caixa('ADS'));

    const nomes = screen.getAllByRole('checkbox').map((c) => c.closest('label').querySelector('.prof-disciplina-nome')?.firstChild?.textContent).filter(Boolean);
    expect(nomes).toEqual(['Algoritmos', 'Banco de Dados', 'Cobol']);
  });

  test('curso sem disciplinas avisa', async () => {
    await abrirNovo();
    fireEvent.click(caixa('Redes'));

    expect(screen.getByText('Os cursos marcados ainda não têm disciplinas cadastradas.')).toBeInTheDocument();
  });

  test('sem nenhum curso cadastrado avisa', async () => {
    listarCursos.mockResolvedValue({ data: [] });
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/novo' });

    expect(await screen.findByText('Nenhum curso cadastrado ainda.')).toBeInTheDocument();
  });

  test('novo professor: salva os dados e depois os cursos e disciplinas', async () => {
    criarProfessor.mockResolvedValue({ data: { idProfessor: 9 } });
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Banco de Dados'));
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/professores'));
    expect(salvarVinculosProfessor).toHaveBeenCalledWith(9, { cursos: [1], disciplinas: [10] });
  });

  test('edição: carrega o que o professor já leciona', async () => {
    buscarVinculosProfessor.mockResolvedValue({ data: { cursos: [1], disciplinas: [10, 11] } });
    atualizarProfessor.mockResolvedValue({ data: { idProfessor: 2 } });
    await abrirEdicao();

    expect(buscarVinculosProfessor).toHaveBeenCalledWith('2');
    expect(caixa('ADS')).toBeChecked();
    expect(caixa('Banco de Dados')).toBeChecked();
    expect(caixa('Cobol')).not.toBeChecked();
    expect(totalDeHoras()).toHaveTextContent('140h');

    salvar();
    await waitFor(() => expect(salvarVinculosProfessor).toHaveBeenCalledWith('2', { cursos: [1], disciplinas: [10, 11] }));
  });

  test('edição: vínculos sem listas viram listas vazias', async () => {
    buscarVinculosProfessor.mockResolvedValue({ data: {} });
    await abrirEdicao();

    expect(caixa('ADS')).not.toBeChecked();
  });

  test('disciplina inativa aparece marcada como inativa e não entra no total', async () => {
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Banco de Dados'));
    fireEvent.click(caixa('Cobol'));

    expect(screen.getByText('Inativa')).toBeInTheDocument();
    expect(totalDeHoras()).toHaveTextContent('80h');
    expect(totalDeHoras()).toHaveTextContent('1 inativa não entra no total');
  });

  test('várias inativas: o aviso do total fica no plural', async () => {
    listarDisciplinas.mockResolvedValue({
      data: [...disciplinas, { idDisciplina: 13, nome: 'Pascal', cargaHoraria: 20, status: 'inativa', cursos: [{ idCurso: 1, nome: 'ADS' }] }],
    });
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Cobol'));
    fireEvent.click(caixa('Pascal'));

    expect(totalDeHoras()).toHaveTextContent('0h');
    expect(totalDeHoras()).toHaveTextContent('2 inativas não entram no total');
  });

  test('ao salvar com disciplina inativa, pede confirmação; Cancelar volta para o formulário', async () => {
    criarProfessor.mockResolvedValue({ data: { idProfessor: 9 } });
    await abrirNovo();
    digita('Nome completo', 'Carla Souza');
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Cobol'));
    salvar();

    const janela = screen.getByRole('alertdialog', { name: 'Disciplina inativa selecionada' });
    expect(janela).toHaveTextContent(
      'A disciplina Cobol (ADS) está inativa e não será calculada nas horas totais de aula deste professor.'
    );
    expect(criarProfessor).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Carla Souza')).toBeInTheDocument();
    expect(caixa('Cobol')).toBeChecked();
    expect(criarProfessor).not.toHaveBeenCalled();
  });

  test('ao confirmar, salva mesmo com a disciplina inativa', async () => {
    criarProfessor.mockResolvedValue({ data: { idProfessor: 9 } });
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Banco de Dados'));
    fireEvent.click(caixa('Cobol'));
    salvar();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e salvar' }));

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/professores'));
    expect(salvarVinculosProfessor).toHaveBeenCalledWith(9, { cursos: [1], disciplinas: [10, 12] });
  });

  test('inativa de vários cursos lista todos os cursos no aviso', async () => {
    listarDisciplinas.mockResolvedValue({
      data: [{ idDisciplina: 30, nome: 'Avulsa', cargaHoraria: 10, status: 'inativa', cursos: [{ idCurso: 1, nome: 'ADS' }, { idCurso: 2, nome: 'Design' }] }],
    });
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Avulsa'));
    salvar();

    expect(screen.getByRole('alertdialog')).toHaveTextContent('A disciplina Avulsa (ADS, Design) está inativa');
  });

  test('se os cursos e disciplinas não carregarem, salva o professor sem mexer neles', async () => {
    listarDisciplinas.mockRejectedValue(new Error('offline'));
    criarProfessor.mockResolvedValue({ data: { idProfessor: 9 } });
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/novo' });

    expect(await screen.findByText(/Não foi possível carregar os cursos e disciplinas/)).toBeInTheDocument();
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/professores'));
    expect(salvarVinculosProfessor).not.toHaveBeenCalled();
  });

  test('mostra "carregando" enquanto busca os cursos', () => {
    listarCursos.mockReturnValue(new Promise(() => {}));
    renderizar(<AdminProfessorForm />, { rota: '/admin/professores/novo' });

    expect(screen.getByText('Carregando cursos e disciplinas...')).toBeInTheDocument();
  });

  test('erro ao salvar os vínculos: avisa e, ao tentar de novo, não cadastra o professor duas vezes', async () => {
    criarProfessor.mockResolvedValue({ data: { idProfessor: 9 } });
    atualizarProfessor.mockResolvedValue({ data: { idProfessor: 9 } });
    salvarVinculosProfessor
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce({ response: { data: { mensagem: 'A disciplina "Redes" não pertence a nenhum dos cursos selecionados.' } } })
      .mockResolvedValueOnce({});
    await abrirNovo();
    fireEvent.click(caixa('ADS'));
    fireEvent.click(caixa('Banco de Dados'));

    salvar();
    expect(await screen.findByText(/Os dados do professor foram salvos, mas não foi possível salvar os cursos/)).toBeInTheDocument();

    salvar();
    expect(await screen.findByText('A disciplina "Redes" não pertence a nenhum dos cursos selecionados.')).toBeInTheDocument();
    expect(criarProfessor).toHaveBeenCalledTimes(1);
    expect(atualizarProfessor).toHaveBeenCalledWith(9, expect.anything());

    salvar();
    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/professores'));
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
  const marcarCurso = (nome) => fireEvent.click(screen.getByRole('checkbox', { name: nome }));

  test('lista os cursos e cria a disciplina nos cursos marcados', async () => {
    criarDisciplina.mockResolvedValue({});
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });

    await screen.findByRole('checkbox', { name: 'Design' });
    marcarCurso('ADS');
    marcarCurso('Design');
    expect(screen.getByRole('checkbox', { name: 'ADS' })).toBeChecked();
    digita('Nome da disciplina', 'Tipografia');
    digita('Carga horária (horas)', '40');
    digita('Modalidade', 'EAD');
    digita('Pré-requisitos', 'Nenhum');
    digita('Descrição', 'Desc');
    digita('Conteúdo', 'Fontes');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/disciplinas'));
    expect(criarDisciplina).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Tipografia', cursos: [{ idCurso: 1 }, { idCurso: 2 }] })
    );
  });

  test('desmarcar um curso tira ele da disciplina', async () => {
    criarDisciplina.mockResolvedValue({});
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });
    await screen.findByRole('checkbox', { name: 'Design' });

    marcarCurso('ADS');
    marcarCurso('Design');
    marcarCurso('ADS');
    salvar();

    await waitFor(() => expect(criarDisciplina).toHaveBeenCalledWith(expect.objectContaining({ cursos: [{ idCurso: 2 }] })));
  });

  test('sem nenhum curso marcado, avisa e não salva', async () => {
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });
    await screen.findByRole('checkbox', { name: 'Design' });

    salvar();

    expect(screen.getByText('Selecione pelo menos um curso para a disciplina.')).toBeInTheDocument();
    expect(criarDisciplina).not.toHaveBeenCalled();
  });

  test('nova disciplina começa ativa e pode ser marcada como inativa', async () => {
    criarDisciplina.mockResolvedValue({});
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });
    await screen.findByRole('checkbox', { name: 'ADS' });

    expect(screen.getByLabelText('Situação da disciplina')).toHaveValue('ativa');
    digita('Situação da disciplina', 'inativa');
    marcarCurso('ADS');
    salvar();

    await waitFor(() => expect(criarDisciplina).toHaveBeenCalledWith(expect.objectContaining({ status: 'inativa' })));
  });

  test('editar disciplina mostra os cursos dela marcados', async () => {
    buscarDisciplinaPorId.mockResolvedValue({
      data: { idDisciplina: 9, nome: 'Banco de Dados', cursos: [{ idCurso: 1, nome: 'ADS' }, { idCurso: 2, nome: 'Design' }] },
    });
    atualizarDisciplina.mockResolvedValue({});
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/9/editar', caminho: '/admin/disciplinas/:id/editar' });

    expect(await screen.findByDisplayValue('Banco de Dados')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Design' })).toBeChecked());
    expect(screen.getByRole('checkbox', { name: 'ADS' })).toBeChecked();
    salvar();

    await waitFor(() =>
      expect(atualizarDisciplina).toHaveBeenCalledWith(
        '9',
        expect.objectContaining({ nome: 'Banco de Dados', cursos: [{ idCurso: 1 }, { idCurso: 2 }] })
      )
    );
  });

  test('disciplina antiga sem lista de cursos abre sem nenhum marcado', async () => {
    buscarDisciplinaPorId.mockResolvedValue({ data: { idDisciplina: 9, nome: 'Banco de Dados' } });
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/9/editar', caminho: '/admin/disciplinas/:id/editar' });

    expect(await screen.findByDisplayValue('Banco de Dados')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'ADS' })).not.toBeChecked();
    marcarCurso('ADS');
    expect(screen.getByRole('checkbox', { name: 'ADS' })).toBeChecked();
  });

  test('erros', async () => {
    renderizar(<AdminDisciplinaForm />, { rota: '/admin/disciplinas/novo' });
    await screen.findByRole('checkbox', { name: 'ADS' });
    marcarCurso('ADS');

    criarDisciplina.mockRejectedValueOnce(erroDeValidacao({ nome: 'Nome obrigatório.' }));
    salvar();
    expect(await screen.findByText('Nome obrigatório.')).toBeInTheDocument();

    criarDisciplina.mockRejectedValueOnce({ response: { data: { mensagem: 'Um dos cursos selecionados não existe mais. Atualize a página.' } } });
    salvar();
    expect(await screen.findByText('Um dos cursos selecionados não existe mais. Atualize a página.')).toBeInTheDocument();

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

// ===================================================================
describe('Formulário de funcionário', () => {
  const niveis = [
    { idNivel: 1, nome: 'Master', master: true, modulos: [] },
    { idNivel: 2, nome: 'Administrativo', master: false, modulos: ['alunos'] },
    { idNivel: 3, nome: 'Financeiro', master: false, modulos: ['matriculas'] },
  ];

  // Quem está logado: Master ou não
  const logadoComo = (master) =>
    localStorage.setItem('acessoAdmin', JSON.stringify({ nivel: master ? 'Master' : 'Administrativo', master, modulos: [] }));

  const opcoesDoNivel = () =>
    Array.from(screen.getByLabelText('Nível de acesso').querySelectorAll('option')).map((o) => o.textContent);

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('idFuncionario', '1');
    logadoComo(true);
    listarNiveis.mockResolvedValue({ data: niveis });
  });

  test('novo funcionário: envia os dados com a senha e volta pra lista', async () => {
    criarFuncionario.mockResolvedValue({});
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/novo' });

    expect(screen.getByRole('heading', { name: 'Novo funcionário' })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeRequired();
    digita('Nome completo', 'Ana Souza');
    digita('Telefone', '(51) 98888-7777');
    digita('Data de nascimento', '1992-04-15');
    digita('CPF', '111.222.333-44');
    digita('E-mail de login', 'ana@aprendaplus.com');
    digita('Senha', 'segredo1');
    digita('Cargo', 'secretaria');
    digita('Situação', 'ativo');
    await screen.findByRole('option', { name: 'Financeiro' });
    expect(screen.getByLabelText('Nível de acesso')).toBeRequired();
    digita('Nível de acesso', '3');
    salvar();

    await waitFor(() => expect(endereco()).toHaveTextContent('/admin/funcionarios'));
    expect(criarFuncionario).toHaveBeenCalledWith(
      expect.objectContaining({
        nomeCompleto: 'Ana Souza',
        cpf: '11122233344',
        senhaHash: 'segredo1',
        cargo: 'secretaria',
        nivel: { idNivel: 3 },
      })
    );
    expect(criarFuncionario.mock.calls[0][0]).not.toHaveProperty('idNivel');
  });

  test('editar outro funcionário: senha em branco não é enviada e o status pode mudar', async () => {
    buscarFuncionarioPorId.mockResolvedValue({
      data: { idFuncionario: 2, nomeCompleto: 'Bruno Lima', status: 'ativo', nivel: { idNivel: 2, nome: 'Administrativo' } },
    });
    atualizarFuncionario.mockResolvedValue({});
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/2/editar', caminho: '/admin/funcionarios/:id/editar' });

    expect(await screen.findByDisplayValue('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha (opcional)')).not.toBeRequired();
    expect(screen.getByLabelText('Situação')).toBeEnabled();
    digita('Situação', 'inativo');
    salvar();

    await waitFor(() => expect(atualizarFuncionario).toHaveBeenCalled());
    const enviado = atualizarFuncionario.mock.calls[0][1];
    expect(atualizarFuncionario.mock.calls[0][0]).toBe('2');
    expect(enviado.status).toBe('inativo');
    expect(enviado).not.toHaveProperty('senhaHash');
    expect(enviado.nivel).toEqual({ idNivel: 2 });
  });

  test('editar com senha nova envia a senha', async () => {
    buscarFuncionarioPorId.mockResolvedValue({ data: { idFuncionario: 2, nomeCompleto: 'Bruno Lima' } });
    atualizarFuncionario.mockResolvedValue({});
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/2/editar', caminho: '/admin/funcionarios/:id/editar' });
    await screen.findByDisplayValue('Bruno Lima');

    digita('Nova senha (opcional)', 'novaSenha9');
    salvar();

    await waitFor(() => expect(atualizarFuncionario).toHaveBeenCalledWith('2', expect.objectContaining({ senhaHash: 'novaSenha9' })));
  });

  test('na própria conta, a situação fica travada', async () => {
    buscarFuncionarioPorId.mockResolvedValue({ data: { idFuncionario: 1, nomeCompleto: 'Admin Teste', status: 'ativo' } });
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/1/editar', caminho: '/admin/funcionarios/:id/editar' });

    expect(await screen.findByDisplayValue('Admin Teste')).toBeInTheDocument();
    expect(screen.getByLabelText('Situação')).toBeDisabled();
    expect(screen.getByText('Você não pode inativar a sua própria conta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nível de acesso')).toBeDisabled();
    expect(screen.getByText('Você não pode mudar o seu próprio nível de acesso.')).toBeInTheDocument();
  });

  test('quem não é Master não vê a opção Master', async () => {
    logadoComo(false);
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/novo' });

    await screen.findByRole('option', { name: 'Financeiro' });
    expect(opcoesDoNivel()).toEqual(['Escolha o nível...', 'Administrativo', 'Financeiro']);
    expect(screen.getByText(/O nível define quais módulos/)).toBeInTheDocument();
  });

  test('Master vê todos os níveis, inclusive o Master', async () => {
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/novo' });

    await screen.findByRole('option', { name: 'Master' });
    expect(opcoesDoNivel()).toContain('Master');
  });

  test('quem não é Master não altera o nível de uma conta Master', async () => {
    logadoComo(false);
    buscarFuncionarioPorId.mockResolvedValue({
      data: { idFuncionario: 5, nomeCompleto: 'Chefe', status: 'ativo', nivel: { idNivel: 1, nome: 'Master', master: true } },
    });
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/5/editar', caminho: '/admin/funcionarios/:id/editar' });

    await screen.findByDisplayValue('Chefe');
    await screen.findByRole('option', { name: 'Master' });
    expect(screen.getByLabelText('Nível de acesso')).toBeDisabled();
    expect(screen.getByText('Só um usuário Master pode alterar uma conta Master.')).toBeInTheDocument();
  });

  test('conta sem nível e lista de níveis indisponível', async () => {
    listarNiveis.mockRejectedValue(new Error('offline'));
    buscarFuncionarioPorId.mockResolvedValue({ data: { idFuncionario: 2, nomeCompleto: 'Bruno Lima', nivel: null } });
    atualizarFuncionario.mockResolvedValue({});
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/2/editar', caminho: '/admin/funcionarios/:id/editar' });

    await screen.findByDisplayValue('Bruno Lima');
    expect(opcoesDoNivel()).toEqual(['Escolha o nível...']);
  });

  test('erros: mensagem do servidor ou texto padrão', async () => {
    renderizar(<AdminFuncionarioForm />, { rota: '/admin/funcionarios/novo' });

    criarFuncionario.mockRejectedValueOnce({ response: { data: { mensagem: 'A senha deve ter pelo menos 6 caracteres.' } } });
    salvar();
    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();

    criarFuncionario.mockRejectedValueOnce(new Error('offline'));
    salvar();
    expect(await screen.findByText(/Não foi possível salvar/)).toBeInTheDocument();
  });
});
