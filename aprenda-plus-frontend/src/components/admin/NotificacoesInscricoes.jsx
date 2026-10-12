import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarInscricoes } from '../../services/inscricaoService';
import { formatarValor } from '../../utils/precoCurso';

// De quanto em quanto tempo o painel confere se chegaram inscrições novas
export const INTERVALO_MS = 60 * 1000;

// Cada funcionário tem a sua marcação de "já vi até a inscrição X"
const chaveVistas = () => `inscricoesVistas:${localStorage.getItem('idFuncionario') || 'admin'}`;

const lerUltimaVista = () => {
  const valor = localStorage.getItem(chaveVistas());
  return valor === null ? null : Number(valor);
};

const salvarUltimaVista = (id) => localStorage.setItem(chaveVistas(), String(id));

// Sininho do painel: mostra quantas inscrições chegaram desde a última vez que o funcionário olhou
function NotificacoesInscricoes() {
  const navigate = useNavigate();
  const [novas, setNovas] = useState([]);
  const [aberto, setAberto] = useState(false);
  const maiorIdRef = useRef(0);

  const verificar = () => {
    listarInscricoes()
      .then((response) => {
        const inscricoes = response.data || [];
        const maiorId = inscricoes.reduce((maior, i) => Math.max(maior, i.idInscricao || 0), 0);
        maiorIdRef.current = maiorId;

        let ultimaVista = lerUltimaVista();
        if (ultimaVista === null) {
          // Primeiro acesso deste funcionário: começa "em dia", sem avisar o que já existia
          salvarUltimaVista(maiorId);
          ultimaVista = maiorId;
        }

        setNovas(
          inscricoes
            .filter((i) => i.idInscricao > ultimaVista)
            .sort((a, b) => b.idInscricao - a.idInscricao)
        );
      })
      .catch(() => {
        // Sem conexão agora: mantém o que já estava na tela e tenta de novo depois
      });
  };

  useEffect(() => {
    verificar();
    const timer = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(timer);
  }, []);

  const marcarComoVistas = () => {
    salvarUltimaVista(maiorIdRef.current);
    setNovas([]);
    setAberto(false);
  };

  const verInscricoes = () => {
    marcarComoVistas();
    navigate('/admin/inscricoes');
  };

  const quantidade = novas.length;
  const rotulo =
    quantidade === 0
      ? 'Notificações: nenhuma inscrição nova'
      : `Notificações: ${quantidade} ${quantidade === 1 ? 'inscrição nova' : 'inscrições novas'}`;

  return (
    <div className="notificacoes">
      <button
        type="button"
        className="notificacoes-botao"
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
      >
        <span aria-hidden="true">🔔</span>
        <span className="notificacoes-texto">Notificações</span>
        {quantidade > 0 && (
          <span className="notificacoes-contador" aria-hidden="true">
            {quantidade > 9 ? '9+' : quantidade}
          </span>
        )}
      </button>

      {aberto && (
        <div className="notificacoes-painel" role="region" aria-label="Novas inscrições">
          <h2>Novas inscrições</h2>

          {quantidade === 0 ? (
            <p className="notificacoes-vazio">Nenhuma inscrição nova.</p>
          ) : (
            <ul>
              {novas.slice(0, 5).map((inscricao) => (
                <li key={inscricao.idInscricao}>
                  <strong>{inscricao.aluno?.nomeCompleto || 'Aluno'}</strong>
                  <span>{inscricao.turma?.nome || 'Turma a definir'}</span>
                  <span>
                    {[inscricao.formaPagamento, inscricao.valorTotal != null ? formatarValor(inscricao.valorTotal) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {quantidade > 5 && <p className="notificacoes-mais">e mais {quantidade - 5}...</p>}

          <div className="notificacoes-acoes">
            <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={verInscricoes}>
              Ver inscrições
            </button>
            {quantidade > 0 && (
              <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={marcarComoVistas}>
                Marcar como vistas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificacoesInscricoes;
