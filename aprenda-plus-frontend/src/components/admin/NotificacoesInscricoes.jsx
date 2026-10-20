import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listarInscricoes } from '../../services/inscricaoService';
import { buscarAlertasFinanceiros } from '../../services/financeiroService';
import { situacaoDosDocumentos } from '../../services/documentoService';
import { formatarValor } from '../../utils/precoCurso';

// De quanto em quanto tempo o painel confere se chegou coisa nova
export const INTERVALO_MS = 60 * 1000;

// Cada funcionário tem as suas marcações de "já li" (ficam neste navegador)
const quem = () => localStorage.getItem('idFuncionario') || 'admin';
const chaveVistas = () => `inscricoesVistas:${quem()}`;
const chaveLidas = () => `notificacoesLidas:${quem()}`;

const lerUltimaVista = () => {
  const valor = localStorage.getItem(chaveVistas());
  return valor === null ? null : Number(valor);
};

const salvarUltimaVista = (id) => localStorage.setItem(chaveVistas(), String(id));

// { documentos: ['7', '9'], financeiro: ['v12', 'a15'] }
const lerLidas = () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(chaveLidas()));
    return {
      documentos: Array.isArray(salvo?.documentos) ? salvo.documentos : [],
      financeiro: Array.isArray(salvo?.financeiro) ? salvo.financeiro : [],
    };
  } catch {
    return { documentos: [], financeiro: [] };
  }
};

const salvarLidas = (lidas) => localStorage.setItem(chaveLidas(), JSON.stringify(lidas));

// Cada aviso financeiro vira uma chave: "v12" = parcela 12 vencendo, "a12" = parcela 12 atrasada.
// Assim, quando uma parcela que vencia passa a estar atrasada, o aviso volta a aparecer.
const chavesFinanceiras = (alertas) => [
  ...(alertas.idsVencendo || []).map((id) => `v${id}`),
  ...(alertas.idsAtrasadas || []).map((id) => `a${id}`),
];

