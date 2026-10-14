import api from './api';
import * as sala from './salaService';
import * as conteudo from './conteudoEadService';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  ['get', 'post', 'put', 'delete'].forEach((m) => api[m].mockResolvedValue({ data: { ok: m } }));
});

test('rotas da sala do aluno devolvem só os dados', async () => {
  await expect(sala.listarMinhasTurmasEad()).resolves.toEqual({ ok: 'get' });
  expect(api.get).toHaveBeenCalledWith('/sala/minhas-turmas');
  await sala.abrirSala(5);
  expect(api.get).toHaveBeenCalledWith('/sala/turmas/5');
  await expect(sala.concluirAula(9)).resolves.toEqual({ ok: 'put' });
  expect(api.put).toHaveBeenCalledWith('/sala/aulas/9/concluida');
  await sala.desmarcarAula(9);
  expect(api.delete).toHaveBeenCalledWith('/sala/aulas/9/concluida');
  await sala.emitirCertificado(5);
  expect(api.post).toHaveBeenCalledWith('/sala/turmas/5/certificado');
  await sala.validarCertificado('AB CD');
  expect(api.get).toHaveBeenCalledWith('/certificados/AB%20CD');
});

test('rotas do painel da sala de aula', async () => {
  await conteudo.resumoDasSalas();
  expect(api.get).toHaveBeenCalledWith('/planos-de-aula/resumo');
  await conteudo.buscarSalaDaTurma(5);
  expect(api.get).toHaveBeenCalledWith('/planos-de-aula/turma/5');
  await conteudo.andamentoDaTurma(5);
  expect(api.get).toHaveBeenCalledWith('/planos-de-aula/turma/5/andamento');
  await conteudo.definirProfessorDaSala(5, 3);
  expect(api.put).toHaveBeenCalledWith('/planos-de-aula/turma/5/professor', { idProfessor: 3 });
  await conteudo.criarAulaEad(5, { titulo: 'A' });
  expect(api.post).toHaveBeenCalledWith('/planos-de-aula/turma/5/aulas', { titulo: 'A' });
  await conteudo.atualizarAulaEad(11, { titulo: 'B' });
  expect(api.put).toHaveBeenCalledWith('/planos-de-aula/aulas/11', { titulo: 'B' });
  await conteudo.excluirAulaEad(11);
  expect(api.delete).toHaveBeenCalledWith('/planos-de-aula/aulas/11');
  await conteudo.moverAulaEad(11, 'cima');
  expect(api.put).toHaveBeenCalledWith('/planos-de-aula/aulas/11/mover', null, { params: { direcao: 'cima' } });
  await conteudo.copiarAulasDaTurma(5, 2);
  expect(api.post).toHaveBeenCalledWith('/planos-de-aula/turma/5/copiar', null, { params: { origem: 2 } });
  await conteudo.publicarAvisoEad(5, { titulo: 'X' });
  expect(api.post).toHaveBeenCalledWith('/planos-de-aula/turma/5/avisos', { titulo: 'X' });
  await expect(conteudo.excluirAvisoEad(3)).resolves.toEqual({ ok: 'delete' });
  expect(api.delete).toHaveBeenCalledWith('/planos-de-aula/avisos/3');
});
