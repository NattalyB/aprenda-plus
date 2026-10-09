import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RotaProtegidaAdmin from './RotaProtegidaAdmin';

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/admin/alunos']}>
      <Routes>
        <Route path="/admin/login" element={<p>Tela de login do admin</p>} />
        <Route
          path="/admin/alunos"
          element={
            <RotaProtegidaAdmin>
              <p>Área restrita</p>
            </RotaProtegidaAdmin>
          }
        />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => localStorage.clear());

test('sem login de admin, redireciona pro login do admin', () => {
  montar();

  expect(screen.getByText('Tela de login do admin')).toBeInTheDocument();
  expect(screen.queryByText('Área restrita')).not.toBeInTheDocument();
});

test('com login de admin, mostra a página', () => {
  localStorage.setItem('tokenAdmin', 'x');
  montar();

  expect(screen.getByText('Área restrita')).toBeInTheDocument();
});

test('login de aluno não abre o painel admin', () => {
  localStorage.setItem('token', 'token-de-aluno');
  montar();

  expect(screen.getByText('Tela de login do admin')).toBeInTheDocument();
});
