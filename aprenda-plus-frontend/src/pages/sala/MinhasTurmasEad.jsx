import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { estaLogado } from '../../services/authService';
import { listarMinhasTurmasEad } from '../../services/salaService';
import BarraProgresso from '../../components/BarraProgresso';

const SITUACAO = {
  trancada: 'Matrícula trancada: fale com a secretaria para voltar às aulas.',
};

// Lista das turmas do aluno com acesso à sala de aula EAD
function MinhasTurmasEad() {
  const logado = estaLogado();
  const [turmas, setTurmas] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!logado) return;
    listarMinhasTurmasEad()
      .then((lista) => setTurmas(lista || []))
      .catch(() => setErro('Não foi possível carregar suas turmas.'));
  }, [logado]);

  if (!logado) {
    return (
      <div className="carrinho-page">
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🔒</span>
          <h2>Faça login para entrar na sala de aula</h2>
          <p>Use o mesmo e-mail e senha do seu cadastro.</p>
          <div className="carrinho-estado-botoes">
            <Link to="/login" className="admin-btn admin-btn-primary">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="carrinho-page">
        <div className="form-erro">{erro}</div>
      </div>
    );
  }

  if (!turmas) {
    return (
      <div className="carrinho-page">
        <p className="carrinho-carregando">Carregando suas turmas...</p>
      </div>
    );
  }

  return (
    <div className="carrinho-page">
      <h1 className="carrinho-titulo">Sala de aula</h1>
      <p className="minhas-subtitulo">Assista às aulas, acompanhe seu progresso e emita o certificado ao concluir.</p>

      {turmas.length === 0 ? (
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🎓</span>
          <h2>Sua sala de aula ainda está vazia</h2>
          <p>
            Assim que a secretaria confirmar sua matrícula, o curso aparece aqui. Acompanhe a situação em
            &quot;Minhas inscrições&quot;.
          </p>
          <div className="carrinho-estado-botoes">
            <Link to="/minhas-inscricoes" className="admin-btn admin-btn-primary">Minhas inscrições</Link>
          </div>
        </div>
      ) : (
        <ul className="ead-turmas">
          {turmas.map((turma) => {
            const comecou = turma.concluidas > 0;
            return (
              <li key={turma.idTurma} className={turma.podeAcessar ? 'ead-turma' : 'ead-turma bloqueada'}>
                <div className="ead-turma-topo">
                  <div>
                    <h2>{turma.curso || turma.turma}</h2>
                    <p>{[turma.turma, turma.professor && `Prof. ${turma.professor}`].filter(Boolean).join(' · ')}</p>
                  </div>
                  {turma.temCertificado && <span className="ead-selo">🎓 Certificado emitido</span>}
                </div>

                {turma.podeAcessar ? (
                  <>
                    <BarraProgresso percentual={turma.percentual} rotulo={`Progresso em ${turma.curso || turma.turma}`} />
                    <p className="ead-turma-progresso">
                      {turma.totalAulas === 0
                        ? 'As aulas estão sendo preparadas pelo professor.'
                        : `${turma.percentual}% concluído · ${turma.concluidas} de ${turma.totalAulas} aulas`}
                    </p>
                    <Link to={`/sala/${turma.idTurma}`} className="admin-btn admin-btn-primary ead-turma-botao">
                      {comecou ? 'Continuar' : 'Entrar na sala'} →
                    </Link>
                  </>
                ) : (
                  <p className="ead-turma-aviso">
                    {SITUACAO[turma.statusMatricula] || 'Sua matrícula nesta turma não está ativa.'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MinhasTurmasEad;
