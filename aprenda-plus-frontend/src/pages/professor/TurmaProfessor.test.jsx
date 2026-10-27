import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderizar } from '../../testUtils';
import TurmaProfessor from './TurmaProfessor';
import * as docente from '../../services/docenteService';

jest.mock('../../services/docenteService');

const aula = (id, dados = {}) => ({
  idAula: id, numero: id, titulo: `Aula ${id}`, tipo: 'video', disciplina: null, publicada: true,
  dataLiberacao: null, videoUrl: null, materialUrl: null, duracaoMinutos: null, ...dados,
});

const sala = (dados = {}) => ({
  idPlano: 9, idTurma: 5, turma: 'Turma ESI-A', curso: 'Engenharia de Software', professor: 'Roberto',
  aulas: [
    aula(1, { disciplina: 'Banco', videoUrl: 'https://youtu.be/x', materialUrl: 'https://m', duracaoMinutos: 20 }),
    aula(2, { publicada: false, dataLiberacao: '2999-01-01', tipo: 'leitura' }),
  ],
  avisos: [{ idAviso: 4, titulo: 'Prova', mensagem: 'Dia 10', autor: 'Roberto', fixado: false, criadoEm: '2026-10-27T10:00:00' }],
  ...dados,
});

const abrir = () => renderizar(<TurmaProfessor />, { rota: '/professor/turmas/5', caminho: '/professor/turmas/:idTurma' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  docente.professorLogado.mockReturnValue(true);
  docente.salaDaTurma.mockResolvedValue(sala());
  docente.disciplinasDaTurma.mockResolvedValue([{ idDisciplina: 2, nome: 'Banco' }]);
  docente.andamentoDaMinhaTurma.mockResolvedValue([
    { idAluno: 7, nome: 'Lucas', email: 'l@x.com', status: 'ativa', concluidas: 1, totalAulas: 2, percentual: 50, ultimaAtividade: null, certificado: false },
  ]);
});

afterEach(() => window.confirm.mockRestore());

test('sem login vai para o login de professor', () => {
  docente.professorLogado.mockReturnValue(false);
  abrir();
  expect(screen.getByTestId('endereco')).toHaveTextContent('/login');
});

