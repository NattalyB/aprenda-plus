import { useEffect, useState } from 'react';
import {
  buscarResumoFinanceiro,
  listarParcelas,
  registrarPagamentoDaParcela,
  estornarParcela,
  gerarParcelasQueFaltam,
} from '../../services/financeiroService';
import { formatarValor } from '../../utils/precoCurso';
import {
  situacaoDaParcela,
  rotuloDaSituacao,
  formatarData,
  hojeISO,
  gerarCsvDeParcelas,
  baixarArquivo,
} from '../../utils/financeiro';
import { GraficoMensal, BarrasHorizontais } from '../../components/admin/GraficosFinanceiro';
import PreviaDaBaixa from '../../components/admin/financeiro/PreviaDaBaixa';
import ContasAPagar from '../../components/admin/financeiro/ContasAPagar';
import FluxoDeCaixa from '../../components/admin/financeiro/FluxoDeCaixa';
import PagamentoProfessores from '../../components/admin/financeiro/PagamentoProfessores';
import RegrasDeCobranca from '../../components/admin/financeiro/RegrasDeCobranca';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FILTROS = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'pendente', rotulo: 'A vencer' },
  { valor: 'atrasado', rotulo: 'Atrasadas' },
  { valor: 'automatica', rotulo: 'Automáticas' },
  { valor: 'pago', rotulo: 'Pagas' },
  { valor: 'cancelado', rotulo: 'Canceladas' },
];

const FORMAS = ['Pix', 'Cartão de crédito', 'Boleto bancário', 'Dinheiro', 'Transferência'];

// Abas que só carregam os próprios dados quando são abertas
const ABAS_EXTRAS = [
  { chave: 'contas', rotulo: 'Contas a pagar' },
  { chave: 'fluxo', rotulo: 'Fluxo de caixa' },
  { chave: 'professores', rotulo: 'Professores' },
  { chave: 'regras', rotulo: 'Regras de cobrança' },
];

