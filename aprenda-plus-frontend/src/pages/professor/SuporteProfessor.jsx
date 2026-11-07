import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MeusChamados from '../../components/chamados/MeusChamados';
import { professorLogado } from '../../services/docenteService';

// Suporte do Portal do Professor: o professor abre e acompanha os próprios chamados.
function SuporteProfessor() {
  const navigate = useNavigate();
  const { idChamado } = useParams();
  const logado = professorLogado();

  useEffect(() => {
    if (!logado) navigate('/login?perfil=professor');
  }, [logado, navigate]);

  if (!logado) return null;

  return (
    <main className="portal-prof">
      {!idChamado && <Link to="/professor" className="chamado-voltar">← Minhas turmas</Link>}
      <MeusChamados perfil="professor" rota="/professor/suporte" />
    </main>
  );
}

export default SuporteProfessor;