test('abre no andamento dos alunos e mostra a turma', async () => {
  abrir();
  expect(screen.getByText('Carregando turma...')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Turma ESI-A' })).toBeInTheDocument();
  expect(screen.getByText('Engenharia de Software · Responsável pela sala: Roberto')).toBeInTheDocument();
  expect(await screen.findByText('Lucas')).toBeInTheDocument();
  expect(docente.andamentoDaMinhaTurma).toHaveBeenCalledWith('5');
  expect(screen.getByRole('link', { name: '← Minhas turmas' })).toHaveAttribute('href', '/professor');
});

test('turma de outro professor e erro', async () => {
  docente.salaDaTurma.mockRejectedValueOnce({ response: { status: 403 } });
  const { unmount } = abrir();
  expect(await screen.findByText('Esta turma não é sua.')).toBeInTheDocument();
  unmount();

  docente.salaDaTurma.mockRejectedValueOnce({ response: { data: { mensagem: 'Turma não encontrada.' } } });
  docente.disciplinasDaTurma.mockRejectedValueOnce(new Error('x'));
  const segundo = abrir();
  expect(await screen.findByText('Turma não encontrada.')).toBeInTheDocument();
  segundo.unmount();

  docente.salaDaTurma.mockRejectedValueOnce(new Error('rede'));
  abrir();
  expect(await screen.findByText('Não foi possível carregar a turma.')).toBeInTheDocument();
});

test('cadastra, edita, reordena e exclui aulas', async () => {
  docente.criarAula.mockResolvedValueOnce(sala({ aulas: [aula(1), aula(2), aula(3)] }));
  docente.editarAula.mockResolvedValueOnce(sala());
  docente.moverAula.mockResolvedValueOnce(sala()).mockRejectedValueOnce(new Error('x'));
  docente.excluirAula.mockResolvedValueOnce(sala({ aulas: [aula(1)] })).mockRejectedValueOnce(new Error('x'));
  abrir();
  await screen.findByRole('heading', { name: 'Turma ESI-A' });

  fireEvent.click(screen.getByRole('tab', { name: '📚 Aulas (2)' }));
  expect(screen.getByText('Banco')).toBeInTheDocument();
  expect(screen.getByText('▶ Vídeo')).toBeInTheDocument();
  expect(screen.getByText('📎 Material')).toBeInTheDocument();
  expect(screen.getByText('20 min')).toBeInTheDocument();
  expect(screen.getByText('Rascunho')).toBeInTheDocument();
  expect(screen.getByText(/Libera em/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '+ Nova aula' }));
  const form = screen.getByRole('dialog', { name: 'Nova aula' });
  expect(within(form).getByRole('option', { name: 'Banco' })).toBeInTheDocument();
  fireEvent.change(within(form).getByLabelText('Título da aula'), { target: { value: 'Aula nova' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar aula' }));
  expect(await screen.findByText('Aula cadastrada.')).toBeInTheDocument();
  expect(docente.criarAula).toHaveBeenCalledWith('5', expect.objectContaining({ titulo: 'Aula nova' }));
  expect(screen.getByRole('tab', { name: '📚 Aulas (3)' })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Editar aula' })).getByRole('button', { name: 'Salvar aula' }));
  expect(await screen.findByText('Aula atualizada.')).toBeInTheDocument();
  expect(docente.editarAula).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Aula 1' }));

  fireEvent.click(screen.getByRole('button', { name: 'Descer a aula Aula 1' }));
  await waitFor(() => expect(docente.moverAula).toHaveBeenCalledWith(1, 'baixo'));
  fireEvent.click(screen.getByRole('button', { name: 'Subir a aula Aula 2' }));
  expect(await screen.findByText('Não foi possível mudar a ordem.')).toBeInTheDocument();

  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[1]);
  expect(docente.excluirAula).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[1]);
  expect(await screen.findByText('Aula excluída.')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
  expect(await screen.findByText('Não foi possível excluir a aula.')).toBeInTheDocument();
});

test('sala ainda não criada e turma sem aulas', async () => {
  docente.salaDaTurma.mockResolvedValueOnce(sala({ idPlano: null, aulas: null, avisos: null, professor: null }));
  const { unmount } = abrir();
  await screen.findByRole('heading', { name: 'Turma ESI-A' });
  expect(screen.getByText('Engenharia de Software')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '📚 Aulas (0)' }));
  expect(screen.getByText(/ainda não foi criada/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '+ Nova aula' })).not.toBeInTheDocument();
  unmount();

  docente.salaDaTurma.mockResolvedValueOnce(sala({ aulas: [] }));
  abrir();
  await screen.findByRole('heading', { name: 'Turma ESI-A' });
  fireEvent.click(screen.getByRole('tab', { name: '📚 Aulas (0)' }));
  expect(screen.getByText(/Nenhuma aula ainda/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+ Nova aula' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('mural: publica, edita e exclui avisos', async () => {
  docente.publicarAviso.mockResolvedValueOnce(sala()).mockResolvedValueOnce(sala());
  docente.editarAviso.mockResolvedValueOnce(sala());
  docente.excluirAviso.mockResolvedValueOnce(sala({ avisos: [] }));
  abrir();
  await screen.findByRole('heading', { name: 'Turma ESI-A' });
  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural (1)' }));
  expect(screen.getByText('Dia 10')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Aula extra' } });
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Sábado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }));
  expect(await screen.findByText('Aviso publicado no mural.')).toBeInTheDocument();
  expect(docente.publicarAviso).toHaveBeenCalledWith('5', expect.objectContaining({ titulo: 'Aula extra', enviarEmail: false }));

  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Outro' } });
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Texto' } });
  fireEvent.click(screen.getByLabelText(/Avisar os alunos da turma por e-mail/));
  fireEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }));
  expect(await screen.findByText('Aviso publicado e enviado por e-mail aos alunos.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
  fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
  expect(await screen.findByText('Aviso atualizado.')).toBeInTheDocument();
  expect(docente.editarAviso).toHaveBeenCalledWith(4, { titulo: 'Prova', mensagem: 'Dia 10', fixado: false });

  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: /Excluir/ }));
  expect(docente.excluirAviso).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Excluir/ }));
  expect(await screen.findByText('Aviso excluído.')).toBeInTheDocument();
});

test('erro ao excluir aviso', async () => {
  docente.excluirAviso.mockRejectedValueOnce({ response: { data: { mensagem: 'Esta turma não é sua.' } } });
  abrir();
  await screen.findByRole('heading', { name: 'Turma ESI-A' });
  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural (1)' }));
  fireEvent.click(screen.getByRole('button', { name: /Excluir/ }));
  expect(await screen.findByText('Esta turma não é sua.')).toBeInTheDocument();
});
