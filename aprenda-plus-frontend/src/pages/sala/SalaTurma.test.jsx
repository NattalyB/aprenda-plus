import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import SalaTurma from './SalaTurma';
import { renderizar, logarAluno } from '../../testUtils';
import { abrirSala, concluirAula, desmarcarAula } from '../../services/salaService';
import { mostrarAviso } from '../../services/avisoService';

jest.mock('../../services/salaService');
jest.mock('../../services/avisoService');

const aula = (id, dados = {}) => ({
  idAula: id,
  numero: id,
  titulo: `Aula ${id}`,
  idDisciplina: 1,
  disciplina: 'Marketing',
  tipo: 'video',
  dataLiberacao: null,
  liberada: true,
  publicada: true,
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  materialUrl: null,
  conteudo: null,
  duracaoMinutos: null,
  concluida: false,
  ...dados,
});

const sala = (dados = {}) => ({
  idTurma: 3,
  turma: 'Turma ADM-B',
  curso: 'Administração',
  modalidade: 'EAD',
  diasHorarios: null,
  professor: 'Carla',
  cargaHoraria: 360,
  totalAulas: 3,
  concluidas: 1,
  percentual: 33,
  aulas: [
    aula(1, { concluida: true, conteudo: 'Primeiro parágrafo\nSegundo parágrafo', materialUrl: 'https://drive.google.com/x', duracaoMinutos: 20 }),
    aula(2, { disciplina: null, tipo: 'leitura', videoUrl: null, conteudo: 'Leia o capítulo 2' }),
    aula(3, { liberada: false, dataLiberacao: '2026-12-01', videoUrl: null }),
  ],
  avisos: [],
  certificado: null,
  ...dados,
});

const abrir = () => renderizar(<SalaTurma />, { rota: '/sala/3', caminho: '/sala/:idTurma' });
const indice = () => screen.getByRole('navigation', { name: 'Aulas da turma' });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  logarAluno();
  window.scrollTo = jest.fn();
});

test('sem login pede para entrar', () => {
  localStorage.clear();
  abrir();
  expect(screen.getByText('Faça login para entrar na sala de aula')).toBeInTheDocument();
  expect(abrirSala).not.toHaveBeenCalled();
});

test('abre direto na primeira aula que falta concluir, com o progresso no topo', async () => {
  abrirSala.mockResolvedValue(sala());
  abrir();

  expect(await screen.findByRole('heading', { name: 'Aula 2', level: 2 })).toBeInTheDocument();
  expect(abrirSala).toHaveBeenCalledWith('3');
  expect(screen.getByRole('heading', { name: 'Administração' })).toBeInTheDocument();
  expect(screen.getByText('Turma ADM-B · Prof. Carla · EAD')).toBeInTheDocument();
  expect(screen.getByText('33%')).toBeInTheDocument();
  expect(screen.getByText('1 de 3 aulas concluídas')).toBeInTheDocument();
  expect(screen.getByText('Leia o capítulo 2')).toBeInTheDocument();
  expect(screen.getByText('Leitura')).toBeInTheDocument();
  // Aulas agrupadas por disciplina
  expect(within(indice()).getByRole('heading', { name: 'Marketing' })).toBeInTheDocument();
  expect(within(indice()).getByRole('heading', { name: 'Aulas gerais' })).toBeInTheDocument();
  expect(within(indice()).getByRole('button', { name: 'Aula 1: Aula 1 (concluída)' })).toBeInTheDocument();
  expect(within(indice()).getByRole('button', { name: 'Aula 3: Aula 3 (libera em 01/12/2026)' })).toBeInTheDocument();
});

