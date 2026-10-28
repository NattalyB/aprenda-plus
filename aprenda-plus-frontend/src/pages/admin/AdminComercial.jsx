import { useCallback, useEffect, useState } from 'react';
import { buscarPainelComercial, listarLeads } from '../../services/comercialService';
import { formatarValor } from '../../utils/precoCurso';
import { baixarArquivo, hojeISO } from '../../utils/financeiro';
import {
  ETAPAS,
  FILTROS_PADRAO,
  ORDEM_ETAPAS,
  PERIODOS,
  contarPorEtapa,
  filtrarLeads,
  formatarDataHora,
  formatarPorcentagem,
  gerarCsvDeLeads,
  linkWhatsappDoLead,
  rotuloDoResultado,
  textoDiasParado,
  valorEmAberto,
} from '../../utils/comercial';
import FunilDeVendas from '../../components/admin/comercial/FunilDeVendas';
import GraficoDiario from '../../components/admin/comercial/GraficoDiario';
import ContatosDoLead from '../../components/admin/comercial/ContatosDoLead';

const DIAS_PARADO = [
  { valor: 0, rotulo: 'Qualquer tempo' },
  { valor: 1, rotulo: 'Parados há 1 dia ou mais' },
  { valor: 7, rotulo: 'Parados há 7 dias ou mais' },
  { valor: 30, rotulo: 'Parados há 30 dias ou mais' },
];

// Mostra o primeiro erro que aparecer (ex.: sem permissão), sem um segundo erro apagar a explicação
const mensagemDeErro = (error, padrao) => error.response?.data?.erro || error.response?.data?.mensagem || padrao;

