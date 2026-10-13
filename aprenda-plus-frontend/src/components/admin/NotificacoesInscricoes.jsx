import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarInscricoes } from '../../services/inscricaoService';
import { buscarAlertasFinanceiros } from '../../services/financeiroService';
import { situacaoDosDocumentos } from '../../services/documentoService';
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
// e quantos certificados de conclusão esperam análise; para quem cuida do financeiro,, as parcelas que vencem em breve ou estão em atraso.
function NotificacoesInscricoes({ inscricoes: mostrarInscricoes = true, financeiro: mostrarFinanceiro = false }) {
  const navigate = useNavigate();
  const [novas, setNovas] = useState([]);
  const [alertas, setAlertas] = useState({ vencendoEmBreve: 0, atrasadas: 0 });
  const [aberto, setAberto] = useState(false);
  const [documentosPendentes, setDocumentosPendentes] = useState(0);
  const maiorIdRef = useRef(0);

  const verificar = () => {
    if (mostrarFinanceiro) {
      buscarAlertasFinanceiros()
        .then((dados) => setAlertas({ vencendoEmBreve: dados?.vencendoEmBreve || 0, atrasadas: dados?.atrasadas || 0 }))
        .catch(() => {
          // Sem conexão agora: tenta de novo na próxima verificação
        });
    }
    if (!mostrarInscricoes) return;
    situacaoDosDocumentos()
      .then((resposta) =>
        setDocumentosPendentes(Object.values(resposta?.data || {}).filter((s) => s === 'pendente').length)
      )
      .catch(() => {
        // Tenta de novo na próxima verificação
      });
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

  const verDocumentos = () => {
    setAberto(false);
    navigate('/admin/inscricoes?documento=pendente');
  };

  const verFinanceiroAgora = () => {
    setAberto(false);
    navigate('/admin/financeiro');
  };

  const avisosFinanceiros = alertas.vencendoEmBreve + alertas.atrasadas;
  const quantidade = novas.length + avisosFinanceiros + documentosPendentes;
  const partes = [];
  if (novas.length > 0) {
    partes.push(`${novas.length} ${novas.length === 1 ? 'inscrição nova' : 'inscrições novas'}`);
  }
  if (documentosPendentes > 0) {
    partes.push(
      `${documentosPendentes} ${documentosPendentes === 1 ? 'documento para analisar' : 'documentos para analisar'}`
    );
  }
  if (avisosFinanceiros > 0) {
    partes.push(`${avisosFinanceiros} ${avisosFinanceiros === 1 ? 'aviso financeiro' : 'avisos financeiros'}`);
  }
  let rotulo = `Notificações: ${partes.join(' e ')}`;
  if (partes.length === 0) {
    rotulo = mostrarInscricoes ? 'Notificações: nenhuma inscrição nova' : 'Notificações: nenhum aviso';
  }

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
        <div className="notificacoes-painel" role="region" aria-label="Notificações do painel">
          {mostrarFinanceiro && (
            <div className="notificacoes-financeiro">
              <h2>Financeiro</h2>
              {avisosFinanceiros === 0 ? (
                <p className="notificacoes-vazio">Nenhuma parcela vencendo nem em atraso.</p>
              ) : (
                <ul>
                  {alertas.atrasadas > 0 && (
                    <li className="notificacoes-atraso">
                      ⚠ {alertas.atrasadas} {alertas.atrasadas === 1 ? 'parcela em atraso' : 'parcelas em atraso'}
                    </li>
                  )}
                  {alertas.vencendoEmBreve > 0 && (
                    <li>
                      📅 {alertas.vencendoEmBreve}{' '}
                      {alertas.vencendoEmBreve === 1 ? 'parcela vence' : 'parcelas vencem'} nos próximos 7 dias
                    </li>
                  )}
                </ul>
              )}
              <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={verFinanceiroAgora}>
                Ver financeiro
              </button>
            </div>
          )}

          {mostrarInscricoes && documentosPendentes > 0 && (
            <div className="notificacoes-documentos">
              <h2>Documentos</h2>
              <p>
                📄 {documentosPendentes}{' '}
                {documentosPendentes === 1
                  ? 'certificado de conclusão aguarda análise'
                  : 'certificados de conclusão aguardam análise'}
              </p>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={verDocumentos}>
                Analisar documentos
              </button>
            </div>
          )}

          {mostrarInscricoes && (
            <>
              <h2>Novas inscrições</h2>

              {novas.length === 0 ? (
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
              {novas.length > 5 && <p className="notificacoes-mais">e mais {novas.length - 5}...</p>}

              <div className="notificacoes-acoes">
                <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={verInscricoes}>
                  Ver inscrições
                </button>
                {novas.length > 0 && (
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={marcarComoVistas}>
                    Marcar como vistas
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificacoesInscricoes;
