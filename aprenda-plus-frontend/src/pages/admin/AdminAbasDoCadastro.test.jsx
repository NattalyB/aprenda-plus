// Abas dentro do cadastro: aluno (Dados pessoais / Inscrições / Matrículas)
// e curso (Dados do curso / Disciplinas / Turmas), respeitando o nível de acesso.
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';

import AdminAlunoForm from './AdminAlunoForm';
import AdminCursoForm from './AdminCursoForm';
import AdminMatriculaForm from './AdminMatriculaForm';
import AdminDisciplinaForm from './AdminDisciplinaForm';
import AdminTurmaForm from './AdminTurmaForm';
import { destinoDeVolta, rotaComVolta } from '../../utils/voltarPara';

import { buscarAlunoPorId, listarAlunos } from '../../services/alunoService';
import { listarInscricoes } from '../../services/inscricaoService';
import { listarMatriculas, criarMatricula } from '../../services/matriculaService';
import { buscarCursoPorId, listarCursos } from '../../services/cursoService';
import { listarDisciplinas, criarDisciplina } from '../../services/disciplinaService';
import { listarTurmas, criarTurma } from '../../services/turmaService';
import { listarPeriodosLetivos } from '../../services/periodoLetivoService';

jest.mock('../../services/alunoService');
jest.mock('../../services/inscricaoService');
jest.mock('../../services/matriculaService');
jest.mock('../../services/cursoService');
jest.mock('../../services/disciplinaService');
jest.mock('../../services/turmaService');
jest.mock('../../services/periodoLetivoService');
jest.mock('../../services/atividadeService', () => ({ ultimaAlteracao: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../services/documentoService', () => ({
  ...jest.requireActual('../../services/documentoService'),
  listarDocumentosDoAluno: jest.fn(() => Promise.resolve({ data: [] })),
  situacaoDosDocumentos: jest.fn(() => Promise.resolve({ data: {} })),
}));

const MASTER = { nivel: 'Master', master: true, modulos: [] };

function Endereco() {
  const local = useLocation();
  return <div data-testid="endereco">{local.pathname + local.search}</div>;
}

const abrir = (componente, rota, caminho, acesso = MASTER) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin" element={<Outlet context={{ acesso }} />}>
          <Route path={caminho} element={componente} />
          <Route path="*" element={null} />
        </Route>
      </Routes>
      <Endereco />
    </MemoryRouter>
  );

const abaChamada = (nome) => screen.getByRole('tab', { name: new RegExp(nome) });
const endereco = () => screen.getByTestId('endereco').textContent;

beforeEach(() => {
  jest.clearAllMocks();
  buscarAlunoPorId.mockResolvedValue({ data: { idAluno: 7, nomeCompleto: 'Maria Silva', status: 'ativo' } });
  listarAlunos.mockResolvedValue({ data: [{ idAluno: 7, nomeCompleto: 'Maria Silva' }, { idAluno: 9, nomeCompleto: 'João' }] });
  listarInscricoes.mockResolvedValue({
    data: [
      { idInscricao: 1, aluno: { idAluno: 7, nomeCompleto: 'Maria Silva' }, turma: { nome: 'ADS 2026/2' }, status: 'confirmada' },
      { idInscricao: 2, aluno: { idAluno: 9, nomeCompleto: 'João' }, turma: { nome: 'Design A' }, status: 'pendente_pagamento' },
    ],
  });
  listarMatriculas.mockResolvedValue({
    data: [
      { idMatricula: 11, aluno: { idAluno: 7, nomeCompleto: 'Maria Silva' }, turma: { idTurma: 3, nome: 'ADS 2026/2' }, status: 'ativa' },
      { idMatricula: 12, aluno: { idAluno: 9, nomeCompleto: 'João' }, turma: { idTurma: 4, nome: 'Design A' }, status: 'ativa' },
    ],
  });
  buscarCursoPorId.mockResolvedValue({ data: { idCurso: 1, nome: 'ADS', categoria: 'superior' } });
  listarCursos.mockResolvedValue({ data: [{ idCurso: 1, nome: 'ADS' }, { idCurso: 2, nome: 'Design' }] });
  listarDisciplinas.mockResolvedValue({
    data: [
      { idDisciplina: 21, nome: 'Algoritmos', cargaHoraria: 60, cursos: [{ idCurso: 1, nome: 'ADS' }] },
      { idDisciplina: 22, nome: 'Tipografia', cargaHoraria: 40, cursos: [{ idCurso: 2, nome: 'Design' }] },
    ],
  });
  listarTurmas.mockResolvedValue({
    data: [
      { idTurma: 3, nome: 'ADS 2026/2', curso: { idCurso: 1, nome: 'ADS' }, status: 'inscricoes_abertas' },
      { idTurma: 4, nome: 'Design A', curso: { idCurso: 2, nome: 'Design' }, status: 'inscricoes_abertas' },
    ],
  });
  listarPeriodosLetivos.mockResolvedValue({ data: [{ idPeriodoLetivo: 4, nome: '2026/2' }] });
});