const naoLidas = (chaves, lidas) => chaves.filter((chave) => !lidas.includes(chave)).length;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Sininho do painel. Cada um vê só o que é do seu nível:
// - inscrições novas (módulo Inscrições)
// - certificados de conclusão para analisar (módulo Alunos)
// - boletos vencendo ou em atraso (módulo Financeiro)
// O número no sininho conta só o que ainda não foi lido. Abrir uma área ("Ver ...")
// ou clicar em "Marcar todas como lidas" zera o número; só volta se chegar algo novo.
function NotificacoesInscricoes({
  inscricoes: mostrarInscricoes = true,
  documentos: mostrarDocumentos = false,
  financeiro: mostrarFinanceiro = false,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [novas, setNovas] = useState([]);
  const [alertas, setAlertas] = useState({ vencendoEmBreve: 0, atrasadas: 0, idsVencendo: [], idsAtrasadas: [] });
  const [documentosPendentes, setDocumentosPendentes] = useState([]);
  const [lidas, setLidas] = useState(lerLidas);
  const [aberto, setAberto] = useState(false);
  const maiorIdRef = useRef(0);
  const caixaRef = useRef(null);

  const verificar = () => {
    if (mostrarFinanceiro) {
      buscarAlertasFinanceiros()
        .then((dados) =>
          setAlertas({
            vencendoEmBreve: dados?.vencendoEmBreve || 0,
            atrasadas: dados?.atrasadas || 0,
            idsVencendo: dados?.idsVencendo || [],
            idsAtrasadas: dados?.idsAtrasadas || [],
          })
        )
        .catch(() => {
          // Sem conexão agora: tenta de novo na próxima verificação
        });
    }
    if (mostrarDocumentos) {
      situacaoDosDocumentos()
        .then((resposta) =>
          setDocumentosPendentes(
            Object.entries(resposta?.data || {})
              .filter(([, situacao]) => situacao === 'pendente')
              .map(([idAluno]) => String(idAluno))
          )
        )
        .catch(() => {
          // Tenta de novo na próxima verificação
        });
    }
    if (mostrarInscricoes) {
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
    }
  };

  useEffect(() => {
    verificar();
    const timer = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(timer);
  }, []);

  // Mudou de tela: fecha o painel
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Fecha o painel com Esc ou clicando fora dele
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicar = (evento) => {
      if (caixaRef.current && !caixaRef.current.contains(evento.target)) setAberto(false);
    };
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  const chavesFin = chavesFinanceiras(alertas);
  const finNaoLidos = mostrarFinanceiro ? naoLidas(chavesFin, lidas.financeiro) : 0;
  const docsNaoLidos = mostrarDocumentos ? naoLidas(documentosPendentes, lidas.documentos) : 0;
  const quantidade = novas.length + docsNaoLidos + finNaoLidos;

  const atualizarLidas = (mudanca) => {
    const novasLidas = { ...lidas, ...mudanca };
    salvarLidas(novasLidas);
    setLidas(novasLidas);
  };

  const lerInscricoes = () => {
    salvarUltimaVista(maiorIdRef.current);
    setNovas([]);
  };
  const lerDocumentos = () => atualizarLidas({ documentos: documentosPendentes });
  const lerFinanceiro = () => atualizarLidas({ financeiro: chavesFin });

  const marcarTodasComoLidas = () => {
    if (mostrarInscricoes) lerInscricoes();
    // Guarda só o que existe agora: o que sumir da lista não ocupa espaço à toa
    atualizarLidas({
      ...(mostrarDocumentos ? { documentos: documentosPendentes } : {}),
      ...(mostrarFinanceiro ? { financeiro: chavesFin } : {}),
    });
  };

  const abrir = (marcarComoLida, rota) => {
    marcarComoLida();
    setAberto(false);
    navigate(rota);
  };

  const partes = [];
  if (novas.length > 0) partes.push(plural(novas.length, 'inscrição nova', 'inscrições novas'));
  if (docsNaoLidos > 0) partes.push(plural(docsNaoLidos, 'documento para analisar', 'documentos para analisar'));
  if (finNaoLidos > 0) partes.push(plural(finNaoLidos, 'aviso financeiro', 'avisos financeiros'));
  const rotulo = partes.length > 0 ? `Notificações: ${partes.join(' e ')}` : 'Notificações: nenhuma não lida';

  const etiquetaNova = (n) =>
    n > 0 ? (
      <span className="notificacoes-nova">{n === 1 ? '1 nova' : `${n} novas`}</span>
    ) : null;

  return (
    <div className="notificacoes" ref={caixaRef}>
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
          <div className="notificacoes-topo">
            <strong>Notificações</strong>
            {quantidade > 0 ? (
              <button type="button" className="notificacoes-ler-todas" onClick={marcarTodasComoLidas}>
                ✓ Marcar todas como lidas
              </button>
            ) : (
              <span className="notificacoes-em-dia">✓ Tudo lido</span>
            )}
          </div>

          {mostrarFinanceiro && (
            <div className="notificacoes-financeiro">
              <h2>Financeiro {etiquetaNova(finNaoLidos)}</h2>
              {alertas.vencendoEmBreve + alertas.atrasadas === 0 ? (
                <p className="notificacoes-vazio">Nenhum boleto vencendo nem em atraso.</p>
              ) : (
                <ul>
                  {alertas.atrasadas > 0 && (
                    <li className="notificacoes-atraso">
                      ⚠ {plural(alertas.atrasadas, 'boleto em atraso', 'boletos em atraso')}
                    </li>
                  )}
                  {alertas.vencendoEmBreve > 0 && (
                    <li>
                      📅 {alertas.vencendoEmBreve}{' '}
                      {alertas.vencendoEmBreve === 1 ? 'boleto vence' : 'boletos vencem'} nos próximos 7 dias
                    </li>
                  )}
                </ul>
              )}
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-primary"
                onClick={() => abrir(lerFinanceiro, '/admin/financeiro')}
              >
                Ver financeiro
              </button>
            </div>
          )}

          {mostrarDocumentos && documentosPendentes.length > 0 && (
            <div className="notificacoes-documentos">
              <h2>Documentos {etiquetaNova(docsNaoLidos)}</h2>
              <p>
                📄 {documentosPendentes.length}{' '}
                {documentosPendentes.length === 1
                  ? 'certificado de conclusão aguarda análise'
                  : 'certificados de conclusão aguardam análise'}
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-sm admin-btn-primary"
                onClick={() => abrir(lerDocumentos, '/admin/inscricoes?documento=pendente')}
              >
                Analisar documentos
              </button>
            </div>
          )}

          {mostrarInscricoes && (
            <>
              <h2>Novas inscrições {etiquetaNova(novas.length)}</h2>

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
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-primary"
                  onClick={() => abrir(lerInscricoes, '/admin/inscricoes')}
                >
                  Ver inscrições
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificacoesInscricoes;
