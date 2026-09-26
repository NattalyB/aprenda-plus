import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import CursoDetalhe from './pages/CursoDetalhe';
import Carrinho from './pages/Carrinho';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminCursos from './pages/admin/AdminCursos';
import AdminCursoForm from './pages/admin/AdminCursoForm';
import RotaProtegidaAdmin from './components/admin/RotaProtegidaAdmin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Site do aluno, com Header */}
        <Route path="/" element={<><Header /><Home /></>} />
        <Route path="/login" element={<><Header /><Login /></>} />
        <Route path="/cadastro" element={<><Header /><Cadastro /></>} />
        <Route path="/curso/:id" element={<><Header /><CursoDetalhe /></>} />
        <Route path="/carrinho" element={<><Header /><Carrinho /></>} />

        {/* Painel administrativo, sem o Header do site */}
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;