describe('Abas do aluno', () => {
  const abrirAluno = (acesso, rota = '/admin/alunos/7/editar') =>
    abrir(<AdminAlunoForm />, rota, 'alunos/:id/editar', acesso);

  test('mostra as três abas e cada uma só com os dados do aluno', async () => {
    abrirAluno();
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(abaChamada('Dados pessoais')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();

    fireEvent.click(abaChamada('Inscrições'));
    expect(await screen.findByText('1 de 1 inscrição(ões) · clique no status para alterar')).toBeInTheDocument();
    expect(screen.queryByText('Design A')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();
    expect(endereco()).toBe('/admin/alunos/7/editar?aba=inscricoes');

    fireEvent.click(abaChamada('Matrículas'));
    expect(await screen.findByText('1 de 1 matrícula(s)')).toBeInTheDocument();
    expect(screen.getByText('ADS 2026/2')).toBeInTheDocument();
    expect(screen.queryByText('Design A')).not.toBeInTheDocument();

    fireEvent.click(abaChamada('Dados pessoais'));
    expect(endereco()).toBe('/admin/alunos/7/editar');
  });

  test('nova matrícula e editar, abertos pela aba, levam o aluno e o caminho de volta', async () => {
    abrirAluno(MASTER, '/admin/alunos/7/editar?aba=matriculas');
    expect(await screen.findByText('1 de 1 matrícula(s)')).toBeInTheDocument();
    const volta = encodeURIComponent('/admin/alunos/7/editar?aba=matriculas');
    expect(screen.getByRole('link', { name: '+ Nova matrícula' })).toHaveAttribute(
      'href',
      `/admin/matriculas/novo?aluno=7&voltar=${volta}`
    );
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `/admin/matriculas/11/editar?voltar=${volta}`);
  });

  test('o nível só vê as abas dos módulos liberados', async () => {
    abrirAluno({ nivel: 'Secretaria', master: false, modulos: ['alunos', 'matriculas'] });
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    const abas = within(screen.getByRole('tablist')).getAllByRole('tab').map((a) => a.textContent);
    expect(abas).toEqual(['👤 Dados pessoais', '✅ Matrículas']);
  });

  test('sem Inscrições nem Matrículas não aparece barra de abas, e ?aba= de fora cai nos dados', async () => {
    abrirAluno({ nivel: 'Atendimento', master: false, modulos: ['alunos'] }, '/admin/alunos/7/editar?aba=inscricoes');
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(listarInscricoes).not.toHaveBeenCalled();
  });

  test('aluno novo não tem abas', () => {
    abrir(<AdminAlunoForm />, '/admin/alunos/novo', 'alunos/novo');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('Novo aluno')).toBeInTheDocument();
  });
});

