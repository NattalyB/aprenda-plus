// Painel: Sala de aula (EAD)
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderizar } from '../../testUtils';
import AdminSalaDeAula from './AdminSalaDeAula';
import { listarTurmas } from '../../services/turmaService';
import { listarProfessores } from '../../services/professorService';
import { listarDisciplinas } from '../../services/disciplinaService';
import {
  resumoDasSalas,
  buscarSalaDaTurma,
  andamentoDaTurma,
  definirProfessorDaSala,
  criarAulaEad,
  atualizarAulaEad,
  excluirAulaEad,
  excluirAulasEad,
  moverAulaEad,
  copiarAulasDaTurma,
  publicarAvisoEad,
  excluirAvisoEad,
  editarAvisoEad,
} from '../../services/conteudoEadService';
import { importarPlanilha } from '../../services/importacaoService';

jest.mock('../../services/turmaService');
jest.mock('../../services/professorService');
jest.mock('../../services/disciplinaService');
jest.mock('../../services/conteudoEadService');
jest.mock('../../services/importacaoService');

const turmas = [
  { idTurma: 3, nome: 'Turma ADM-B', curso: { idCurso: 1, nome: 'Administração' } },
  { idTurma: 4, nome: 'Turma ADM-C', curso: { idCurso: 1, nome: 'Administração' } },
  { idTurma: 5, nome: 'Turma Livre' },
];

const aula = (id, dados = {}) => ({
  idAula: id,
  numero: id,
  titulo: `Aula ${id}`,
  idDisciplina: null,
  disciplina: null,
  tipo: 'video',
  dataLiberacao: null,
  liberada: true,
  publicada: true,
  videoUrl: null,
  materialUrl: null,
  conteudo: null,
  duracaoMinutos: null,
  concluida: false,
  ...dados,
});

const sala = (dados = {}) => ({
  idPlano: 9,
  idTurma: 3,
  turma: 'Turma ADM-B',
  idCurso: 1,
  curso: 'Administração',
  idProfessor: 2,
  professor: 'Carla',
  aulas: [
    aula(1, { disciplina: 'Marketing', idDisciplina: 1, videoUrl: 'https://youtu.be/dQw4w9WgXcQ', materialUrl: 'https://x', duracaoMinutos: 20 }),
    aula(2, { dataLiberacao: '2999-01-01', publicada: false, tipo: 'leitura' }),
  ],
  avisos: [],
  ...dados,
});

const abrir = (rota = '/admin/aulas?turma=3') => renderizar(<AdminSalaDeAula />, { rota });
const linhaDaAula = (titulo) => screen.getByText(titulo).closest('li');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  listarTurmas.mockResolvedValue({ data: turmas });
  resumoDasSalas.mockResolvedValue({ 3: 2, 4: 1 });
  listarProfessores.mockResolvedValue({
    data: [
      { idProfessor: 2, nomeCompleto: 'Carla', status: 'ativo' },
      { idProfessor: 5, nomeCompleto: 'Rafael' },
      { idProfessor: 6, nomeCompleto: 'Inativo', status: 'inativo' },
    ],
  });
  listarDisciplinas.mockResolvedValue({
    data: [
      { idDisciplina: 1, nome: 'Marketing', cursos: [{ idCurso: 1 }] },
      { idDisciplina: 2, nome: 'Redes TCP', cursos: [{ idCurso: 2 }] },
      { idDisciplina: 3, nome: 'Sem curso' },
    ],
  });
  buscarSalaDaTurma.mockResolvedValue(sala());
});

afterEach(() => window.confirm.mockRestore());

