import { Link, Outlet, useNavigate } from 'react-router-dom';
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '240px', borderRight: '1px solid #444', padding: '1rem' }}>
        <h3>AprendaPlus Admin</h3>
        <p>Olá, {getNomeFuncionario()}</p>
        <button onClick={handleLogout} style={{ marginBottom: '1rem' }}>Sair</button>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}>{item.label}</Link>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;