describe('Abas do curso', () => {
  test('disciplinas e turmas do curso, sem o filtro de curso nem a importação', async () => {
    abrir(<AdminCursoForm />, '/admin/cursos/1/editar', 'cursos/:id/editar');
    expect(await screen.findByText('ADS')).toBeInTheDocument();

    fireEvent.click(abaChamada('Disciplinas'));
    expect(await screen.findByText('Algoritmos')).toBeInTheDocument();
    expect(screen.queryByText('Tipografia')).not.toBeInTheDocument();
    expect(screen.queryByText('Todos os cursos')).not.toBeInTheDocument();
    expect(screen.queryByText(/Importar/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Nova disciplina' })).toHaveAttribute(
      'href',
      `/admin/disciplinas/novo?curso=1&voltar=${encodeURIComponent('/admin/cursos/1/editar?aba=disciplinas')}`
    );

    fireEvent.click(abaChamada('Turmas'));
    expect(await screen.findByText('1 de 1 turma(s)')).toBeInTheDocument();
    expect(screen.queryByText('Design A')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Nova turma' })).toHaveAttribute(
      'href',
      `/admin/turmas/novo?curso=1&voltar=${encodeURIComponent('/admin/cursos/1/editar?aba=turmas')}`
    );
  });

  test('nível sem Disciplinas vê só a aba de Turmas', async () => {
    abrir(<AdminCursoForm />, '/admin/cursos/1/editar', 'cursos/:id/editar', {
      nivel: 'Coordenação',
      master: false,
      modulos: ['cursos', 'turmas'],
    });
    expect(await screen.findByText('ADS')).toBeInTheDocument();
    const abas = within(screen.getByRole('tablist')).getAllByRole('tab').map((a) => a.textContent);
    expect(abas).toEqual(['📘 Dados do curso', '🏫 Turmas']);
  });
});

describe('Formulários abertos pelas abas', () => {
  test('matrícula já vem com o aluno e volta para a aba depois de salvar', async () => {
    criarMatricula.mockResolvedValue({});
    const volta = '/admin/alunos/7/editar?aba=matriculas';
    abrir(<AdminMatriculaForm />, rotaComVolta('/admin/matriculas/novo', volta, { aluno: 7 }), 'matriculas/novo');
    expect(await screen.findByRole('option', { name: /Maria Silva/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Aluno')).toHaveValue('7');
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', volta);

    fireEvent.change(screen.getByLabelText('Turma'), { target: { value: '3' } });
    fireEvent.submit(screen.getByRole('button', { name: 'SALVAR' }).closest('form'));
    await screen.findByText(volta);
    expect(criarMatricula).toHaveBeenCalledWith(expect.objectContaining({ aluno: { idAluno: '7' } }));
  });

  test('disciplina já vem com o curso marcado', async () => {
    criarDisciplina.mockResolvedValue({});
    abrir(<AdminDisciplinaForm />, '/admin/disciplinas/novo?curso=2', 'disciplinas/novo');
    expect(await screen.findByLabelText('Design')).toBeChecked();
    expect(screen.getByLabelText('ADS')).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/admin/disciplinas');
  });

  test('turma já vem com o curso escolhido', async () => {
    criarTurma.mockResolvedValue({});
    abrir(<AdminTurmaForm />, '/admin/turmas/novo?curso=1&voltar=%2Fadmin%2Fcursos%2F1%2Feditar%3Faba%3Dturmas', 'turmas/novo');
    expect(await screen.findByRole('option', { name: 'ADS' })).toBeInTheDocument();
    expect(screen.getByLabelText('Curso')).toHaveValue('1');
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/admin/cursos/1/editar?aba=turmas');
  });
});

test('o caminho de volta só aceita telas do painel', () => {
  const p = (q) => new URLSearchParams(q);
  expect(destinoDeVolta(p('voltar=/admin/alunos/7/editar?aba=matriculas'), '/x')).toBe('/admin/alunos/7/editar?aba=matriculas');
  expect(destinoDeVolta(p('voltar=https://golpe.com'), '/admin/matriculas')).toBe('/admin/matriculas');
  expect(destinoDeVolta(p('voltar=//golpe.com/admin/'), '/admin/matriculas')).toBe('/admin/matriculas');
  expect(destinoDeVolta(p(''), '/admin/turmas')).toBe('/admin/turmas');
  expect(rotaComVolta('/admin/turmas/novo', null)).toBe('/admin/turmas/novo');
  expect(rotaComVolta('/admin/turmas/novo', null, { curso: 1, vazio: '' })).toBe('/admin/turmas/novo?curso=1');
});
