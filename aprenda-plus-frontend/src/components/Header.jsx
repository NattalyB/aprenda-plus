import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo-aprenda-plus.png';
import { estaLogado, getNomeAluno, logout } from '../services/authService';
import { professorLogado, getNomeProfessor, sairProfessor } from '../services/docenteService';
import { listarItensDoCarrinho } from '../services/carrinhoService';
import { listarCursos } from '../services/cursoService';
import { useSearch } from '../context/SearchContext';

// Remove acentos e deixa minúsculo, pra "analise" encontrar "Análise"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const MAX_SUGESTOES = 6;

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const logado = estaLogado();
  const { termoBusca, setTermoBusca } = useSearch();
  const [qtdCarrinho, setQtdCarrinho] = useState(0);

  // Sugestões da busca
  const [cursos, setCursos] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);

  // Mostra só o primeiro nome na saudação ("Maria Silva" -> "Maria")
  const primeiroNome = (getNomeAluno() || '').split(' ')[0];

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

  // Carrega os cursos uma vez, pra montar as sugestões
  useEffect(() => {
    listarCursos()
      .then((response) => setCursos(response.data))
      .catch(() => setCursos([]));
  }, []);

  const termo = normalizar(termoBusca);
  const sugestoes = cursos
    .filter((curso) => normalizar(curso.nome).includes(termo))
    .slice(0, MAX_SUGESTOES);

  // A busca filtra a Home: se estiver em outra página, volta pra ela
  const irParaHome = () => {
    if (location.pathname !== '/') navigate('/');
  };

  const selecionarCurso = (curso) => {
    setTermoBusca(curso.nome);
    setMostrarSugestoes(false);
    setIndiceAtivo(-1);
    irParaHome();
  };

  const handleBuscaChange = (e) => {
    setTermoBusca(e.target.value);
    setMostrarSugestoes(true);
    setIndiceAtivo(-1);
  };

  // Navegação pelo teclado: setas, Enter e Esc
  const handleBuscaKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMostrarSugestoes(true);
      setIndiceAtivo((i) => Math.min(i + 1, sugestoes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mostrarSugestoes && indiceAtivo >= 0 && sugestoes[indiceAtivo]) {
        selecionarCurso(sugestoes[indiceAtivo]);
      } else {
        setMostrarSugestoes(false);
        irParaHome();
      }
    } else if (e.key === 'Escape') {
      setMostrarSugestoes(false);
      setIndiceAtivo(-1);
    }
  };

  const handleLogout = () => {
    logout();
    setTermoBusca('');
    navigate('/');
  };

  // Professor logado (e nenhum aluno): mostra o nome dele e o Sair do portal
  const professor = !logado && professorLogado();
  const sairDoPortal = () => {
    sairProfessor();
    setTermoBusca('');
    navigate('/');
  };

  // A logo sempre leva para o início e limpa a pesquisa anterior
  const voltarAoInicio = () => {
    setTermoBusca('');
    setMostrarSugestoes(false);
  };

  return (
    <header className="header">
      <div className="logo-container">
        <Link to="/" onClick={voltarAoInicio} aria-label="Ir para a página inicial">
          <img src={logo} alt="Aprenda Plus" className="logo-img" />
        </Link>
      </div>

      <div className="search-container">
        <input
          type="text"
          name="busca"
          placeholder="Pesquisar cursos..."
          autoComplete="off"
          value={termoBusca}
          onChange={handleBuscaChange}
          onFocus={() => setMostrarSugestoes(true)}
          onBlur={() => setMostrarSugestoes(false)}
          onKeyDown={handleBuscaKeyDown}
        />
        <button
          className="search-btn"
          onClick={() => {
            setMostrarSugestoes(false);
            irParaHome();
          }}
        >
          🔍
        </button>

        {mostrarSugestoes && cursos.length > 0 && (
          <ul className="busca-sugestoes" role="listbox">
            {sugestoes.length === 0 ? (
              <li className="busca-sugestoes-vazio">Nenhum curso encontrado</li>
            ) : (
              sugestoes.map((curso, index) => (
                <li
                  key={curso.idCurso}
                  role="option"
                  aria-selected={index === indiceAtivo}
                  className={index === indiceAtivo ? 'busca-sugestao ativa' : 'busca-sugestao'}
                  // onMouseDown (e não onClick) pra escolher antes do campo perder o foco
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selecionarCurso(curso);
                  }}
                  onMouseEnter={() => setIndiceAtivo(index)}
                >
                  <span className="busca-sugestao-nome">{curso.nome}</span>
                  {curso.categoria && (
                    <span className={`categoria-badge categoria-${curso.categoria}`}>
                      {curso.categoria}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Ordem fixa: (Portal do professor) · Sala de aula · Minhas inscrições · Carrinho · (aluno + Sair) */}
      <div className="header-actions">
        {professorLogado() && (
          <Link to="/professor" className="header-minhas">
            <span aria-hidden="true">👩‍🏫</span> <span className="header-minhas-texto">Portal do professor</span>
          </Link>
        )}
        {logado && (
          <Link to="/sala" className="header-minhas">
            <span aria-hidden="true">🎓</span> <span className="header-minhas-texto">Sala de aula</span>
          </Link>
        )}
        {logado && (
          <Link to="/minhas-inscricoes" className="header-minhas">
            <span aria-hidden="true">📚</span> <span className="header-minhas-texto">Minhas inscrições</span>
          </Link>
        )}

        <Link to="/carrinho">
          <button className="btn-cart">
            🛒 <span className="btn-cart-texto">Carrinho</span> ({qtdCarrinho})
          </button>
        </Link>

        {logado ? (
          <div className="header-usuario">
            <span className="header-saudacao" title={getNomeAluno() || ''}>
              <span aria-hidden="true">👤</span> {primeiroNome}
            </span>
            <button className="btn-login" onClick={handleLogout}>Sair</button>
          </div>
        ) : professor ? (
          <div className="header-usuario">
            <span className="header-saudacao" title={getNomeProfessor() || ''}>
              <span aria-hidden="true">👤</span> {(getNomeProfessor() || '').split(' ')[0]}
            </span>
            <button className="btn-login" onClick={sairDoPortal}>Sair</button>
          </div>
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