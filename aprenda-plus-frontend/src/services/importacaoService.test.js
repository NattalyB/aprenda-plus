import api from './api';
import { importarPlanilha } from './importacaoService';

jest.mock('./api', () => ({ __esModule: true, default: { post: jest.fn() } }));

test('cada importação usa a rota do seu módulo e manda a prévia ou a confirmação', async () => {
  api.post.mockResolvedValue({ data: { total: 1 } });
  const linhas = [{ Nome: 'Ana', _linha: '2' }];

  await expect(importarPlanilha('alunos', linhas)).resolves.toEqual({ total: 1 });
  expect(api.post).toHaveBeenLastCalledWith('/alunos/importacao', { linhas }, { params: { confirmar: false } });

  await importarPlanilha('professores', linhas, { confirmar: true });
  expect(api.post).toHaveBeenLastCalledWith('/professores/importacao', { linhas }, { params: { confirmar: true } });
  await importarPlanilha('cursos', linhas);
  expect(api.post).toHaveBeenLastCalledWith('/cursos/importacao', { linhas }, { params: { confirmar: false } });
  await importarPlanilha('disciplinas', linhas);
  expect(api.post).toHaveBeenLastCalledWith('/disciplinas/importacao', { linhas }, { params: { confirmar: false } });
  await importarPlanilha('aulas', linhas, { confirmar: true, idTurma: '3' });
  expect(api.post).toHaveBeenLastCalledWith('/planos-de-aula/turma/3/aulas/importacao', { linhas }, { params: { confirmar: true } });
});
