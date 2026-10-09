import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { logarAdmin } from '../../testUtils';

const montar = (rota = '/admin/cursos') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin/login" element={<p>Tela de login do admin</p>} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="cursos" element={<p>Conteúdo de cursos</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => localStorage.clear());

test('mostra o menu completo, o nome do funcionário e a página atual', () => {
  logarAdmin('Admin Teste');
  montar();

  expect(screen.getByText('Olá, Admin Teste')).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(8);
  expect(screen.getByText('Conteúdo de cursos')).toBeInTheDocument();
  // O item da página atual fica destacado
  expect(screen.getByText('Cadastro de cursos')).toHaveClass('ativo');
  expect(screen.getByText('Cadastro de alunos')).not.toHaveClass('ativo');
});

test('Sair desloga o funcionário e volta pro login do admin', () => {
  logarAdmin();
  montar();

  fireEvent.click(screen.getByText('Sair'));

  expect(localStorage.getItem('tokenAdmin')).toBeNull();
  expect(screen.getByText('Tela de login do admin')).toBeInTheDocument();
});
