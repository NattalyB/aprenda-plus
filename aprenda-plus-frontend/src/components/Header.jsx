import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/aprenda-plus-logos/logo-aprenda-plus-branco.png';
import { estaLogado, getNomeAluno, logout } from '../services/authService';

function Header() {
  const navigate = useNavigate();
  const logado = estaLogado();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
      <Link to="/">
        <img src={logo} alt="AprendaPlus" style={{ height: '50px' }} />
      </Link>

      <input type="text" placeholder="Pesquisar cursos..." />

      <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to="/carrinho">Carrinho</Link>
        {logado ? (
          <>
            <span>Olá, {getNomeAluno()}</span>
            <button onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/cadastro">Cadastro</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;