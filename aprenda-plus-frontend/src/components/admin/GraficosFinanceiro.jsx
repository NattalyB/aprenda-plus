import { useState } from 'react';
import { formatarValor } from '../../utils/precoCurso';
import { nomeDoMes } from '../../utils/financeiro';

// Cores das séries (validadas para daltonismo e contraste)
export const COR_PREVISTO = '#0891b2';
export const COR_RECEBIDO = '#1d4ed8';

// 12500 -> "12,5 mil"
export const formatarCompacto = (valor) => {
  const numero = Number(valor || 0);
  const opcoes = { maximumFractionDigits: 1 };
  if (numero >= 1000000) return `${(numero / 1000000).toLocaleString('pt-BR', opcoes)} mi`;
  if (numero >= 1000) return `${(numero / 1000).toLocaleString('pt-BR', opcoes)} mil`;
  return numero.toLocaleString('pt-BR', opcoes);
};

// Arredonda o topo do eixo para um número "redondo" (1, 2, 5 x 10^n)
export const topoDoEixo = (maximo) => {
  if (!maximo || maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const passo = [1, 2, 5, 10].find((m) => m * potencia >= maximo);
  return passo * potencia;
};

// Barra com os cantos de cima arredondados (a base fica reta, presa no eixo)
const caminhoDaBarra = (x, y, largura, altura) => {
  if (altura <= 0) return '';
  const r = Math.min(4, largura / 2, altura);
  return `M${x},${y + altura} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y + altura} Z`;
};

const LARGURA = 760;
const ALTURA = 260;
const MARGEM = { topo: 12, direita: 8, base: 30, esquerda: 56 };

// Receita por mês: previsto (pelo vencimento) x recebido (pela data do pagamento)
export function GraficoMensal({ dados, mesAtual }) {
  const [destaque, setDestaque] = useState(null);
  const maximo = topoDoEixo(Math.max(0, ...dados.flatMap((d) => [Number(d.previsto), Number(d.recebido)])));
  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const larguraGrupo = larguraUtil / Math.max(dados.length, 1);
  const larguraBarra = Math.min(16, larguraGrupo * 0.3);
  const y = (valor) => MARGEM.topo + alturaUtil - (Number(valor) / maximo) * alturaUtil;
  const linhasDeGrade = [0, 0.25, 0.5, 0.75, 1];
  const ativo = destaque === null ? null : dados[destaque];

  return (
    <figure className="grafico">
      <div className="grafico-legenda" aria-hidden="true">
        <span><i style={{ background: COR_PREVISTO }} /> Previsto</span>
        <span><i style={{ background: COR_RECEBIDO }} /> Recebido</span>
      </div>

      <div className="grafico-area">
        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label="Receita prevista e recebida por mês">
          {linhasDeGrade.map((fracao) => {
            const valor = maximo * fracao;
            return (
              <g key={fracao}>
                <line
                  x1={MARGEM.esquerda}
                  x2={LARGURA - MARGEM.direita}
                  y1={y(valor)}
                  y2={y(valor)}
                  className={fracao === 0 ? 'grafico-base' : 'grafico-grade'}
                />
                <text x={MARGEM.esquerda - 8} y={y(valor) + 4} textAnchor="end" className="grafico-eixo">
                  {formatarCompacto(valor)}
                </text>
              </g>
            );
          })}

          {dados.map((d, i) => {
            const centro = MARGEM.esquerda + larguraGrupo * i + larguraGrupo / 2;
            const xPrevisto = centro - larguraBarra - 1;
            const xRecebido = centro + 1;
            return (
              <g key={d.mes}>
                <path d={caminhoDaBarra(xPrevisto, y(d.previsto), larguraBarra, y(0) - y(d.previsto))} fill={COR_PREVISTO} />
                <path d={caminhoDaBarra(xRecebido, y(d.recebido), larguraBarra, y(0) - y(d.recebido))} fill={COR_RECEBIDO} />
                <text
                  x={centro}
                  y={ALTURA - 10}
                  textAnchor="middle"
                  className={d.mes === mesAtual ? 'grafico-eixo grafico-eixo-atual' : 'grafico-eixo'}
                >
                  {nomeDoMes(d.mes)}
                </text>
                {/* Área de toque maior que a barra, para o mouse achar fácil */}
                <rect
                  data-testid={`mes-${d.mes}`}
                  x={MARGEM.esquerda + larguraGrupo * i}
                  y={MARGEM.topo}
                  width={larguraGrupo}
                  height={alturaUtil}
                  fill="transparent"
                  onMouseEnter={() => setDestaque(i)}
                  onMouseLeave={() => setDestaque(null)}
                />
              </g>
            );
          })}
        </svg>

        {ativo && (
          <div
            className="grafico-dica"
            role="tooltip"
            style={{ left: `${((MARGEM.esquerda + larguraGrupo * (destaque + 0.5)) / LARGURA) * 100}%` }}
          >
            <strong>{nomeDoMes(ativo.mes)}</strong>
            <span><i style={{ background: COR_PREVISTO }} /> Previsto: {formatarValor(ativo.previsto)}</span>
            <span><i style={{ background: COR_RECEBIDO }} /> Recebido: {formatarValor(ativo.recebido)}</span>
          </div>
        )}
      </div>

      <details className="grafico-tabela">
        <summary>Ver em tabela</summary>
        <table>
          <thead>
            <tr><th>Mês</th><th>Previsto</th><th>Recebido</th></tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes}>
                <td>{nomeDoMes(d.mes)}</td>
                <td>{formatarValor(d.previsto)}</td>
                <td>{formatarValor(d.recebido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// Barras horizontais com o valor e a porcentagem escritos ao lado (ex.: receita por curso)
export function BarrasHorizontais({ itens, rotulo, vazio = 'Sem dados ainda.' }) {
  const total = itens.reduce((soma, item) => soma + Number(item.valor), 0);
  const maior = Math.max(0, ...itens.map((item) => Number(item.valor)));

  if (itens.length === 0 || total === 0) {
    return <p className="grafico-vazio">{vazio}</p>;
  }

  return (
    <ul className="barras" aria-label={rotulo}>
      {itens.map((item) => {
        const valor = Number(item.valor);
        const porcentagem = Math.round((valor / total) * 100);
        return (
          <li key={item.nome} title={`${item.nome}: ${formatarValor(valor)} (${porcentagem}%)`}>
            <span className="barras-nome">{item.nome}</span>
            <span className="barras-trilho">
              <span className="barras-barra" style={{ width: `${(valor / maior) * 100}%` }} />
            </span>
            <span className="barras-valor">
              {formatarValor(valor)} <small>{porcentagem}%</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Cores do fluxo de caixa (validadas para daltonismo e contraste)
export const COR_ENTRADA = '#1d4ed8';
export const COR_SAIDA = '#c2410c';

// Fluxo de caixa por mês: entradas x saídas. A parte de baixo da barra (cor cheia) é o realizado;
// a de cima (mais clara) é o que ainda está previsto.
export function GraficoFluxo({ dados, mesAtual }) {
  const [destaque, setDestaque] = useState(null);
  const total = (d, tipo) =>
    tipo === 'entrada'
      ? Number(d.entradasRealizadas) + Number(d.entradasPrevistas)
      : Number(d.saidasRealizadas) + Number(d.saidasPrevistas);
  const maximo = topoDoEixo(Math.max(0, ...dados.flatMap((d) => [total(d, 'entrada'), total(d, 'saida')])));
  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const larguraGrupo = larguraUtil / Math.max(dados.length, 1);
  const larguraBarra = Math.min(16, larguraGrupo * 0.3);
  const y = (valor) => MARGEM.topo + alturaUtil - (Number(valor) / maximo) * alturaUtil;
  const altura = (valor) => (Number(valor) / maximo) * alturaUtil;
  const ativo = destaque === null ? null : dados[destaque];

  // Realizado em baixo (base reta); previsto em cima, com 2px de folga entre os dois
  const barra = (x, realizado, previsto, cor) => {
    const hRealizado = altura(realizado);
    const hPrevisto = altura(previsto);
    const temOsDois = hRealizado > 0 && hPrevisto > 0;
    const topoRealizado = MARGEM.topo + alturaUtil - hRealizado;
    return (
      <>
        {hRealizado > 0 && (
          <path
            d={temOsDois
              ? `M${x},${topoRealizado} H${x + larguraBarra} V${topoRealizado + hRealizado} H${x} Z`
              : caminhoDaBarra(x, topoRealizado, larguraBarra, hRealizado)}
            fill={cor}
          />
        )}
        {hPrevisto > 0 && (
          <path
            d={caminhoDaBarra(x, topoRealizado - hPrevisto, larguraBarra, Math.max(hPrevisto - (temOsDois ? 2 : 0), 0.5))}
            fill={cor}
            fillOpacity={0.35}
            stroke={cor}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        )}
      </>
    );
  };

  return (
    <figure className="grafico">
      <div className="grafico-legenda" aria-hidden="true">
        <span><i style={{ background: COR_ENTRADA }} /> Entradas</span>
        <span><i style={{ background: COR_SAIDA }} /> Saídas</span>
        <span><i className="grafico-legenda-previsto" /> Parte clara = previsto (ainda não aconteceu)</span>
      </div>

      <div className="grafico-area">
        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label="Entradas e saídas por mês">
          {[0, 0.25, 0.5, 0.75, 1].map((fracao) => {
            const valor = maximo * fracao;
            return (
              <g key={fracao}>
                <line
                  x1={MARGEM.esquerda}
                  x2={LARGURA - MARGEM.direita}
                  y1={y(valor)}
                  y2={y(valor)}
                  className={fracao === 0 ? 'grafico-base' : 'grafico-grade'}
                />
                <text x={MARGEM.esquerda - 8} y={y(valor) + 4} textAnchor="end" className="grafico-eixo">
                  {formatarCompacto(valor)}
                </text>
              </g>
            );
          })}

          {dados.map((d, i) => {
            const centro = MARGEM.esquerda + larguraGrupo * i + larguraGrupo / 2;
            return (
              <g key={d.mes}>
                {barra(centro - larguraBarra - 1, d.entradasRealizadas, d.entradasPrevistas, COR_ENTRADA)}
                {barra(centro + 1, d.saidasRealizadas, d.saidasPrevistas, COR_SAIDA)}
                <text
                  x={centro}
                  y={ALTURA - 10}
                  textAnchor="middle"
                  className={d.mes === mesAtual ? 'grafico-eixo grafico-eixo-atual' : 'grafico-eixo'}
                >
                  {nomeDoMes(d.mes)}
                </text>
                <rect
                  data-testid={`fluxo-${d.mes}`}
                  x={MARGEM.esquerda + larguraGrupo * i}
                  y={MARGEM.topo}
                  width={larguraGrupo}
                  height={alturaUtil}
                  fill="transparent"
                  onMouseEnter={() => setDestaque(i)}
                  onMouseLeave={() => setDestaque(null)}
                />
              </g>
            );
          })}
        </svg>

        {ativo && (
          <div
            className="grafico-dica"
            role="tooltip"
            style={{ left: `${((MARGEM.esquerda + larguraGrupo * (destaque + 0.5)) / LARGURA) * 100}%` }}
          >
            <strong>{nomeDoMes(ativo.mes)}</strong>
            <span><i style={{ background: COR_ENTRADA }} /> Entradas: {formatarValor(total(ativo, 'entrada'))}</span>
            {Number(ativo.entradasPrevistas) > 0 && <small>({formatarValor(ativo.entradasPrevistas)} previsto)</small>}
            <span><i style={{ background: COR_SAIDA }} /> Saídas: {formatarValor(total(ativo, 'saida'))}</span>
            {Number(ativo.saidasPrevistas) > 0 && <small>({formatarValor(ativo.saidasPrevistas)} previsto)</small>}
            <span>Saldo do mês: {formatarValor(ativo.saldo)}</span>
          </div>
        )}
      </div>

      <details className="grafico-tabela">
        <summary>Ver em tabela</summary>
        <table>
          <thead>
            <tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th><th>Acumulado</th></tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes}>
                <td>{nomeDoMes(d.mes)}</td>
                <td>{formatarValor(total(d, 'entrada'))}</td>
                <td>{formatarValor(total(d, 'saida'))}</td>
                <td>{formatarValor(d.saldo)}</td>
                <td>{formatarValor(d.saldoAcumulado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
