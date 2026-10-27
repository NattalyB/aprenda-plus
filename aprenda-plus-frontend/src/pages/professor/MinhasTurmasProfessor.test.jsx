import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderizar } from '../../testUtils';
import MinhasTurmasProfessor from './MinhasTurmasProfessor';
import { minhasTurmas, professorLogado, getNomeProfessor, sairProfessor } from '../../services/docenteService';

jest.mock('../../services/docenteService');

const turmas = [
  { idTurma: 5, nome: 'Turma ESI-A', curso: 'Engenharia de Software', modalidade: 'EAD', diasHorarios: 'Seg 19h', periodoLetivo: '2026/2', responsavel: true, salaCriada: true, alunos: 12, aulas: 8, progressoMedio: 64 },
  { idTurma: 6, nome: 'Turma FST-A', curso: null, modalidade: null, diasHorarios: null, periodoLetivo: null, responsavel: false, salaCriada: false, alunos: 1, aulas: 1, progressoMedio: 0 },
];

beforeEach(() => {
  jest.clearAllMocks();
  professorLogado.mockReturnValue(true);
  getNomeProfessor.mockReturnValue('Roberto Carlos Fagundes');
  minhasTurmas.mockResolvedValue(turmas);
});

test('sem login vai para o login de professor', () => {
  professorLogado.mockReturnValue(false);
  renderizar(<MinhasTurmasProfessor />, { rota: '/professor' });
  expect(screen.getByTestId('endereco')).toHaveTextContent('/login');
  expect(minhasTurmas).not.toHaveBeenCalled();
});

test('mostra as turmas com os números e abre a turma', async () => {
  renderizar(<MinhasTurmasProfessor />, { rota: '/professor' });
  expect(screen.getByText('Carregando suas turmas...')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Olá, Roberto! 👋' })).toBeInTheDocument();

  expect(await screen.findByText('Turma ESI-A')).toBeInTheDocument();
  expect(screen.getByText('Responsável pela sala')).toBeInTheDocument();
  expect(screen.getByText('Professor da turma')).toBeInTheDocument();
  expect(screen.getByText('EAD · Seg 19h · 2026/2')).toBeInTheDocument();
  expect(screen.getByText('64%')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('alunos')).toBeInTheDocument();
  expect(screen.getByText('aluno')).toBeInTheDocument();
  expect(screen.getByText('aula')).toBeInTheDocument();
  expect(screen.getByText('Curso não informado')).toBeInTheDocument();
  expect(screen.getByText(/ainda não foi criada pela secretaria/)).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Abrir turma →' })[0]).toHaveAttribute('href', '/professor/turmas/5');
});

test('sem turmas, erro e sair', async () => {
  minhasTurmas.mockResolvedValueOnce(null);
  getNomeProfessor.mockReturnValue(null);
  const { unmount } = renderizar(<MinhasTurmasProfessor />, { rota: '/professor' });
  expect(await screen.findByText(/não está vinculado a nenhuma turma/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Olá! 👋' })).toBeInTheDocument();
  unmount();

  minhasTurmas.mockRejectedValueOnce(new Error('x'));
  renderizar(<MinhasTurmasProfessor />, { rota: '/professor' });
  expect(await screen.findByText('Não foi possível carregar as suas turmas.')).toBeInTheDocument();
  expect(screen.queryByText(/não está vinculado/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Sair do portal' }));
  expect(sairProfessor).toHaveBeenCalled();
  await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/login'));
});