test('sem turma escolhida pede para escolher e mostra a quantidade de aulas de cada uma', async () => {
  abrir('/admin/aulas');
  expect(await screen.findByText('Escolha uma turma para montar a sala de aula dela.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('option', { name: 'Turma ADM-B — Administração (2 aulas)' })).toBeInTheDocument());
  expect(screen.getByRole('option', { name: 'Turma ADM-C — Administração (1 aula)' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Turma Livre' })).toBeInTheDocument();
  expect(buscarSalaDaTurma).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Turma'), { target: { value: '3' } });
  expect(await screen.findByText('Aula 1')).toBeInTheDocument();
  expect(buscarSalaDaTurma).toHaveBeenCalledWith('3');

  fireEvent.change(screen.getByLabelText('Turma'), { target: { value: '' } });
  expect(await screen.findByText('Escolha uma turma para montar a sala de aula dela.')).toBeInTheDocument();
});

test('lista as aulas com os selos e só professores ativos', async () => {
  abrir();
  const primeira = (await screen.findByText('Aula 1')).closest('li');
  expect(within(primeira).getByText('Marketing')).toBeInTheDocument();
  expect(within(primeira).getByText('▶ Vídeo')).toBeInTheDocument();
  expect(within(primeira).getByText('📎 Material')).toBeInTheDocument();
  expect(within(primeira).getByText('20 min')).toBeInTheDocument();
  const segunda = linhaDaAula('Aula 2');
  expect(segunda).toHaveClass('rascunho');
  expect(within(segunda).getByText('Rascunho')).toBeInTheDocument();
  expect(within(segunda).getByText('🔒 Libera em 01/01/2999')).toBeInTheDocument();
  expect(within(segunda).getByText(/Leitura/)).toBeInTheDocument();
  expect(within(primeira).getByRole('button', { name: 'Subir a aula Aula 1' })).toBeDisabled();
  expect(within(segunda).getByRole('button', { name: 'Descer a aula Aula 2' })).toBeDisabled();

  const professores = within(screen.getByLabelText('Professor responsável')).getAllByRole('option').map((o) => o.textContent);
  expect(professores).toEqual(['Escolha o professor...', 'Carla', 'Rafael']);
  expect(screen.getByRole('button', { name: 'Salvar professor' })).toBeDisabled();
});

test('sala nova: sugere o professor e cria a sala', async () => {
  buscarSalaDaTurma.mockResolvedValue(sala({ idPlano: null, aulas: [], professor: 'Carla' }));
  definirProfessorDaSala.mockResolvedValue(sala({ aulas: [] }));
  abrir();

  expect(await screen.findByText('Sugestão: Carla, professor(a) desta turma.')).toBeInTheDocument();
  expect(screen.getByText('Escolha o professor responsável para começar a montar as aulas.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ Nova aula' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Criar sala de aula' }));
  expect(await screen.findByText('Sala de aula criada! Agora cadastre as aulas.')).toBeInTheDocument();
  expect(definirProfessorDaSala).toHaveBeenCalledWith('3', 2);
  expect(screen.getByText('Nenhuma aula ainda. Clique em "+ Nova aula", importe uma planilha ou copie as aulas de outra turma.')).toBeInTheDocument();
});

test('sala nova sem professor ligado à turma', async () => {
  buscarSalaDaTurma.mockResolvedValue(sala({ idPlano: null, idProfessor: null, professor: null, aulas: [] }));
  abrir();
  expect(await screen.findByText('A sala de aula da turma é criada assim que você escolher o professor.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Criar sala de aula' }));
  expect(screen.getByText('Escolha o professor responsável.')).toBeInTheDocument();
  expect(definirProfessorDaSala).not.toHaveBeenCalled();
});

test('trocar o professor e erro do servidor', async () => {
  definirProfessorDaSala.mockResolvedValueOnce(sala({ idProfessor: 5, professor: 'Rafael' }))
    .mockRejectedValueOnce({ response: { data: { mensagem: 'Esse professor não está ativo. Escolha outro.' } } })
    .mockRejectedValueOnce(new Error('x'));
  abrir();
  await screen.findByText('Aula 1');

  fireEvent.change(screen.getByLabelText('Professor responsável'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar professor' }));
  expect(await screen.findByText('Professor responsável atualizado.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Professor responsável'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar professor' }));
  expect(await screen.findByText('Esse professor não está ativo. Escolha outro.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar professor' }));
  expect(await screen.findByText('Não foi possível salvar o professor.')).toBeInTheDocument();
});

test('nova aula: confere o título e o link do YouTube antes de salvar', async () => {
  criarAulaEad.mockResolvedValue(sala({ aulas: [...sala().aulas, aula(3, { titulo: 'Funções' })] }));
  abrir();
  await screen.findByText('Aula 1');

  fireEvent.click(screen.getByRole('button', { name: '+ Nova aula' }));
  const janela = screen.getByRole('dialog', { name: 'Nova aula' });
  // só as disciplinas do curso da turma aparecem
  const disciplinas = within(within(janela).getByLabelText('Disciplina')).getAllByRole('option').map((o) => o.textContent);
  expect(disciplinas).toEqual(['Sem disciplina (aula geral)', 'Marketing']);

  fireEvent.click(within(janela).getByRole('button', { name: 'Salvar aula' }));
  expect(within(janela).getByText('Informe o título da aula.')).toBeInTheDocument();

  fireEvent.change(within(janela).getByLabelText('Título da aula'), { target: { value: '  Funções  ' } });
  fireEvent.change(within(janela).getByLabelText(/Link do vídeo/), { target: { value: 'https://vimeo.com/1' } });
  expect(within(janela).getByText('Esse link não é de um vídeo do YouTube.')).toBeInTheDocument();
  fireEvent.click(within(janela).getByRole('button', { name: 'Salvar aula' }));
  expect(within(janela).getByText(/Use um link de vídeo do YouTube/)).toBeInTheDocument();
  expect(criarAulaEad).not.toHaveBeenCalled();

  fireEvent.change(within(janela).getByLabelText(/Link do vídeo/), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
  expect(within(janela).getByText('Vídeo reconhecido ✓')).toBeInTheDocument();
  expect(within(janela).getByAltText('Prévia do vídeo')).toHaveAttribute('src', 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  fireEvent.change(within(janela).getByLabelText('Disciplina'), { target: { value: '1' } });
  fireEvent.change(within(janela).getByLabelText('Tipo'), { target: { value: 'ao_vivo' } });
  fireEvent.change(within(janela).getByLabelText(/Liberar a partir de/), { target: { value: '2026-11-03' } });
  fireEvent.change(within(janela).getByLabelText(/Duração/), { target: { value: '45' } });
  fireEvent.change(within(janela).getByLabelText(/material de apoio/), { target: { value: ' https://drive.google.com/x ' } });
  fireEvent.change(within(janela).getByLabelText(/Texto da aula/), { target: { value: 'Resumo' } });
  fireEvent.click(within(janela).getByLabelText(/Publicar para os alunos/));
  fireEvent.click(within(janela).getByRole('button', { name: 'Salvar aula' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(criarAulaEad).toHaveBeenCalledWith('3', {
    titulo: 'Funções',
    idDisciplina: 1,
    tipo: 'ao_vivo',
    dataLiberacao: '2026-11-03',
    duracaoMinutos: 45,
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    materialUrl: 'https://drive.google.com/x',
    conteudo: 'Resumo',
    publicada: false,
  });
  expect(screen.getByRole('status')).toHaveTextContent('Aula cadastrada.');
  expect(screen.getByText('Funções')).toBeInTheDocument();
});

test('editar aula traz os dados e mostra o erro do servidor', async () => {
  atualizarAulaEad.mockRejectedValueOnce({ response: { data: { mensagem: 'Tipo de aula inválido.' } } })
    .mockRejectedValueOnce(new Error('x'))
    .mockResolvedValueOnce(sala());
  abrir();
  fireEvent.click(within(await screen.findByText('Aula 1').then((t) => t.closest('li'))).getByRole('button', { name: 'Editar' }));

  const janela = screen.getByRole('dialog', { name: 'Editar aula' });
  expect(within(janela).getByLabelText('Título da aula')).toHaveValue('Aula 1');
  expect(within(janela).getByLabelText('Disciplina')).toHaveValue('1');
  expect(within(janela).getByLabelText(/Duração/)).toHaveValue(20);
  expect(within(janela).getByLabelText(/Publicar/)).toBeChecked();

  fireEvent.click(within(janela).getByRole('button', { name: 'Salvar aula' }));
  expect(await within(janela).findByText('Tipo de aula inválido.')).toBeInTheDocument();
  fireEvent.click(within(janela).getByRole('button', { name: 'Salvar aula' }));
  expect(await within(janela).findByText('Não foi possível salvar a aula.')).toBeInTheDocument();
  fireEvent.click(within(janela).getByRole('button', { name: 'Salvar aula' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(atualizarAulaEad).toHaveBeenLastCalledWith(1, expect.objectContaining({ titulo: 'Aula 1', duracaoMinutos: 20 }));
  expect(screen.getByRole('status')).toHaveTextContent('Aula atualizada.');
});

test('editar aula rascunho sem dados opcionais; fechar com Esc ou Cancelar', async () => {
  abrir();
  fireEvent.click(within((await screen.findByText('Aula 2')).closest('li')).getByRole('button', { name: 'Editar' }));
  const janela = screen.getByRole('dialog');
  expect(within(janela).getByLabelText(/Publicar/)).not.toBeChecked();
  expect(within(janela).getByLabelText('Disciplina')).toHaveValue('');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '+ Nova aula' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+ Nova aula' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('mudar a ordem e excluir aulas', async () => {
  moverAulaEad.mockResolvedValueOnce(sala()).mockRejectedValueOnce(new Error('x'));
  excluirAulaEad.mockResolvedValueOnce(sala({ aulas: [aula(1)] })).mockRejectedValueOnce(new Error('x'));
  abrir();
  await screen.findByText('Aula 1');

  fireEvent.click(screen.getByRole('button', { name: 'Descer a aula Aula 1' }));
  await waitFor(() => expect(moverAulaEad).toHaveBeenCalledWith(1, 'baixo'));
  fireEvent.click(screen.getByRole('button', { name: 'Subir a aula Aula 2' }));
  expect(await screen.findByText('Não foi possível mudar a ordem.')).toBeInTheDocument();

  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(within(linhaDaAula('Aula 2')).getByRole('button', { name: 'Excluir' }));
  expect(excluirAulaEad).not.toHaveBeenCalled();

  fireEvent.click(within(linhaDaAula('Aula 2')).getByRole('button', { name: 'Excluir' }));
  expect(await screen.findByText('Aula excluída.')).toBeInTheDocument();
  expect(screen.queryByText('Aula 2')).not.toBeInTheDocument();

  fireEvent.click(within(linhaDaAula('Aula 1')).getByRole('button', { name: 'Excluir' }));
  expect(await screen.findByText('Não foi possível excluir a aula.')).toBeInTheDocument();
});

test('selecionar várias aulas e excluir de uma vez', async () => {
  const quatro = sala({
    aulas: [
      aula(1, { titulo: 'Boas-vindas' }),
      aula(2, { titulo: 'Introdução', disciplina: 'Marketing' }),
      aula(3, { titulo: 'Boas-vindas' }),
      aula(4, { titulo: 'Introdução', disciplina: 'Marketing' }),
    ],
  });
  buscarSalaDaTurma.mockResolvedValue(quatro);
  excluirAulasEad
    .mockResolvedValueOnce(sala({ aulas: [aula(1, { titulo: 'Boas-vindas' }), aula(2, { titulo: 'Introdução', disciplina: 'Marketing' })] }))
    .mockRejectedValueOnce(new Error('x'));
  abrir();
  await screen.findAllByText('Boas-vindas');

  // sem nada marcado, o botão de excluir em lote não aparece
  expect(screen.queryByRole('button', { name: /Excluir selecionadas/ })).not.toBeInTheDocument();

  // marcar e desmarcar uma aula
  const caixas = screen.getAllByRole('checkbox', { name: /Selecionar a aula/ });
  fireEvent.click(caixas[0]);
  expect(screen.getByText('1 de 4 selecionadas')).toBeInTheDocument();
  fireEvent.click(caixas[0]);
  expect(screen.getByText('Selecionar todas')).toBeInTheDocument();

  // selecionar todas e limpar
  fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
  expect(screen.getByText('4 de 4 selecionadas')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: '4 de 4 selecionadas' }));
  expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar todas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));
  expect(screen.getByText('Selecionar todas')).toBeInTheDocument();

  // marcar só as repetidas (fica a primeira de cada)
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar repetidas' }));
  expect(screen.getByText(/2 aulas repetidas marcadas/)).toBeInTheDocument();

  // cancelar a confirmação não exclui
  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir selecionadas (2)' }));
  expect(excluirAulasEad).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Excluir selecionadas (2)' }));
  expect(await screen.findByText('2 aulas excluídas.')).toBeInTheDocument();
  expect(excluirAulasEad).toHaveBeenCalledWith('3', [3, 4]);
  expect(screen.getAllByRole('checkbox', { name: /Selecionar a aula/ })).toHaveLength(2);

  // sem repetidas agora; erro do servidor ao excluir uma
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar repetidas' }));
  expect(screen.getByText('Nenhuma aula repetida nesta turma.')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('checkbox', { name: /Selecionar a aula/ })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir selecionadas (1)' }));
  expect(await screen.findByText('Não foi possível excluir as aulas selecionadas.')).toBeInTheDocument();
});

test('copiar as aulas de outra turma', async () => {
  copiarAulasDaTurma.mockResolvedValueOnce({ copiadas: 1, plano: sala({ aulas: [...sala().aulas, aula(3)] }) })
    .mockResolvedValueOnce({ copiadas: 3, plano: sala() })
    .mockRejectedValueOnce({ response: { data: { mensagem: 'A turma escolhida não tem aulas para copiar.' } } });
  abrir();
  await screen.findByText('Aula 1');

  const origem = screen.getByLabelText('Copiar aulas de');
  // só aparecem outras turmas que já têm aulas
  expect(within(origem).getAllByRole('option').map((o) => o.textContent)).toEqual(['Escolha a turma...', 'Turma ADM-C (1 aula)']);
  expect(screen.getByRole('button', { name: 'Copiar' })).toBeDisabled();

  fireEvent.change(origem, { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  expect(await screen.findByText('1 aula copiada. Confira as datas de liberação.')).toBeInTheDocument();
  expect(copiarAulasDaTurma).toHaveBeenCalledWith('3', 4);
  expect(screen.getByText('Aula 3')).toBeInTheDocument();

  fireEvent.change(origem, { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  expect(await screen.findByText('3 aulas copiadas. Confira as datas de liberação.')).toBeInTheDocument();

  fireEvent.change(origem, { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  expect(await screen.findByText('A turma escolhida não tem aulas para copiar.')).toBeInTheDocument();
});

test('sem outras turmas com aulas, a cópia fica desligada', async () => {
  resumoDasSalas.mockResolvedValue({ 3: 2 });
  abrir();
  await screen.findByText('Aula 1');
  expect(screen.getByLabelText('Copiar aulas de')).toBeDisabled();
  expect(screen.getByRole('option', { name: 'Nenhuma outra turma com aulas' })).toBeInTheDocument();
});

test('mural: publica com e-mail, valida e exclui', async () => {
  const comAviso = sala({
    avisos: [{ idAviso: 7, titulo: 'Prova', mensagem: 'Dia 10', autor: 'Ana', fixado: true, criadoEm: '2026-10-12T19:30:00' }],
  });
  publicarAvisoEad.mockResolvedValueOnce(comAviso).mockResolvedValueOnce(comAviso).mockRejectedValueOnce(new Error('x'));
  excluirAvisoEad.mockResolvedValueOnce(sala()).mockRejectedValueOnce(new Error('x'));
  abrir();
  await screen.findByText('Aula 1');

  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural (0)' }));
  expect(screen.getByText('Nenhum aviso publicado nesta turma.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }));
  expect(screen.getByText('Preencha o título e a mensagem do aviso.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Prova' } });
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Dia 10' } });
  fireEvent.click(screen.getByLabelText(/Fixar no topo/));
  fireEvent.click(screen.getByLabelText(/Avisar os alunos/));
  fireEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }));

  expect(await screen.findByText('Aviso publicado e enviado por e-mail aos alunos.')).toBeInTheDocument();
  expect(publicarAvisoEad).toHaveBeenCalledWith('3', { titulo: 'Prova', mensagem: 'Dia 10', fixado: true, enviarEmail: true });
  expect(screen.getByLabelText('Título')).toHaveValue('');
  expect(screen.getByText('Ana · 12/10/2026 às 19:30')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Outro' } });
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Texto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }));
  expect(await screen.findByText('Aviso publicado no mural.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Outro' } });
  fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Texto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }));
  expect(await screen.findByText('Não foi possível publicar o aviso.')).toBeInTheDocument();

  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir aviso Prova' }));
  expect(excluirAvisoEad).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Excluir aviso Prova' }));
  expect(await screen.findByText('Aviso excluído.')).toBeInTheDocument();
  expect(excluirAvisoEad).toHaveBeenCalledWith(7);
});

test('mural: erro ao excluir aviso', async () => {
  buscarSalaDaTurma.mockResolvedValue(sala({ avisos: [{ idAviso: 7, titulo: 'Prova', mensagem: 'x', fixado: false }] }));
  excluirAvisoEad.mockRejectedValue(new Error('x'));
  abrir();
  await screen.findByText('Aula 1');
  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural (1)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Excluir aviso Prova' }));
  expect(await screen.findByText('Não foi possível excluir o aviso.')).toBeInTheDocument();
});

test('andamento: indicadores e progresso de cada aluno', async () => {
  andamentoDaTurma.mockResolvedValue([
    { idAluno: 1, nome: 'Ana', email: 'ana@x.com', statusMatricula: 'ativa', concluidas: 2, totalAulas: 2, percentual: 100, ultimaAtividade: '2026-10-13T21:30:00', certificado: true },
    { idAluno: 2, nome: 'Bia', email: 'bia@x.com', statusMatricula: 'trancada', concluidas: 0, totalAulas: 2, percentual: 0, ultimaAtividade: null, certificado: false },
    { idAluno: 3, nome: 'Caio', email: 'caio@x.com', statusMatricula: 'xpto', concluidas: 1, totalAulas: 2, percentual: 50, ultimaAtividade: null, certificado: false },
  ]);
  abrir();
  await screen.findByText('Aula 1');

  fireEvent.click(screen.getByRole('tab', { name: '📈 Andamento' }));

  expect(await screen.findByText('progresso médio')).toBeInTheDocument();
  expect(screen.getByText('50%')).toBeInTheDocument();
  expect(screen.getByText('concluíram todas as aulas').previousSibling).toHaveTextContent('1');
  expect(screen.getByText('certificado emitido')).toBeInTheDocument();
  expect(andamentoDaTurma).toHaveBeenCalledWith('3');
  const ana = screen.getByText('Ana').closest('tr');
  expect(within(ana).getByText('100% · 2/2 aulas')).toBeInTheDocument();
  expect(within(ana).getByText('13/10/2026 às 21:30')).toBeInTheDocument();
  expect(within(ana).getByText('🎓 Emitido')).toBeInTheDocument();
  expect(within(screen.getByText('Bia').closest('tr')).getByText('Trancada')).toBeInTheDocument();
  expect(within(screen.getByText('Caio').closest('tr')).getByText('xpto')).toBeInTheDocument();
});

test('andamento: um aluno, vazio e erro', async () => {
  andamentoDaTurma
    .mockResolvedValueOnce([{ idAluno: 1, nome: 'Ana', statusMatricula: 'ativa', concluidas: 0, totalAulas: 0, percentual: 0, certificado: false }])
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error('x'));
  abrir();
  await screen.findByText('Aula 1');

  fireEvent.click(screen.getByRole('tab', { name: '📈 Andamento' }));
  expect(await screen.findByText('aluno')).toBeInTheDocument();
  expect(screen.getByText('certificados emitidos')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /Aulas/ }));
  fireEvent.click(screen.getByRole('tab', { name: '📈 Andamento' }));
  expect(await screen.findByText('Nenhum aluno matriculado nesta turma ainda.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /Aulas/ }));
  fireEvent.click(screen.getByRole('tab', { name: '📈 Andamento' }));
  expect(await screen.findByText('Não foi possível carregar o andamento da turma.')).toBeInTheDocument();
});

test('falhas ao carregar os dados de apoio', async () => {
  listarTurmas.mockRejectedValue(new Error('x'));
  resumoDasSalas.mockRejectedValue(new Error('x'));
  listarProfessores.mockRejectedValue(new Error('x'));
  listarDisciplinas.mockRejectedValue(new Error('x'));
  buscarSalaDaTurma.mockRejectedValue(new Error('x'));
  abrir();
  expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument();
});

test('respostas vazias não quebram a tela', async () => {
  listarTurmas.mockResolvedValue({});
  resumoDasSalas.mockResolvedValue(null);
  listarProfessores.mockResolvedValue({});
  listarDisciplinas.mockResolvedValue({});
  abrir('/admin/aulas?turma=9');
  expect(await screen.findByText('Aula 1')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Escolha uma turma...' })).toBeInTheDocument();
});

test('mural: edita um aviso já publicado', async () => {
  const aviso = { idAviso: 7, titulo: 'Prova', mensagem: 'Dia 10', autor: 'Ana', fixado: true, criadoEm: null };
  buscarSalaDaTurma.mockResolvedValue(sala({ avisos: [aviso] }));
  editarAvisoEad
    .mockRejectedValueOnce({ response: { data: { mensagem: 'Aviso não encontrado.' } } })
    .mockRejectedValueOnce(new Error('x'))
    .mockResolvedValueOnce(sala({ avisos: [{ ...aviso, titulo: 'Prova adiada', fixado: false }] }));
  abrir();
  await screen.findByText('Aula 1');
  fireEvent.click(screen.getByRole('tab', { name: '📌 Mural (1)' }));

  fireEvent.click(screen.getByRole('button', { name: 'Editar aviso Prova' }));
  const edicao = screen.getByRole('form', { name: 'Editar aviso Prova' });
  expect(within(edicao).getByLabelText('Título do aviso')).toHaveValue('Prova');
  expect(within(edicao).getByLabelText('Mensagem do aviso')).toHaveValue('Dia 10');

  // cancelar volta ao cartão sem salvar
  fireEvent.click(within(edicao).getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('form', { name: 'Editar aviso Prova' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar aviso Prova' }));

  const form = screen.getByRole('form', { name: 'Editar aviso Prova' });
  fireEvent.change(within(form).getByLabelText('Título do aviso'), { target: { value: ' ' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
  expect(within(form).getByText('Preencha o título e a mensagem do aviso.')).toBeInTheDocument();

  fireEvent.change(within(form).getByLabelText('Título do aviso'), { target: { value: 'Prova adiada' } });
  fireEvent.click(within(form).getByLabelText(/Fixar no topo/));
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
  expect(await within(form).findByText('Aviso não encontrado.')).toBeInTheDocument();
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar' }));
  expect(await within(form).findByText('Não foi possível salvar o aviso.')).toBeInTheDocument();
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar' }));

  expect(await screen.findByText('Aviso atualizado.')).toBeInTheDocument();
  expect(editarAvisoEad).toHaveBeenLastCalledWith(7, { titulo: 'Prova adiada', mensagem: 'Dia 10', fixado: false });
  expect(screen.queryByRole('form', { name: /Editar aviso/ })).not.toBeInTheDocument();
  expect(screen.getByText('Prova adiada')).toBeInTheDocument();
});

test('importar aulas por planilha: só com a sala criada, e a lista atualiza depois', async () => {
  buscarSalaDaTurma.mockResolvedValueOnce(sala({ idPlano: null, aulas: [] }));
  const { unmount } = abrir();
  await screen.findByText('Escolha o professor responsável para começar a montar as aulas.');
  expect(screen.getByRole('button', { name: '📥 Importar planilha' })).toBeDisabled();
  unmount();

  const resultado = { confirmado: true, total: 2, validas: 2, comErro: 0, importadas: 2, linhas: [] };
  importarPlanilha.mockResolvedValueOnce({ ...resultado, confirmado: false, importadas: 0 })
    .mockResolvedValueOnce(resultado)
    .mockResolvedValueOnce({ ...resultado, confirmado: false, importadas: 0 })
    .mockResolvedValueOnce({ ...resultado, importadas: 0 });
  buscarSalaDaTurma.mockResolvedValueOnce(sala()).mockResolvedValueOnce(sala({ aulas: [...sala().aulas, aula(3), aula(4)] }));
  abrir();
  await screen.findByText('Aula 1');

  const importar = (nome) => {
    fireEvent.click(screen.getByRole('button', { name: '📥 Importar planilha' }));
    fireEvent.change(screen.getByLabelText('Arquivo da planilha (CSV)'), {
      target: { files: [new File(['Título\nAula nova\nOutra'], nome)] },
    });
  };
  importar('aulas.csv');
  fireEvent.click(await screen.findByRole('button', { name: 'Importar 2 linhas' }));
  expect(await screen.findByText('2 aulas importadas da planilha.')).toBeInTheDocument();
  expect(await screen.findByText('Aula 4')).toBeInTheDocument();
  expect(importarPlanilha).toHaveBeenCalledWith('aulas', expect.any(Array), { confirmar: false, idTurma: '3' });
  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));

  // Nada importado: não mostra mensagem de sucesso nova; falha ao recarregar não quebra a tela
  buscarSalaDaTurma.mockRejectedValueOnce(new Error('rede'));
  importar('de-novo.csv');
  fireEvent.click(await screen.findByRole('button', { name: 'Importar 2 linhas' }));
  await screen.findByText('✓ 0 aulas importadas');
  expect(screen.getByText('2 aulas importadas da planilha.')).toBeInTheDocument();
});
