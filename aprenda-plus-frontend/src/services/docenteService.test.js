import api from './api';
import * as docente from './docenteService';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  ['get', 'post', 'put', 'delete'].forEach((m) => api[m].mockResolvedValue({ data: { ok: m } }));
});

test('sessão do professor separada da do aluno', () => {
  localStorage.setItem('token', 'aluno');
  expect(docente.professorLogado()).toBe(false);
  docente.salvarSessaoProfessor({ token: 'tp', idProfessor: 3, nome: 'Roberto Fagundes' });
  expect(docente.professorLogado()).toBe(true);
  expect(docente.getNomeProfessor()).toBe('Roberto Fagundes');
  docente.sairProfessor();
  expect(docente.professorLogado()).toBe(false);
  expect(localStorage.getItem('idProfessor')).toBeNull();
  expect(localStorage.getItem('token')).toBe('aluno');
});

test('cada função chama a rota do portal', async () => {
  await expect(docente.loginProfessor('p@x.com', '123')).resolves.toEqual({ ok: 'post' });
  expect(api.post).toHaveBeenLastCalledWith('/auth/login-professor', { email: 'p@x.com', senha: '123' });

  await docente.minhasTurmas();
  expect(api.get).toHaveBeenLastCalledWith('/docente/turmas');
  await docente.salaDaTurma(5);
  expect(api.get).toHaveBeenLastCalledWith('/docente/turmas/5');
  await docente.andamentoDaMinhaTurma(5);
  expect(api.get).toHaveBeenLastCalledWith('/docente/turmas/5/andamento');
  await docente.disciplinasDaTurma(5);
  expect(api.get).toHaveBeenLastCalledWith('/docente/turmas/5/disciplinas');

  await docente.criarAula(5, { titulo: 'A' });
  expect(api.post).toHaveBeenLastCalledWith('/docente/turmas/5/aulas', { titulo: 'A' });
  await docente.editarAula(9, { titulo: 'B' });
  expect(api.put).toHaveBeenLastCalledWith('/docente/aulas/9', { titulo: 'B' });
  await docente.excluirAula(9);
  expect(api.delete).toHaveBeenLastCalledWith('/docente/aulas/9');
  await docente.moverAula(9, 'cima');
  expect(api.put).toHaveBeenLastCalledWith('/docente/aulas/9/mover', null, { params: { direcao: 'cima' } });

  await docente.publicarAviso(5, { titulo: 'T' });
  expect(api.post).toHaveBeenLastCalledWith('/docente/turmas/5/avisos', { titulo: 'T' });
  await docente.editarAviso(2, { titulo: 'U' });
  expect(api.put).toHaveBeenLastCalledWith('/docente/avisos/2', { titulo: 'U' });
  await docente.excluirAviso(2);
  expect(api.delete).toHaveBeenLastCalledWith('/docente/avisos/2');
});
