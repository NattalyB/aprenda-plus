import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Carrinho from './pages/Carrinho';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminCursos from './pages/admin/AdminCursos';
import AdminCursoForm from './pages/admin/AdminCursoForm';
import AdminAlunos from './pages/admin/AdminAlunos';
import AdminAlunoForm from './pages/admin/AdminAlunoForm';
import AdminProfessores from './pages/admin/AdminProfessores';
import AdminProfessorForm from './pages/admin/AdminProfessorForm';
import AdminDisciplinas from './pages/admin/AdminDisciplinas';
import AdminDisciplinaForm from './pages/admin/AdminDisciplinaForm';
import RotaProtegidaAdmin from './components/admin/RotaProtegidaAdmin';
import { SearchProvider } from './context/SearchContext';
import AdminPeriodosLetivos from './pages/admin/AdminPeriodosLetivos';
import AdminPeriodoLetivoForm from './pages/admin/AdminPeriodoLetivoForm';
import AdminTurmas from './pages/admin/AdminTurmas';
import AdminTurmaForm from './pages/admin/AdminTurmaForm';
import AdminInscricoes from './pages/admin/AdminInscricoes';
import AdminMatriculas from './pages/admin/AdminMatriculas';
import AdminMatriculaForm from './pages/admin/AdminMatriculaForm';

function SitePage({ children }) {
  return (
    <SearchProvider>
      <Header />
      {children}
      <Footer />
    </SearchProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SitePage><Home /></SitePage>} />
        <Route path="/login" element={<SitePage><Login /></SitePage>} />
        <Route path="/cadastro" element={<SitePage><Cadastro /></SitePage>} />
        <Route path="/carrinho" element={<SitePage><Carrinho /></SitePage>} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RotaProtegidaAdmin>
              <AdminLayout />
            </RotaProtegidaAdmin>
          }
        >
          <Route path="cursos" element={<AdminCursos />} />
          <Route path="cursos/novo" element={<AdminCursoForm />} />
          <Route path="cursos/:id/editar" element={<AdminCursoForm />} />

          <Route path="alunos" element={<AdminAlunos />} />
          <Route path="alunos/novo" element={<AdminAlunoForm />} />
          <Route path="alunos/:id/editar" element={<AdminAlunoForm />} />

          <Route path="professores" element={<AdminProfessores />} />
          <Route path="professores/novo" element={<AdminProfessorForm />} />
          <Route path="professores/:id/editar" element={<AdminProfessorForm />} />

          <Route path="disciplinas" element={<AdminDisciplinas />} />
          <Route path="disciplinas/novo" element={<AdminDisciplinaForm />} />
          <Route path="disciplinas/:id/editar" element={<AdminDisciplinaForm />} />

          <Route path="periodos-letivos" element={<AdminPeriodosLetivos />} />
          <Route path="periodos-letivos/novo" element={<AdminPeriodoLetivoForm />} />
          <Route path="periodos-letivos/:id/editar" element={<AdminPeriodoLetivoForm />} />

          <Route path="turmas" element={<AdminTurmas />} />
          <Route path="turmas/novo" element={<AdminTurmaForm />} />
          <Route path="turmas/:id/editar" element={<AdminTurmaForm />} />

          <Route path="inscricoes" element={<AdminInscricoes />} />

          <Route path="matriculas" element={<AdminMatriculas />} />
          <Route path="matriculas/novo" element={<AdminMatriculaForm />} />
          <Route path="matriculas/:id/editar" element={<AdminMatriculaForm />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;