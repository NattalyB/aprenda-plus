import { screen, fireEvent, within } from '@testing-library/react';
import { renderizar } from '../../testUtils';
import { paginasVisiveis } from '../../utils/paginacao';
import AdminAlunos from '../../pages/admin/AdminAlunos';
import { listarAlunos } from '../../services/alunoService';

jest.mock('../../services/alunoService');

const alunos = Array.from({ length: 45 }, (_, i) => ({
  idAluno: i + 1,
  nomeCompleto: i >= 40 ? `Beatriz ${i + 1}` : `Aluno ${String(i + 1).padStart(2, '0')}`,
  email: `a${i + 1}@x.com`,
  cpf: String(10000000000 + i),
  status: 'ativo',
}));

const linhas = () => screen.getAllByRole('row').slice(1);
const nav = () => screen.getByRole('navigation', { name: 'Páginas de alunos' });

test.each([
  [1, 1, [1]],
  [1, 3, [1, 2, 3]],
  [1, 6, [1, 2, null, 6]],
  [6, 12, [1, null, 5, 6, 7, null, 12]],
  [12, 12, [1, null, 11, 12]],
])('paginasVisiveis(%p, %p)', (atual, total, esperado) => {
  expect(paginasVisiveis(atual, total)).toEqual(esperado);
});

test('lista grande aparece em páginas de 20', async () => {
  listarAlunos.mockResolvedValue({ data: alunos });
  renderizar(<AdminAlunos />);
  await screen.findByText('Aluno 01');

  expect(linhas()).toHaveLength(20);
  expect(nav()).toHaveTextContent('Mostrando 1–20 de 45');
  expect(within(nav()).getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  expect(within(nav()).getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(within(nav()).getByRole('button', { name: 'Próxima página' }));
  expect(screen.getByText('Aluno 21')).toBeInTheDocument();
  expect(screen.queryByText('Aluno 01')).not.toBeInTheDocument();
  expect(nav()).toHaveTextContent('Mostrando 21–40 de 45');

  fireEvent.click(within(nav()).getByRole('button', { name: 'Página 3' }));
  expect(linhas()).toHaveLength(5);
  expect(screen.getByText('Beatriz 45')).toBeInTheDocument();
  expect(within(nav()).getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  fireEvent.click(within(nav()).getByRole('button', { name: 'Página anterior' }));
  expect(nav()).toHaveTextContent('Mostrando 21–40 de 45');
});

test('mudar quantos por página volta para a primeira', async () => {
  listarAlunos.mockResolvedValue({ data: alunos });
  renderizar(<AdminAlunos />);
  await screen.findByText('Aluno 01');

  fireEvent.click(within(nav()).getByRole('button', { name: 'Página 3' }));
  fireEvent.change(within(nav()).getByLabelText('Por página'), { target: { value: '50' } });
  expect(linhas()).toHaveLength(45);
  expect(nav()).toHaveTextContent('Mostrando 1–45 de 45');
});

test('a busca volta para a primeira página e, com poucos resultados, a paginação some', async () => {
  listarAlunos.mockResolvedValue({ data: alunos });
  renderizar(<AdminAlunos />);
  await screen.findByText('Aluno 01');

  fireEvent.click(within(nav()).getByRole('button', { name: 'Página 2' }));
  fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou CPF...'), { target: { value: 'beatriz' } });

  expect(linhas()).toHaveLength(5);
  expect(screen.getByText('Beatriz 41')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Páginas de alunos' })).not.toBeInTheDocument();
});