// Módulo Financeiro do painel: indicadores, gráficos e as parcelas de todas as matrículas
function AdminFinanceiro() {
  const [aba, setAba] = useState('visao');
  const [resumo, setResumo] = useState(null);
  const [parcelas, setParcelas] = useState(null);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  // Parcela com o formulário de baixa aberto
  const [baixa, setBaixa] = useState(null);
  const [processando, setProcessando] = useState(false);

  const carregar = () =>
    Promise.all([buscarResumoFinanceiro(), listarParcelas()])
      .then(([novoResumo, novasParcelas]) => {
        setResumo(novoResumo);
        setParcelas(novasParcelas);
      })
      .catch(() => setErro('Não foi possível carregar o financeiro.'));

  useEffect(() => {
    carregar();
  }, []);

  const mensagemDoErro = (error, padrao) => error.response?.data?.mensagem || padrao;

  const avisar = (texto) => {
    setErro(null);
    setSucesso(texto);
  };

  const abrirBaixa = (parcela) => {
    setSucesso(null);
    setBaixa({ id: parcela.idPagamento, data: hojeISO(), forma: parcela.formaPagamento || 'Pix', isentar: false, desconto: '' });
  };

  const confirmarBaixa = (parcela) => {
    setProcessando(true);
    const dados = { dataPagamento: baixa.data, formaPagamento: baixa.forma };
    if (baixa.isentar) dados.isentarEncargos = true;
    if (String(baixa.desconto || '').trim() !== '') dados.desconto = String(baixa.desconto).trim();
    registrarPagamentoDaParcela(parcela.idPagamento, dados)
      .then(() => {
        avisar(`Pagamento da parcela ${parcela.numeroParcela}/${parcela.totalParcelas} de ${parcela.aluno} registrado.`);
        setBaixa(null);
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível registrar o pagamento.')))
      .finally(() => setProcessando(false));
  };

  const estornar = (parcela) => {
    if (!window.confirm(`Desfazer o pagamento da parcela ${parcela.numeroParcela}/${parcela.totalParcelas} de ${parcela.aluno}?`)) {
      return;
    }
    estornarParcela(parcela.idPagamento)
      .then(() => {
        avisar('Pagamento desfeito. A parcela voltou a ficar em aberto.');
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível desfazer o pagamento.')));
  };

  const gerarFaltantes = () => {
    gerarParcelasQueFaltam()
      .then(({ matriculas }) => {
        avisar(
          matriculas > 0
            ? `Parcelas geradas para ${matriculas} ${matriculas === 1 ? 'matrícula' : 'matrículas'}.`
            : 'Todas as matrículas ativas já têm parcelas.'
        );
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível gerar as parcelas.')));
  };

  // As abas novas cuidam dos próprios dados (não dependem das parcelas)
  const abaExtra = ABAS_EXTRAS.some((a) => a.chave === aba);

  if (!abaExtra && (!parcelas || !resumo)) {
    return erro ? <div className="form-erro">{erro}</div> : <p>Carregando financeiro...</p>;
  }

  const termo = normalizar(busca.trim());
  const filtradas = (parcelas || []).filter(
    (p) =>
      (filtro === 'todas' || situacaoDaParcela(p) === filtro) &&
      (!termo || normalizar(p.aluno).includes(termo) || normalizar(p.curso).includes(termo))
  );
  const totalFiltrado = filtradas.reduce((soma, p) => soma + Number(p.valor), 0);
  const contagem = (situacao) => (parcelas || []).filter((p) => situacaoDaParcela(p) === situacao).length;
  // Pix/cartão que já chegou no vencimento caiu sozinho: não tem o que desfazer
  const podeDesfazer = (p) => p.status === 'pago' && !(p.cobrancaAutomatica && p.vencimento <= hojeISO());
  const percentualRecebido =
    resumo && Number(resumo.previstoNoMes) > 0
      ? Math.round((Number(resumo.recebidoNoMes) / Number(resumo.previstoNoMes)) * 100)
      : 0;

  const exportar = () => baixarArquivo(`parcelas-${hojeISO()}.csv`, gerarCsvDeParcelas(filtradas));

  return (
    <div className="financeiro">
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Financeiro</h1>
          <p className="admin-subtitulo">
            Parcelas das matrículas, recebimentos e indicadores. Pix e cartão de crédito caem sozinhos no vencimento;
            só os boletos precisam de baixa aqui. Pagamentos simulados.
          </p>
        </div>
        {!abaExtra && (
          <button type="button" className="admin-btn admin-btn-secundario financeiro-sem-impressao" onClick={gerarFaltantes}>
            Gerar parcelas que faltam
          </button>
        )}
      </div>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

      <div className="financeiro-abas financeiro-sem-impressao" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'visao'} onClick={() => setAba('visao')}>
          Visão geral
        </button>
        <button type="button" role="tab" aria-selected={aba === 'parcelas'} onClick={() => setAba('parcelas')}>
          Parcelas {parcelas && <span className="financeiro-aba-contador">{parcelas.length}</span>}
        </button>
        {ABAS_EXTRAS.map((a) => (
          <button key={a.chave} type="button" role="tab" aria-selected={aba === a.chave} onClick={() => setAba(a.chave)}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'contas' && <ContasAPagar />}
      {aba === 'fluxo' && <FluxoDeCaixa />}
      {aba === 'professores' && <PagamentoProfessores />}
      {aba === 'regras' && <RegrasDeCobranca />}

      {abaExtra ? null : aba === 'visao' ? (
        <>
          <ul className="financeiro-indicadores">
            <li>
              <span>Previsto no mês</span>
              <strong>{formatarValor(resumo.previstoNoMes)}</strong>
            </li>
            <li>
              <span>Recebido no mês</span>
              <strong>{formatarValor(resumo.recebidoNoMes)}</strong>
              <small>{percentualRecebido}% do previsto</small>
            </li>
            <li className={Number(resumo.parcelasAtrasadas) > 0 ? 'financeiro-alerta' : undefined}>
              <span>Em atraso</span>
              <strong>{formatarValor(resumo.emAtraso)}</strong>
              <small>
                {resumo.parcelasAtrasadas} {resumo.parcelasAtrasadas === 1 ? 'parcela' : 'parcelas'}
              </small>
            </li>
            <li>
              <span>Inadimplência</span>
              <strong>{String(resumo.inadimplencia).replace('.', ',')}%</strong>
              <small>do que já venceu</small>
            </li>
            <li>
              <span>A receber</span>
              <strong>{formatarValor(resumo.aReceber)}</strong>
              <small>parcelas em aberto</small>
            </li>
          </ul>

          <section className="financeiro-cartao">
            <h2>Receita por mês</h2>
            <GraficoMensal dados={resumo.porMes} mesAtual={hojeISO().slice(0, 7)} />
          </section>

          <div className="financeiro-colunas">
            <section className="financeiro-cartao">
              <h2>Receita por curso</h2>
              <BarrasHorizontais itens={resumo.porCurso} rotulo="Receita por curso" />
            </section>
            <section className="financeiro-cartao">
              <h2>Formas de pagamento</h2>
              <BarrasHorizontais itens={resumo.porForma} rotulo="Formas de pagamento" />
            </section>
          </div>
        </>
      ) : (
        <>
          <div className="financeiro-filtros financeiro-sem-impressao">
            <div className="financeiro-chips">
              {FILTROS.map((f) => (
                <button
                  key={f.valor}
                  type="button"
                  className={filtro === f.valor ? 'financeiro-chip ativo' : 'financeiro-chip'}
                  aria-pressed={filtro === f.valor}
                  onClick={() => setFiltro(f.valor)}
                >
                  {f.rotulo}
                  {f.valor !== 'todas' && <span>{contagem(f.valor)}</span>}
                </button>
              ))}
            </div>
            <div className="admin-busca">
              <span className="admin-busca-icone">🔍</span>
              <input
                type="text"
                name="buscaParcela"
                placeholder="Buscar por aluno ou curso..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="financeiro-exportar">
              <button type="button" className="admin-btn admin-btn-secundario" onClick={exportar} disabled={filtradas.length === 0}>
                ⬇ Exportar planilha
              </button>
              <button type="button" className="admin-btn admin-btn-secundario" onClick={() => window.print()}>
                🖨 Imprimir
              </button>
            </div>
          </div>

          <p className="financeiro-total">
            {filtradas.length} {filtradas.length === 1 ? 'parcela' : 'parcelas'} · total de {formatarValor(totalFiltrado)}
          </p>

          <div className="admin-card">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Curso / turma</th>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Situação</th>
                    <th>Pagamento</th>
                    <th className="financeiro-sem-impressao">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="admin-vazio">
                        {parcelas.length === 0
                          ? 'Nenhuma parcela ainda. Confirme o pagamento de uma inscrição ou clique em "Gerar parcelas que faltam".'
                          : 'Nenhuma parcela encontrada com esses filtros.'}
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((p) => (
                      <tr key={p.idPagamento}>
                        <td>{p.aluno || '-'}</td>
                        <td>
                          {p.curso}
                          {p.turma && <small className="financeiro-detalhe">{p.turma}</small>}
                        </td>
                        <td>{p.numeroParcela}/{p.totalParcelas}</td>
                        <td>{formatarData(p.vencimento)}</td>
                        <td>
                          {formatarValor(p.valor)}
                          <ValorAtualizado parcela={p} />
                        </td>
                        <td>
                          <span className={`status-badge parcela-${situacaoDaParcela(p)}`}>{rotuloDaSituacao(p)}</span>
                        </td>
                        <td>
                          {p.dataPagamento ? (
                            <>
                              {formatarData(p.dataPagamento)}
                              <small className="financeiro-detalhe">{p.formaPagamento}</small>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="financeiro-sem-impressao">
                          {baixa?.id === p.idPagamento ? (
                            <div className="financeiro-baixa">
                              <label>
                                Pago em
                                <input
                                  type="date"
                                  value={baixa.data}
                                  max={hojeISO()}
                                  onChange={(e) => setBaixa({ ...baixa, data: e.target.value })}
                                />
                              </label>
                              <label>
                                Forma
                                <select value={baixa.forma} onChange={(e) => setBaixa({ ...baixa, forma: e.target.value })}>
                                  {[...new Set([...FORMAS, baixa.forma])].map((forma) => (
                                    <option key={forma} value={forma}>{forma}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Desconto (R$)
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="automático"
                                  value={baixa.desconto}
                                  onChange={(e) => setBaixa({ ...baixa, desconto: e.target.value })}
                                />
                              </label>
                              <label className="financeiro-baixa-check">
                                <input
                                  type="checkbox"
                                  checked={baixa.isentar}
                                  onChange={(e) => setBaixa({ ...baixa, isentar: e.target.checked })}
                                />
                                Isentar multa e juros
                              </label>
                              <PreviaDaBaixa
                                idPagamento={p.idPagamento}
                                data={baixa.data}
                                isentarEncargos={baixa.isentar}
                                desconto={baixa.desconto}
                              />
                              <div className="admin-acoes">
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-btn-primary"
                                  disabled={processando}
                                  onClick={() => confirmarBaixa(p)}
                                >
                                  Confirmar
                                </button>
                                <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => setBaixa(null)}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {situacaoDaParcela(p) === 'automatica' && (
                                <span className="financeiro-automatica">Cai sozinha no vencimento</span>
                              )}
                              {(situacaoDaParcela(p) === 'pendente' || situacaoDaParcela(p) === 'atrasado') && (
                                <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => abrirBaixa(p)}>
                                  Registrar pagamento
                                </button>
                              )}
                              {podeDesfazer(p) && (
                                <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => estornar(p)}>
                                  Desfazer
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Embaixo do valor: quanto foi pago (com multa/juros/desconto) ou quanto custa pagar hoje
function ValorAtualizado({ parcela }) {
  const atualizado = Number(parcela.valorAtualizado);
  if (parcela.valorAtualizado == null || Math.abs(atualizado - Number(parcela.valor)) < 0.005) return null;
  if (parcela.status === 'pago') {
    return <small className="financeiro-detalhe">pago {formatarValor(atualizado)}</small>;
  }
  if (parcela.status === 'pendente' || parcela.status === 'atrasado') {
    return (
      <small className={atualizado > Number(parcela.valor) ? 'financeiro-detalhe financeiro-encargo' : 'financeiro-detalhe'}>
        hoje {formatarValor(atualizado)}
      </small>
    );
  }
  return null;
}

export default AdminFinanceiro;
