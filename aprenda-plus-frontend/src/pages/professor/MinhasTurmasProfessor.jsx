import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { minhasTurmas, professorLogado, getNomeProfessor, sairProfessor } from '../../services/docenteService';
import BarraProgresso from '../../components/BarraProgresso';

// Portal do Professor: as turmas do professor logado
function MinhasTurmasProfessor() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState(null);
  const [erro, setErro] = useState(null);
  const logado = professorLogado();

  useEffect(() => {
    if (!logado) return;
    minhasTurmas()
      .then((lista) => setTurmas(lista || []))
      .catch(() => {
        setTurmas([]);
        setErro('Não foi possível carregar as suas turmas.');
      });
  }, [logado]);

  if (!logado) return <Navigate to="/login?perfil=professor" replace />;

  const primeiroNome = (getNomeProfessor() || '').split(' ')[0];

  const sair = () => {
    sairProfessor();
    navigate('/login?perfil=professor');
  };

  return (
    <main className="portal-prof">
      <div className="portal-prof-topo">
        <div>
          <span className="portal-prof-selo">👩‍🏫 Portal do Professor</span>
          <h1>Olá{primeiroNome ? `, ${primeiroNome}` : ''}! 👋</h1>
          <p>Acompanhe o andamento dos alunos e monte as aulas das suas turmas.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-secundario" onClick={sair}>
          Sair do portal
        </button>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      {turmas === null ? (
        <p>Carregando suas turmas...</p>
      ) : turmas.length === 0 ? (
        !erro && (
          <div className="admin-card ead-vazio">
            <span aria-hidden="true">🏫</span>
            <p>Você ainda não está vinculado a nenhuma turma. Fale com a secretaria.</p>
          </div>
        )
      ) : (
        <div className="portal-prof-turmas">
          {turmas.map((t) => (
            <article key={t.idTurma} className="portal-prof-turma">
              <div className="portal-prof-turma-cabeca">
                <h2>{t.nome}</h2>
                <span className={t.responsavel ? 'portal-prof-papel responsavel' : 'portal-prof-papel'}>
                  {t.responsavel ? 'Responsável pela sala' : 'Professor da turma'}
                </span>
              </div>
              <p className="portal-prof-curso">{t.curso || 'Curso não informado'}</p>
              <p className="portal-prof-detalhes">
                {[t.modalidade, t.diasHorarios, t.periodoLetivo].filter(Boolean).join(' · ')}
              </p>
              <div className="portal-prof-numeros">
                <div><strong>{t.alunos}</strong><span>{t.alunos === 1 ? 'aluno' : 'alunos'}</span></div>
                <div><strong>{t.aulas}</strong><span>{t.aulas === 1 ? 'aula' : 'aulas'}</span></div>
                <div><strong>{t.progressoMedio}%</strong><span>progresso médio</span></div>
              </div>
              <BarraProgresso percentual={t.progressoMedio} rotulo={`Progresso médio da turma ${t.nome}`} />
              {!t.salaCriada && <p className="portal-prof-aviso">A sala de aula desta turma ainda não foi criada pela secretaria.</p>}
              <Link to={`/professor/turmas/${t.idTurma}`} className="admin-btn admin-btn-primary portal-prof-abrir">
                Abrir turma →
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default MinhasTurmasProfessor;
