// Turmas: quantidade de matriculados e lista de alunos de cada turma
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderizar } from '../../testUtils';
import AdminTurmas from './AdminTurmas';
import { listarTurmas } from '../../services/turmaService';
import { listarMatriculas } from '../../services/matriculaService';

jest.mock('../../services/turmaService');
jest.mock('../../services/matriculaService');

const turmas = [
  { idTurma: 1, nome: 'Turma A - Noite', capacidadeMaxima: 3, status: 'em_andamento', curso: { idCurso: 1, nome: 'ADS' }, periodoLetivo: { nome: '2026/2' } },
  { idTurma: 2, nome: 'Turma B - Manhã', capacidadeMaxima: 30, status: 'inscricoes_abertas', curso: { idCurso: 1, nome: 'ADS' } },
  { idTurma: 3, nome: 'Turma C', status: 'inscricoes_abertas' },
];

const matricula = (id, idTurma, nome, status = 'ativa', extra = {}) => ({
  idMatricula: id,
  turma: { idTurma },
  aluno: { idAluno: id + 100, nomeCompleto: nome, email: `${nome.split(' ')[0].toLowerCase()}@teste.com` },
  dataMatricula: '2026-10-05',
  status,
  ...extra,
});

const matriculas = [
  matricula(1, 1, 'Pedro Lima'),
  matricula(2, 1, 'Ana Souza'),
  matricula(3, 1, 'Bruno Alves', 'cancelada'),
  matricula(4, 1, 'Carla Dias', 'trancada'),
  matricula(5, 2, 'Diego Rocha'),
  { idMatricula: 6, turma: null, aluno: null, status: 'ativa' },
];

const linhaDe = (nome) => screen.getByText(nome).closest('tr');
const linhas = () => screen.getAllByRole('row').slice(1);

beforeEach(() => {
  jest.clearAllMocks();
  listarTurmas.mockResolvedValue({ data: turmas });
  listarMatriculas.mockResolvedValue({ data: matriculas });
});

test('mostra quantos alunos estão matriculados em cada turma (sem contar os cancelados)', async () => {
  renderizar(<AdminTurmas />);
  await screen.findByText('Turma A - Noite');

  await waitFor(() => expect(within(linhaDe('Turma A - Noite')).getByRole('button', { name: /3/ })).toBeInTheDocument());
  expect(within(linhaDe('Turma A - Noite')).getByTitle('Ver os alunos matriculados')).toHaveTextContent('3 / 3');
  expect(within(linhaDe('Turma B - Manhã')).getByTitle('Ver os alunos matriculados')).toHaveTextContent('1 / 30');
  expect(within(linhaDe('Turma C')).getByTitle('Ver os alunos matriculados')).toHaveTextContent('0');
});

test('abre a lista de alunos da turma, com os ativos primeiro', async () => {
  renderizar(<AdminTurmas />);
  await screen.findByText('Turma A - Noite');
  fireEvent.click(await within(linhaDe('Turma A - Noite')).findByTitle('Ver os alunos matriculados'));

  const janela = screen.getByRole('dialog', { name: 'Alunos da Turma A - Noite' });
  expect(within(janela).getByText('ADS · 2026/2')).toBeInTheDocument();
  expect(janela).toHaveTextContent('3 alunos matriculados');
  expect(janela).toHaveTextContent('0 vagas livres de 3');

  const itens = within(janela).getAllByRole('listitem');
  expect(itens.map((li) => li.querySelector('a').textContent)).toEqual([
    'Ana Souza',
    'Pedro Lima',
    'Carla Dias',
    'Bruno Alves',
  ]);
  expect(itens[0]).toHaveTextContent('ana@teste.com · matrícula em 05/10/2026');
  expect(itens[2]).toHaveTextContent('Trancada');
  expect(itens[3]).toHaveClass('cancelada');
  expect(within(itens[0]).getByRole('link')).toHaveAttribute('href', '/admin/alunos/102/editar');

  fireEvent.click(within(janela).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('turma sem alunos, singular e fechar com Esc', async () => {
  listarMatriculas.mockResolvedValue({
    data: [matricula(5, 2, 'Diego Rocha', 'ativa', { aluno: { nomeCompleto: 'Diego Rocha' }, dataMatricula: null }), matricula(7, 2, 'X', 'status_novo', { aluno: null })],
  });
  renderizar(<AdminTurmas />);
  await screen.findByText('Turma C');

  fireEvent.click(await within(linhaDe('Turma C')).findByTitle('Ver os alunos matriculados'));
  expect(screen.getByText('Nenhum aluno matriculado nesta turma ainda.')).toBeInTheDocument();
  expect(screen.getByRole('dialog')).not.toHaveTextContent('vagas livres');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(within(linhaDe('Turma B - Manhã')).getByTitle('Ver os alunos matriculados'));
  const janela = screen.getByRole('dialog');
  expect(janela).toHaveTextContent('2 alunos matriculados');
  expect(janela).toHaveTextContent('28 vagas livres de 30');
  expect(within(janela).getByText('Diego Rocha', { selector: 'strong' })).toBeInTheDocument();
  expect(janela).toHaveTextContent('matrícula em -');
  expect(within(janela).getByText('Aluno')).toBeInTheDocument();
  expect(within(janela).getByText('status_novo')).toBeInTheDocument();
});

test('uma vaga livre e um aluno no singular', async () => {
  listarTurmas.mockResolvedValue({ data: [{ ...turmas[0], capacidadeMaxima: 2 }] });
  listarMatriculas.mockResolvedValue({ data: [matricula(1, 1, 'Pedro Lima')] });
  renderizar(<AdminTurmas />);
  fireEvent.click(await screen.findByTitle('Ver os alunos matriculados'));
  expect(screen.getByRole('dialog')).toHaveTextContent('1 aluno matriculado');
  expect(screen.getByRole('dialog')).toHaveTextContent('1 vaga livre de 2');
});

test('ordena pela quantidade de matriculados', async () => {
  renderizar(<AdminTurmas />);
  await screen.findByText('Turma A - Noite');
  await within(linhaDe('Turma A - Noite')).findByTitle('Ver os alunos matriculados');

  fireEvent.click(screen.getByRole('button', { name: /Matriculados/ }));
  expect(linhas()[0]).toHaveTextContent('Turma C');
  fireEvent.click(screen.getByRole('button', { name: /Matriculados/ }));
  expect(linhas()[0]).toHaveTextContent('Turma A - Noite');
});

test('se as matrículas não carregarem, a lista de turmas funciona igual', async () => {
  listarMatriculas.mockRejectedValue(new Error('rede'));
  renderizar(<AdminTurmas />);
  await screen.findByText('Turma A - Noite');
  await waitFor(() => expect(listarMatriculas).toHaveBeenCalled());
  expect(screen.queryByTitle('Ver os alunos matriculados')).not.toBeInTheDocument();
});

test('resposta sem dados conta zero', async () => {
  listarMatriculas.mockResolvedValue({});
  renderizar(<AdminTurmas />);
  await screen.findByText('Turma A - Noite');
  expect(await within(linhaDe('Turma A - Noite')).findByTitle('Ver os alunos matriculados')).toHaveTextContent('0 / 3');
});
