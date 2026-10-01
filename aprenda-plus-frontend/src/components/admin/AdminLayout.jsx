import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-aprenda-plus-branco.png';
import { getNomeFuncionario, logoutAdmin } from '../../services/authAdminService';

const menuItems = [
  { path: '/admin/alunos', label: 'Cadastro de alunos' },
  { path: '/admin/professores', label: 'Cadastro de professores' },
  { path: '/admin/cursos', label: 'Cadastro de cursos' },
  { path: '/admin/disciplinas', label: 'Cadastro de disciplinas' },
  { path: '/admin/periodos-letivos', label: 'Períodos letivos' },
  { path: '/admin/turmas', label: 'Cadastro de turmas' },
  { path: '/admin/inscricoes', label: 'Inscrições' },
  { path: '/admin/matriculas', label: 'Matrículas' },
];

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <img src={logo} alt="Aprenda Plus" />
          <span className="admin-badge">PAINEL ADMIN</span>
        </div>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'admin-nav-link ativo' : 'admin-nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-usuario">Olá, {getNomeFuncionario()}</span>
          <button className="admin-btn-sair" onClick={handleLogout}>Sair</button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;