test('aula com vídeo, texto e material; navegação entre aulas', async () => {
  abrirSala.mockResolvedValue(sala());
  abrir();
  await screen.findByRole('heading', { name: 'Aula 2', level: 2 });

  fireEvent.click(within(indice()).getByRole('button', { name: /Aula 1: Aula 1/ }));
  expect(screen.getByTitle('Vídeo da aula: Aula 1')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'
  );
  expect(screen.getByText('Primeiro parágrafo')).toBeInTheDocument();
  expect(screen.getByText('Segundo parágrafo')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Abrir material de apoio/ })).toHaveAttribute('href', 'https://drive.google.com/x');
  expect(screen.getByText('Aula 1 · Marketing · 20 min')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '← Anterior' })).toBeDisabled();
  expect(window.scrollTo).toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }));
  expect(screen.getByRole('heading', { name: 'Aula 2', level: 2 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }));

  // Aula 3 ainda bloqueada: sem conteúdo e sem botão de concluir
  expect(screen.getByText(/Esta aula será liberada em/)).toHaveTextContent('01/12/2026');
  expect(screen.queryByRole('button', { name: /Marcar como concluída/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '✅ Aula concluída' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima →' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '← Anterior' }));
  expect(screen.getByRole('heading', { name: 'Aula 2', level: 2 })).toBeInTheDocument();
});

test('aula sem nada cadastrado avisa o aluno', async () => {
  abrirSala.mockResolvedValue(sala({ aulas: [aula(1, { videoUrl: null })], totalAulas: 1, concluidas: 0, percentual: 0 }));
  abrir();
  expect(await screen.findByText('O professor ainda não adicionou o conteúdo desta aula.')).toBeInTheDocument();
});

test('marcar como concluída atualiza o progresso e comemora', async () => {
  abrirSala.mockResolvedValue(sala());
  const depois = sala({ concluidas: 2, percentual: 67 });
  depois.aulas[1].concluida = true;
  concluirAula.mockResolvedValue(depois);
  abrir();
  await screen.findByRole('heading', { name: 'Aula 2', level: 2 });

  fireEvent.click(screen.getByRole('button', { name: '✓ Marcar como concluída' }));

  expect(await screen.findByText('67%')).toBeInTheDocument();
  expect(concluirAula).toHaveBeenCalledWith(2);
  expect(mostrarAviso).toHaveBeenCalledWith('Aula concluída! 🎉', 'sucesso');
  expect(screen.getByRole('button', { name: '✅ Aula concluída' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Clique de novo se quiser desmarcar.')).toBeInTheDocument();
});

test('ao concluir a última aula, avisa que o certificado foi liberado', async () => {
  abrirSala.mockResolvedValue(sala({ aulas: [aula(1)], totalAulas: 1, concluidas: 0, percentual: 0 }));
  concluirAula.mockResolvedValue(sala({ aulas: [aula(1, { concluida: true })], totalAulas: 1, concluidas: 1, percentual: 100 }));
  abrir();
  fireEvent.click(await screen.findByRole('button', { name: '✓ Marcar como concluída' }));

  await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith(expect.stringContaining('certificado'), 'sucesso'));
  expect(screen.getByRole('tab', { name: '🎓 Certificado ✨' })).toBeInTheDocument();
});

test('desmarcar não comemora; erro do servidor vira aviso', async () => {
  abrirSala.mockResolvedValue(sala());
  const semNenhuma = sala({ concluidas: 0, percentual: 0 });
  semNenhuma.aulas[0].concluida = false;
  desmarcarAula.mockResolvedValueOnce(semNenhuma);
  concluirAula.mockRejectedValue({ response: { data: { mensagem: 'Esta aula ainda não foi liberada.' } } });
  abrir();
  await screen.findByRole('heading', { name: 'Aula 2', level: 2 });

  fireEvent.click(within(indice()).getByRole('button', { name: /Aula 1: Aula 1/ }));
  fireEvent.click(screen.getByRole('button', { name: '✅ Aula concluída' }));
  await waitFor(() => expect(desmarcarAula).toHaveBeenCalledWith(1));
  expect(await screen.findByText('0%')).toBeInTheDocument();
  expect(mostrarAviso).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: '✓ Marcar como concluída' }));
  await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('Esta aula ainda não foi liberada.', 'erro'));
});

