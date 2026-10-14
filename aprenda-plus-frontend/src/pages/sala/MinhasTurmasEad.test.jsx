import { screen, within } from '@testing-library/react';
import MinhasTurmasEad from './MinhasTurmasEad';
import { renderizar, logarAluno } from '../../testUtils';
import { listarMinhasTurmasEad } from '../../services/salaService';

jest.mock('../../services/salaService');

const turma = (dados = {}) => ({
  idTurma: 3,
  turma: 'Turma ADM-B',
  curso: 'Administração',
  professor: 'Carla',
  statusMatricula: 'ativa',
  podeAcessar: true,
  totalAulas: 6,
  concluidas: 2,
  percentual: 33,
  temCertificado: false,
  ...dados,
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('sem login pede para entrar', () => {
  renderizar(<MinhasTurmasEad />);
  expect(screen.getByText('Faça login para entrar na sala de aula')).toBeInTheDocument();
  expect(listarMinhasTurmasEad).not.toHaveBeenCalled();
});

test('mostra o progresso de cada turma e o botão certo', async () => {
  logarAluno();
  listarMinhasTurmasEad.mockResolvedValue([
    turma(),
    turma({ idTurma: 4, curso: null, turma: 'Turma Nova', professor: null, concluidas: 0, percentual: 0 }),
    turma({ idTurma: 5, curso: 'Redes', totalAulas: 0, concluidas: 0, percentual: 0, temCertificado: true }),
    turma({ idTurma: 6, curso: 'Design', podeAcessar: false, statusMatricula: 'trancada' }),
    turma({ idTurma: 7, curso: 'Outro', podeAcessar: false, statusMatricula: 'suspensa' }),
  ]);
  renderizar(<MinhasTurmasEad />);

  const adm = (await screen.findByText('Administração')).closest('li');
  expect(within(adm).getByText('33% concluído · 2 de 6 aulas')).toBeInTheDocument();
  expect(within(adm).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  expect(within(adm).getByRole('link', { name: 'Continuar →' })).toHaveAttribute('href', '/sala/3');

  const nova = screen.getByRole('heading', { name: 'Turma Nova' }).closest('li');
  expect(within(nova).getByRole('link', { name: 'Entrar na sala →' })).toBeInTheDocument();

  const redes = screen.getByText('Redes').closest('li');
  expect(within(redes).getByText('As aulas estão sendo preparadas pelo professor.')).toBeInTheDocument();
  expect(within(redes).getByText('🎓 Certificado emitido')).toBeInTheDocument();

  expect(screen.getByText(/Matrícula trancada/)).toBeInTheDocument();
  expect(screen.getByText('Sua matrícula nesta turma não está ativa.')).toBeInTheDocument();
  expect(screen.getByText('Design').closest('li')).toHaveClass('bloqueada');
});

test('sem turmas explica quando a sala aparece', async () => {
  logarAluno();
  listarMinhasTurmasEad.mockResolvedValue(null);
  renderizar(<MinhasTurmasEad />);
  expect(await screen.findByText('Sua sala de aula ainda está vazia')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Minhas inscrições' })).toHaveAttribute('href', '/minhas-inscricoes');
});

test('erro ao carregar', async () => {
  logarAluno();
  listarMinhasTurmasEad.mockRejectedValue(new Error('rede'));
  renderizar(<MinhasTurmasEad />);
  expect(await screen.findByText('Não foi possível carregar suas turmas.')).toBeInTheDocument();
});
