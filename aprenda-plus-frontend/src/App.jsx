import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Carrinho from './pages/Carrinho';
import MinhasInscricoes from './pages/MinhasInscricoes';
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
import AdminFuncionarios from './pages/admin/AdminFuncionarios';
import AdminFuncionarioForm from './pages/admin/AdminFuncionarioForm';
import Aviso from './components/Aviso';
import ChatAssistente from './components/ChatAssistente';
import RotaModulo from './components/admin/RotaModulo';
import AdminInicio from './pages/admin/AdminInicio';
import AdminSistema from './pages/admin/AdminSistema';
import AdminFinanceiro from './pages/admin/AdminFinanceiro';
import VoltarInicio from './components/VoltarInicio';
import MinhasTurmasEad from './pages/sala/MinhasTurmasEad';
import SalaTurma from './pages/sala/SalaTurma';
import CertificadoConclusao from './pages/sala/CertificadoConclusao';
import ValidarCertificado from './pages/ValidarCertificado';
import AdminSalaDeAula from './pages/admin/AdminSalaDeAula';
import AdminTreinamentos from './pages/admin/AdminTreinamentos';
import AdminHistorico from './pages/admin/AdminHistorico';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';

function SitePage({ children }) {
  return (
    <SearchProvider>
      <Header />
      <VoltarInicio />
      {children}
      <Footer />
      <Aviso />
      <ChatAssistente />
    </SearchProvider>
  );
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<SitePage><Home /></SitePage>} />
        <Route path="/login" element={<SitePage><Login /></SitePage>} />
        <Route path="/cadastro" element={<SitePage><Cadastro /></SitePage>} />
        <Route path="/carrinho" element={<SitePage><Carrinho /></SitePage>} />
        <Route path="/minhas-inscricoes" element={<SitePage><MinhasInscricoes /></SitePage>} />
        <Route path="/sala" element={<SitePage><MinhasTurmasEad /></SitePage>} />
        <Route path="/sala/:idTurma" element={<SitePage><SalaTurma /></SitePage>} />
        <Route path="/sala/:idTurma/certificado" element={<CertificadoConclusao />} />
        <Route path="/certificado" element={<SitePage><ValidarCertificado /></SitePage>} />
        <Route path="/certificado/:codigo" element={<SitePage><ValidarCertificado /></SitePage>} />

        <Route path="/esqueci-senha" element={<SitePage><EsqueciSenha /></SitePage>} />
        <Route path="/redefinir-senha" element={<SitePage><RedefinirSenha /></SitePage>} />

        <Route path="/admin/login" element={<><AdminLogin /><Aviso /></>} />
        <Route path="/admin/esqueci-senha" element={<><EsqueciSenha painel /><Aviso /></>} />
        <Route path="/admin/redefinir-senha" element={<><RedefinirSenha painel /><Aviso /></>} />
        <Route
          path="/admin"
          element={
            <RotaProtegidaAdmin>
              <AdminLayout />
            </RotaProtegidaAdmin>
          }
        >
          <Route index element={<AdminInicio />} />
          <Route path="sistema" element={<RotaModulo modulo="sistema"><AdminSistema /></RotaModulo>} />
          <Route path="financeiro" element={<RotaModulo modulo="financeiro"><AdminFinanceiro /></RotaModulo>} />
          <Route path="treinamentos" element={<RotaModulo modulo="treinamentos"><AdminTreinamentos /></RotaModulo>} />
          <Route path="historico" element={<RotaModulo modulo="historico"><AdminHistorico /></RotaModulo>} />

          <Route path="cursos" element={<RotaModulo modulo="cursos"><AdminCursos /></RotaModulo>} />
          <Route path="cursos/novo" element={<RotaModulo modulo="cursos"><AdminCursoForm /></RotaModulo>} />
          <Route path="cursos/:id/editar" element={<RotaModulo modulo="cursos"><AdminCursoForm /></RotaModulo>} />

          <Route path="alunos" element={<RotaModulo modulo="alunos"><AdminAlunos /></RotaModulo>} />
          <Route path="alunos/novo" element={<RotaModulo modulo="alunos"><AdminAlunoForm /></RotaModulo>} />
          <Route path="alunos/:id/editar" element={<RotaModulo modulo="alunos"><AdminAlunoForm /></RotaModulo>} />

          <Route path="professores" element={<RotaModulo modulo="professores"><AdminProfessores /></RotaModulo>} />
          <Route path="professores/novo" element={<RotaModulo modulo="professores"><AdminProfessorForm /></RotaModulo>} />
          <Route path="professores/:id/editar" element={<RotaModulo modulo="professores"><AdminProfessorForm /></RotaModulo>} />

          <Route path="disciplinas" element={<RotaModulo modulo="disciplinas"><AdminDisciplinas /></RotaModulo>} />
          <Route path="disciplinas/novo" element={<RotaModulo modulo="disciplinas"><AdminDisciplinaForm /></RotaModulo>} />
          <Route path="disciplinas/:id/editar" element={<RotaModulo modulo="disciplinas"><AdminDisciplinaForm /></RotaModulo>} />

          <Route path="periodos-letivos" element={<RotaModulo modulo="periodos"><AdminPeriodosLetivos /></RotaModulo>} />
          <Route path="periodos-letivos/novo" element={<RotaModulo modulo="periodos"><AdminPeriodoLetivoForm /></RotaModulo>} />
          <Route path="periodos-letivos/:id/editar" element={<RotaModulo modulo="periodos"><AdminPeriodoLetivoForm /></RotaModulo>} />

          <Route path="turmas" element={<RotaModulo modulo="turmas"><AdminTurmas /></RotaModulo>} />
          <Route path="turmas/novo" element={<RotaModulo modulo="turmas"><AdminTurmaForm /></RotaModulo>} />
          <Route path="turmas/:id/editar" element={<RotaModulo modulo="turmas"><AdminTurmaForm /></RotaModulo>} />

          <Route path="aulas" element={<RotaModulo modulo="aulas"><AdminSalaDeAula /></RotaModulo>} />

          <Route path="inscricoes" element={<RotaModulo modulo="inscricoes"><AdminInscricoes /></RotaModulo>} />

          <Route path="matriculas" element={<RotaModulo modulo="matriculas"><AdminMatriculas /></RotaModulo>} />
          <Route path="matriculas/novo" element={<RotaModulo modulo="matriculas"><AdminMatriculaForm /></RotaModulo>} />
          <Route path="matriculas/:id/editar" element={<RotaModulo modulo="matriculas"><AdminMatriculaForm /></RotaModulo>} />

          <Route path="funcionarios" element={<RotaModulo modulo="funcionarios"><AdminFuncionarios /></RotaModulo>} />
          <Route path="funcionarios/novo" element={<RotaModulo modulo="funcionarios"><AdminFuncionarioForm /></RotaModulo>} />
          <Route path="funcionarios/:id/editar" element={<RotaModulo modulo="funcionarios"><AdminFuncionarioForm /></RotaModulo>} />

        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;