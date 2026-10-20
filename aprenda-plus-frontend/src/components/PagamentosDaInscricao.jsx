import { useState } from 'react';
import { formatarValor } from '../utils/precoCurso';
import { formatarData, situacaoDaParcela, rotuloDaSituacao } from '../utils/financeiro';
import logo from '../assets/logo-aprenda-plus.png';

// Recibo de uma parcela paga, pronto para imprimir ou salvar em PDF
export function Recibo({ parcela, aluno, onFechar }) {
  return (
    <div className="recibo-fundo" role="dialog" aria-modal="true" aria-label="Recibo de pagamento">
      <div className="recibo">
        <div className="recibo-topo">
          <img src={logo} alt="Aprenda Plus" />
          <div>
            <strong>Recibo nº {String(parcela.idPagamento).padStart(6, '0')}</strong>
            <span>Emitido em {formatarData(new Date().toISOString())}</span>
          </div>
        </div>

        <p className="recibo-texto">
          Recebemos de <strong>{aluno || 'Aluno(a)'}</strong> o valor de <strong>{formatarValor(parcela.valor)}</strong>,
          referente à parcela <strong>{parcela.numeroParcela} de {parcela.totalParcelas}</strong> do curso{' '}
          <strong>{parcela.curso}</strong>
          {parcela.turma ? ` (${parcela.turma})` : ''}.
        </p>

        <dl className="recibo-dados">
          <div><dt>Vencimento</dt><dd>{formatarData(parcela.vencimento)}</dd></div>
          <div><dt>Pago em</dt><dd>{formatarData(parcela.dataPagamento)}</dd></div>
          <div><dt>Forma de pagamento</dt><dd>{parcela.formaPagamento || '-'}</dd></div>
        </dl>

        <p className="recibo-aviso">
          Documento sem valor fiscal. Pagamento simulado em projeto acadêmico (+PraTi / Codifica).
        </p>

        <div className="recibo-acoes">
          <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => window.print()}>
            Imprimir / salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// Resumo das parcelas de uma inscrição, com a lista completa ao abrir
function PagamentosDaInscricao({ parcelas, aluno }) {
  const [aberto, setAberto] = useState(false);
  const [recibo, setRecibo] = useState(null);

  if (!parcelas || parcelas.length === 0) {
    return null;
  }

  const validas = parcelas.filter((p) => p.status !== 'cancelado');
  const pagas = validas.filter((p) => p.status === 'pago').length;
  const atrasadas = validas.filter((p) => situacaoDaParcela(p) === 'atrasado');
  const proxima = validas.find((p) => p.status === 'pendente' || p.status === 'atrasado');

  return (
    <section className="meus-pagamentos">
      <div className="meus-pagamentos-resumo">
        <span>
          💳 <strong>{pagas} de {validas.length}</strong> {validas.length === 1 ? 'parcela paga' : 'parcelas pagas'}
        </span>
        {proxima && (
          <span>
            Próxima: {formatarValor(proxima.valor)} em {formatarData(proxima.vencimento)}
          </span>
        )}
        {atrasadas.length > 0 && (
          <span className="meus-pagamentos-atraso">
            ⚠ {atrasadas.length} em atraso
          </span>
        )}
        <button type="button" className="meus-pagamentos-botao" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          {aberto ? 'Esconder parcelas' : 'Ver parcelas'}
        </button>
      </div>

      {aberto && (
        <ul className="meus-pagamentos-lista">
          {parcelas.map((p) => (
            <li key={p.idPagamento}>
              <span>Parcela {p.numeroParcela}/{p.totalParcelas}</span>
              <span>{formatarValor(p.valor)}</span>
              <span>Vence {formatarData(p.vencimento)}</span>
              <span
                className={`status-badge parcela-${situacaoDaParcela(p)}`}
                title={situacaoDaParcela(p) === 'automatica' ? 'Cobrada sozinha no vencimento, no seu cartão' : undefined}
              >
                {rotuloDaSituacao(p)}
              </span>
              {p.status === 'pago' ? (
                <button type="button" className="meus-pagamentos-recibo" onClick={() => setRecibo(p)}>
                  Recibo
                </button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ul>
      )}

      {recibo && <Recibo parcela={recibo} aluno={aluno} onFechar={() => setRecibo(null)} />}
    </section>
  );
}

export default PagamentosDaInscricao;
