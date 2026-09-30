import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-aprenda-plus.png';
import { estaLogado, getNomeAluno, logout } from '../services/authService';
import { listarItensDoCarrinho } from '../services/carrinhoService';
import { useSearch } from '../context/SearchContext';

function Header() {
  const navigate = useNavigate();
  const logado = estaLogado();
  const { termoBusca, setTermoBusca } = useSearch();
  const [qtdCarrinho, setQtdCarrinho] = useState(0);

  useEffect(() => {
    const atualizarQtdCarrinho = () => {
      if (!estaLogado()) {
        setQtdCarrinho(0);
        return;
      }
      listarItensDoCarrinho()
        .then((itens) => setQtdCarrinho(itens.length))
        .catch(() => setQtdCarrinho(0));
    };

    // Busca a quantidade ao carregar e sempre que o carrinho mudar
    atualizarQtdCarrinho();
    window.addEventListener('carrinho-atualizado', atualizarQtdCarrinho);

    return () => {
      window.removeEventListener('carrinho-atualizado', atualizarQtdCarrinho);
    };
  }, [logado]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="logo-container">
        <Link to="/">
          <img src={logo} alt="Aprenda Plus" className="logo-img" />
        </Link>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Pesquisar cursos..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
        />
        <button className="search-btn">🔍</button>
      </div>

      <div className="header-actions">
        <Link to="/carrinho">
          <button className="btn-cart">🛒 Carrinho ({qtdCarrinho})</button>
        </Link>

        {logado ? (
          <>
            <span>Olá, {getNomeAluno()}</span>
            <button className="btn-login" onClick={handleLogout}>Sair</button>
          </>
        ) : (
          <>
            <Link to="/login"><button className="btn-login">Login</button></Link>
            <Link to="/cadastro"><button className="btn-signup">Cadastro</button></Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;