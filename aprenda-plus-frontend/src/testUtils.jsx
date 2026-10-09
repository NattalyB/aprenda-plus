// Ferramentas compartilhadas pelos testes (não faz parte do sistema)
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { SearchProvider } from './context/SearchContext';

// Mostra na tela o endereço atual, pra conferir navegação nos testes
export function MostraEndereco() {
  const location = useLocation();
  return <div data-testid="endereco">{location.pathname}</div>;
}

// Renderiza um componente dentro de um "navegador de mentira",
// já com o provedor da busca (SearchContext).
//   rota:    endereço inicial (ex: '/admin/alunos/3/editar')
//   caminho: padrão da rota, quando o componente usa useParams (ex: '/admin/alunos/:id/editar')
export function renderizar(componente, { rota = '/', caminho } = {}) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <SearchProvider>
        {caminho ? (
          <Routes>
            <Route path={caminho} element={componente} />
            <Route path="*" element={null} />
          </Routes>
        ) : (
          componente
        )}
        <MostraEndereco />
      </SearchProvider>
    </MemoryRouter>
  );
}

// Simula o login de um aluno
export function logarAluno(nome = 'Maria Silva') {
  localStorage.setItem('token', 'token-aluno');
  localStorage.setItem('idAluno', '7');
  localStorage.setItem('nomeAluno', nome);
}

// Simula o login de um funcionário (admin)
export function logarAdmin(nome = 'Admin Teste') {
  localStorage.setItem('tokenAdmin', 'token-admin');
  localStorage.setItem('nomeFuncionario', nome);
}
