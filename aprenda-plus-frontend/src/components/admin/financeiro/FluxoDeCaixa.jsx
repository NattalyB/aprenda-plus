import { useEffect, useState } from 'react';
import { buscarFluxoDeCaixa } from '../../../services/financeiroService';
import { formatarValor } from '../../../utils/precoCurso';
import { hojeISO, nomeDoMes } from '../../../utils/financeiro';
import { GraficoFluxo, BarrasHorizontais } from '../GraficosFinanceiro';

// Financeiro > Fluxo de caixa: o que entrou (parcelas) e saiu (contas) e o que ainda está previsto
function FluxoDeCaixa() {
  const [fluxo, setFluxo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    Promise.resolve(buscarFluxoDeCaixa())
      .then((dados) => setFluxo(dados || null))
      .catch(() => setErro('Não foi possível carregar o fluxo de caixa.'));
  }, []);

  if (erro) return <div className="form-erro">{erro}</div>;
  if (!fluxo) return <p>Carregando fluxo de caixa...</p>;

  const mesAtual = hojeISO().slice(0, 7);
  const saldoPositivo = Number(fluxo.saldoNoMes) >= 0;
  const ultimo = fluxo.meses[fluxo.meses.length - 1];

  return (
    <section aria-label="Fluxo de caixa">
      <ul className="financeiro-indicadores">
        <li>
          <span>Entrou no mês</span>
          <strong>{formatarValor(fluxo.entradasNoMes)}</strong>
          <small>parcelas recebidas</small>
        </li>
        <li>
          <span>Saiu no mês</span>
          <strong>{formatarValor(fluxo.saidasNoMes)}</strong>
          <small>contas pagas</small>
        </li>
        <li className={saldoPositivo ? undefined : 'financeiro-alerta'}>
          <span>Saldo do mês</span>
          <strong>{formatarValor(fluxo.saldoNoMes)}</strong>
          <small>{saldoPositivo ? '▲ entrou mais do que saiu' : '▼ saiu mais do que entrou'}</small>
        </li>
        <li>
          <span>Ainda a receber</span>
          <strong>{formatarValor(fluxo.aReceberNoMes)}</strong>
          <small>neste mês (inclui atrasadas)</small>
        </li>
        <li className={Number(fluxo.contasAtrasadas) > 0 ? 'financeiro-alerta' : undefined}>
          <span>Ainda a pagar</span>
          <strong>{formatarValor(fluxo.aPagarNoMes)}</strong>
          <small>
            {Number(fluxo.contasAtrasadas) > 0
              ? `⚠ ${fluxo.contasAtrasadas} ${Number(fluxo.contasAtrasadas) === 1 ? 'conta atrasada' : 'contas atrasadas'}`
              : 'neste mês'}
          </small>
        </li>
      </ul>

      <section className="financeiro-cartao">
        <h2>Entradas e saídas por mês</h2>
        <GraficoFluxo dados={fluxo.meses} mesAtual={mesAtual} />
        {ultimo && (
          <p className="financeiro-nota">
            Se tudo o que está previsto acontecer, o saldo acumulado até {nomeDoMes(ultimo.mes)} fica em{' '}
            <strong>{formatarValor(ultimo.saldoAcumulado)}</strong> (somando desde {nomeDoMes(fluxo.meses[0].mes)}).
          </p>
        )}
      </section>

      <section className="financeiro-cartao">
        <h2>Despesas do mês por categoria</h2>
        <BarrasHorizontais
          itens={fluxo.despesasPorCategoria}
          rotulo="Despesas do mês por categoria"
          vazio="Nenhuma despesa neste mês. Cadastre as contas na aba Contas a pagar."
        />
      </section>
    </section>
  );
}

export default FluxoDeCaixa;
