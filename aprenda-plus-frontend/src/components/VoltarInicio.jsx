import { useLocation, useNavigate } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';

// Link "← Voltar ao início", logo abaixo da logo.
// Aparece em todas as telas do site, menos na página inicial sem pesquisa
// (nela o aluno já está no início). Volta para a vitrine e limpa a pesquisa.
function VoltarInicio() {
  const location = useLocation();
  const navigate = useNavigate();
  const { termoBusca, setTermoBusca } = useSearch();

  const naHome = location.pathname === '/';
  const pesquisando = Boolean((termoBusca || '').trim());

  if (naHome && !pesquisando) {
    return null;
  }

  const voltar = () => {
    setTermoBusca('');
    if (!naHome) navigate('/');
    if (typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // navegadores antigos: tudo bem ficar onde está
      }
    }
  };

  return (
    <nav className="voltar-inicio" aria-label="Navegação">
      <button type="button" className="voltar-inicio-btn" onClick={voltar}>
        <span aria-hidden="true">←</span> {naHome ? 'Ver todos os cursos' : 'Voltar ao início'}
      </button>
    </nav>
  );
}

export default VoltarInicio;