test('erro genérico ao salvar', async () => {
  abrirSala.mockResolvedValue(sala());
  desmarcarAula.mockRejectedValue(new Error('x'));
  abrir();
  await screen.findByRole('heading', { name: 'Aula 2', level: 2 });
  fireEvent.click(within(indice()).getByRole('button', { name: /Aula 1: Aula 1/ }));
  fireEvent.click(screen.getByRole('button', { name: '✅ Aula concluída' }));
  await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('Não foi possível salvar. Tente novamente.', 'erro'));
});

test('mural mostra os avisos com o fixado em destaque', async () => {
  abrirSala.mockResolvedValue(sala({
    avisos: [
      { idAviso: 1, titulo: 'Prova', mensagem: 'Dia 10', autor: 'Carla', fixado: true, criadoEm: '2026-10-12T19:30:00' },
      { idAviso: 2, titulo: 'Oi', mensagem: 'Bem-vindos', autor: null, fixado: false, criadoEm: null },
    ],
  }));
  abrir();
  await screen.findByRole('heading', { name: 'Aula 2', level: 2 });

  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural (2)' }));

  const mural = screen.getByRole('region', { name: 'Mural de avisos' });
  expect(within(mural).getByLabelText('Aviso fixado')).toBeInTheDocument();
  expect(within(mural).getByText('Carla · 12/10/2026 às 19:30')).toBeInTheDocument();
  expect(within(mural).getByText('Bem-vindos')).toBeInTheDocument();
});

test('mural vazio e turma ainda sem aulas', async () => {
  abrirSala.mockResolvedValue(sala({ aulas: [], avisos: null, totalAulas: 0, concluidas: 0, percentual: 0, professor: null, curso: null }));
  abrir();

  expect(await screen.findByText('O professor está preparando as aulas desta turma. Volte em breve!')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Turma ADM-B' })).toBeInTheDocument();
  expect(screen.getByText('0 de 0 aulas concluídas')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural' }));
  expect(screen.getByText('Nenhum aviso por enquanto.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '🎓 Certificado' }));
  expect(screen.getByText('As aulas ainda estão sendo preparadas.')).toBeInTheDocument();
});

test('certificado: bloqueado enquanto faltam aulas', async () => {
  abrirSala.mockResolvedValue(sala());
  abrir();
  await screen.findByRole('heading', { name: 'Aula 2', level: 2 });
  fireEvent.click(screen.getByRole('tab', { name: '🎓 Certificado' }));
  expect(screen.getByText('Conclua todas as aulas para liberar o certificado')).toBeInTheDocument();
  expect(screen.getByText('Faltam 2 de 3 aulas.')).toBeInTheDocument();
});

test.each([
  [null, 'Emitir certificado', 'Parabéns, você concluiu o curso!'],
  [{ codigo: 'ABCD-EFGH-JKLM' }, 'Ver certificado', 'Seu certificado está pronto'],
])('certificado liberado (%p)', async (certificado, botao, titulo) => {
  abrirSala.mockResolvedValue(sala({ concluidas: 3, percentual: 100, certificado, aulas: [aula(1, { concluida: true }), aula(2, { concluida: true }), aula(3, { concluida: true })] }));
  abrir();
  await screen.findByText('100%');

  fireEvent.click(screen.getByRole('tab', { name: /Certificado/ }));
  expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: botao }));
  expect(screen.getByTestId('endereco')).toHaveTextContent('/sala/3/certificado');
});

test('quem não tem matrícula vê a mensagem do servidor', async () => {
  abrirSala.mockRejectedValueOnce({ response: { data: { mensagem: 'Você não está matriculado nesta turma.' } } });
  abrir();
  expect(await screen.findByText('Você não está matriculado nesta turma.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Minhas turmas' })).toHaveAttribute('href', '/sala');
});

test('erro genérico ao abrir a sala', async () => {
  abrirSala.mockRejectedValueOnce(new Error('x'));
  abrir();
  expect(await screen.findByText('Não foi possível abrir a sala de aula.')).toBeInTheDocument();
});