// Módulo Comercial: funil de vendas, leads para recuperar e interesse nos cursos
function AdminComercial() {
  const [aba, setAba] = useState('visao');
  const [dias, setDias] = useState(30);
  const [painel, setPainel] = useState(null);
  const [leads, setLeads] = useState(null);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_PADRAO);
  const [leadAberto, setLeadAberto] = useState(null);

  useEffect(() => {
    buscarPainelComercial(dias)
      .then(setPainel)
      .catch((error) => setErro((atual) => atual || mensagemDeErro(error, 'Não foi possível carregar o painel comercial.')));
  }, [dias]);

  const carregarLeads = useCallback(
    () =>
      listarLeads()
        .then(setLeads)
        .catch((error) => setErro((atual) => atual || mensagemDeErro(error, 'Não foi possível carregar os leads.'))),
    []
  );

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  const fecharLead = useCallback(() => setLeadAberto(null), []);

  const contagem = contarPorEtapa(leads || []);
  const filtrados = filtrarLeads(leads || [], filtros);
  const mudarFiltro = (campo, valor) => setFiltros((atual) => ({ ...atual, [campo]: valor }));

  const verLeads = (etapa) => {
    setFiltros({ ...FILTROS_PADRAO, etapa });
    setAba('leads');
  };

  // Troca o período: limpa o painel para mostrar "Carregando..." até chegar o novo
  const trocarPeriodo = (novo) => {
    if (novo === dias) return;
    setPainel(null);
    setDias(novo);
  };

  const exportar = () => baixarArquivo(`leads-aprendaplus-${hojeISO()}.csv`, gerarCsvDeLeads(filtrados));

  const seletorDePeriodo = (
    <div className="financeiro-chips" role="group" aria-label="Período">
      {PERIODOS.map((p) => (
        <button
          key={p}
          type="button"
          className={dias === p ? 'financeiro-chip ativo' : 'financeiro-chip'}
          aria-pressed={dias === p}
          onClick={() => trocarPeriodo(p)}
        >
          Últimos {p} dias
        </button>
      ))}
    </div>
  );

  return (
    <div className="financeiro comercial">
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Comercial</h1>
          <p className="admin-subtitulo">
            Quem visita o site, o que procura e quem começou a comprar e não terminou.
          </p>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="financeiro-abas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'visao'} onClick={() => setAba('visao')}>
          Visão geral
        </button>
        <button type="button" role="tab" aria-selected={aba === 'leads'} onClick={() => setAba('leads')}>
          Leads
          {leads && <span className="financeiro-aba-contador">{leads.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={aba === 'interesse'} onClick={() => setAba('interesse')}>
          Interesse nos cursos
        </button>
      </div>

      {aba === 'visao' && (
        <section aria-label="Visão geral">
          <div className="financeiro-filtros">{seletorDePeriodo}</div>
          {!painel ? (
            <p className="grafico-vazio">Carregando...</p>
          ) : (
            <>
              <ul className="financeiro-indicadores">
                <li>
                  <span>Visitantes</span>
                  <strong>{painel.indicadores.visitantes}</strong>
                  <small>pessoas diferentes no site</small>
                </li>
                <li>
                  <span>Novos cadastros</span>
                  <strong>{painel.indicadores.cadastros}</strong>
                </li>
                <li>
                  <span>Inscrições</span>
                  <strong>{painel.indicadores.inscricoes}</strong>
                </li>
                <li>
                  <span>Matrículas</span>
                  <strong>{painel.indicadores.matriculas}</strong>
                </li>
                <li>
                  <span>Conversão</span>
                  <strong>{formatarPorcentagem(painel.indicadores.conversao)}</strong>
                  <small>dos visitantes se matricularam</small>
                </li>
                <li className={painel.indicadores.buscasSemResultado > 0 ? 'financeiro-alerta' : undefined}>
                  <span>Buscas sem resultado</span>
                  <strong>{painel.indicadores.buscasSemResultado}</strong>
                  <small>de {painel.indicadores.buscas} buscas</small>
                </li>
              </ul>

              <div className="financeiro-colunas">
                <div className="financeiro-cartao">
                  <h2>Funil de vendas</h2>
                  <FunilDeVendas funil={painel.funil} />
                  <p className="comercial-nota">
                    Em vermelho, quantas pessoas se perderam desde a etapa anterior.
                  </p>
                </div>

                <div className="financeiro-cartao">
                  <h2>Compras para recuperar</h2>
                  {!leads ? (
                    <p className="grafico-vazio">Carregando...</p>
                  ) : (
                    <>
                      <ul className="comercial-resumo-leads">
                        {ORDEM_ETAPAS.map((etapa) => (
                          <li key={etapa}>
                            <button type="button" onClick={() => verLeads(etapa)}>
                              <span className={`comercial-etapa ${ETAPAS[etapa].classe}`}>{ETAPAS[etapa].rotulo}</span>
                              <strong>{contagem[etapa]}</strong>
                              <small>{ETAPAS[etapa].descricao}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="comercial-nota">
                        Valor parado em pagamentos pendentes e carrinhos: <strong>{formatarValor(valorEmAberto(leads))}</strong>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="financeiro-cartao">
                <h2>Visitantes por dia</h2>
                <GraficoDiario dias={painel.porDia} />
              </div>
            </>
          )}
        </section>
      )}

      {aba === 'leads' && (
        <section aria-label="Leads">
          <div className="financeiro-filtros">
            <div className="financeiro-chips" role="group" aria-label="Etapa">
              {['todas', ...ORDEM_ETAPAS].map((etapa) => (
                <button
                  key={etapa}
                  type="button"
                  className={filtros.etapa === etapa ? 'financeiro-chip ativo' : 'financeiro-chip'}
                  aria-pressed={filtros.etapa === etapa}
                  onClick={() => mudarFiltro('etapa', etapa)}
                >
                  {etapa === 'todas' ? 'Todos' : ETAPAS[etapa].rotulo}
                  <span>{contagem[etapa] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="financeiro-filtros">
            <div className="admin-busca">
              <span className="admin-busca-icone">🔍</span>
              <input
                type="text"
                placeholder="Buscar por nome, e-mail, telefone ou curso"
                aria-label="Buscar leads"
                value={filtros.busca}
                onChange={(e) => mudarFiltro('busca', e.target.value)}
              />
            </div>
            <select
              className="admin-filtro-select"
              aria-label="Tempo parado"
              value={filtros.diasMinimos}
              onChange={(e) => mudarFiltro('diasMinimos', Number(e.target.value))}
            >
              {DIAS_PARADO.map((d) => (
                <option key={d.valor} value={d.valor}>{d.rotulo}</option>
              ))}
            </select>
            <div className="financeiro-exportar">
              <button
                type="button"
                className="admin-btn admin-btn-secundario"
                onClick={exportar}
                disabled={filtrados.length === 0}
              >
                Exportar planilha
              </button>
            </div>
          </div>

          <div className="comercial-opcoes">
            <label>
              <input
                type="checkbox"
                checked={filtros.soComConsentimento}
                onChange={(e) => mudarFiltro('soComConsentimento', e.target.checked)}
              />
              Só quem aceita receber ofertas (para campanhas)
            </label>
            <label>
              <input
                type="checkbox"
                checked={filtros.ocultarSemInteresse}
                onChange={(e) => mudarFiltro('ocultarSemInteresse', e.target.checked)}
              />
              Esconder quem disse que não tem interesse
            </label>
          </div>

          {!leads ? (
            <p className="grafico-vazio">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="admin-vazio">Nenhum lead com esses filtros.</div>
          ) : (
            <>
              <p className="financeiro-total">
                {filtrados.length} {filtrados.length === 1 ? 'pessoa' : 'pessoas'}
              </p>
              <div className="admin-table-wrapper">
                <table className="admin-table comercial-tabela">
                  <thead>
                    <tr>
                      <th>Pessoa</th>
                      <th>Onde parou</th>
                      <th>Cursos</th>
                      <th>Valor</th>
                      <th>Parado</th>
                      <th>Último contato</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((lead) => {
                      const whatsapp = linkWhatsappDoLead(lead);
                      return (
                        <tr key={lead.idAluno}>
                          <td>
                            <strong>{lead.nome}</strong>
                            <span className="comercial-detalhe">{lead.email}</span>
                            <span className="comercial-detalhe">{lead.telefone}</span>
                          </td>
                          <td>
                            <span className={`comercial-etapa ${ETAPAS[lead.etapa]?.classe || ''}`}>
                              {ETAPAS[lead.etapa]?.rotulo || lead.etapa}
                            </span>
                            {lead.jaEhAluno && <span className="comercial-tag">Já é aluno</span>}
                            {!lead.aceitaMarketing && (
                              <span className="comercial-tag comercial-tag-neutra" title="Não aceitou receber ofertas">
                                Sem ofertas
                              </span>
                            )}
                          </td>
                          <td>{lead.cursos?.length ? lead.cursos.join(', ') : '-'}</td>
                          <td className="comercial-numero">
                            {lead.valor === null || lead.valor === undefined ? '-' : formatarValor(lead.valor)}
                          </td>
                          <td className="comercial-numero">{textoDiasParado(lead.diasParado)}</td>
                          <td>
                            {lead.ultimoContato ? (
                              <>
                                {rotuloDoResultado(lead.ultimoContato.resultado)}
                                <span className="comercial-detalhe">
                                  {formatarDataHora(lead.ultimoContato.quando)} · {lead.ultimoContato.funcionarioNome}
                                </span>
                              </>
                            ) : (
                              <span className="comercial-detalhe">Nenhum ainda</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-acoes">
                              {whatsapp && (
                                <a
                                  className="admin-btn admin-btn-sm admin-btn-primary"
                                  href={whatsapp}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`WhatsApp de ${lead.nome}`}
                                >
                                  WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-secundario"
                                onClick={() => setLeadAberto(lead)}
                              >
                                Contatos
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="comercial-nota">
            💡 Lembrete sobre uma compra parada pode ser feito com qualquer aluno. Campanhas e ofertas novas,
            só para quem marcou que aceita receber (LGPD).
          </p>
        </section>
      )}

      {aba === 'interesse' && (
        <section aria-label="Interesse nos cursos">
          <div className="financeiro-filtros">{seletorDePeriodo}</div>
          {!painel ? (
            <p className="grafico-vazio">Carregando...</p>
          ) : (
            <>
              <div className="financeiro-cartao">
                <h2>Cursos mais procurados</h2>
                <div className="admin-table-wrapper">
                  <table className="admin-table comercial-tabela">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th title="Pessoas diferentes que abriram os detalhes do curso">Abriram</th>
                        <th>Visitantes</th>
                        <th title="Abriram estando logados como aluno">Alunos</th>
                        <th>No carrinho</th>
                        <th>Inscrições</th>
                        <th>Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {painel.cursos.map((curso) => (
                        <tr key={curso.idCurso} className={curso.pessoas === 0 ? 'comercial-linha-apagada' : undefined}>
                          <td>
                            <strong>{curso.nome}</strong>
                            {curso.categoria && <span className="comercial-detalhe">{curso.categoria}</span>}
                          </td>
                          <td className="comercial-numero">{curso.pessoas}</td>
                          <td className="comercial-numero">{curso.visitantes}</td>
                          <td className="comercial-numero">{curso.alunos}</td>
                          <td className="comercial-numero">{curso.carrinho}</td>
                          <td className="comercial-numero">{curso.inscricoes}</td>
                          <td className="comercial-numero">{formatarPorcentagem(curso.conversao)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="comercial-nota">
                  Abriram = pessoas diferentes que abriram os detalhes do curso. Conversão = inscrições ÷ pessoas que abriram. Cursos em cinza não foram abertos no período.
                </p>
              </div>

              <div className="financeiro-colunas">
                <div className="financeiro-cartao">
                  <h2>Termos mais buscados</h2>
                  {painel.buscas.length === 0 ? (
                    <p className="grafico-vazio">Ninguém usou a busca neste período.</p>
                  ) : (
                    <ol className="comercial-termos">
                      {painel.buscas.map((termo) => (
                        <li key={termo.termo}>
                          <span className="comercial-termo">{termo.termo}</span>
                          {termo.semResultado && <span className="comercial-tag comercial-tag-alerta">Sem resultado</span>}
                          <span className="comercial-detalhe">
                            {termo.vezes} {termo.vezes === 1 ? 'busca' : 'buscas'} · {termo.pessoas}{' '}
                            {termo.pessoas === 1 ? 'pessoa' : 'pessoas'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="financeiro-cartao">
                  <h2>Procuraram e não encontraram</h2>
                  {painel.buscas.filter((t) => t.semResultado).length === 0 ? (
                    <p className="grafico-vazio">Todas as buscas encontraram algum curso. 🎉</p>
                  ) : (
                    <>
                      <ul className="comercial-termos">
                        {painel.buscas
                          .filter((t) => t.semResultado)
                          .map((termo) => (
                            <li key={termo.termo}>
                              <span className="comercial-termo">{termo.termo}</span>
                              <span className="comercial-detalhe">
                                {termo.pessoas} {termo.pessoas === 1 ? 'pessoa' : 'pessoas'}
                              </span>
                            </li>
                          ))}
                      </ul>
                      <p className="comercial-nota">
                        Ideias de cursos novos, ou de palavras para colocar no nome e na descrição dos cursos que já existem.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {leadAberto && <ContatosDoLead lead={leadAberto} onFechar={fecharLead} onRegistrado={carregarLeads} />}
    </div>
  );
}

export default AdminComercial;
