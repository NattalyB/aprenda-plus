import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import AdminInicio from './AdminInicio';

// Simula o AdminLayout entregando o nível pelo contexto da rota
const montar = (acesso) =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<Outlet context={acesso === undefined ? undefined : { acesso }} />}>
          <Route index element={<AdminInicio />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => localStorage.clear());

test('mostra um atalho para cada módulo liberado', () => {
  localStorage.setItem('nomeFuncionario', 'Carla Dias');
  montar({ nivel: 'Financeiro', master: false, modulos: ['inscricoes', 'matriculas'] });

  expect(screen.getByRole('heading', { name: 'Olá, Carla!' })).toBeInTheDocument();
  expect(screen.getByText('Financeiro')).toBeInTheDocument();
  expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    '/admin/inscricoes',
    '/admin/matriculas',
  ]);
});

test('o Master vê todos os atalhos, inclusive Sistema', () => {
  montar({ nivel: 'Master', master: true, modulos: [] });

  expect(screen.getAllByRole('link')).toHaveLength(12);
  expect(screen.getByText('Sistema')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Olá!' })).toBeInTheDocument();
});

test('sem módulos liberados avisa para falar com o Master', () => {
  montar({ nivel: null, master: false, modulos: [] });

  expect(screen.getByText('Nenhum módulo liberado')).toBeInTheDocument();
  expect(screen.getByText('Escolha por onde começar.')).toBeInTheDocument();
});

test('sem contexto do layout também não quebra', () => {
  montar(undefined);

  expect(screen.getByText('Nenhum módulo liberado')).toBeInTheDocument();
});
