import { useState } from 'react';
import { formatarCompacto, topoDoEixo } from '../GraficosFinanceiro';
import { formatarData } from '../../../utils/financeiro';

// Mesma cor das barras dos gráficos do Financeiro (já validada para daltonismo e contraste)
export const COR_VISITANTES = '#1d4ed8';

const LARGURA = 760;
const ALTURA = 220;
const MARGEM = { topo: 12, direita: 8, base: 28, esquerda: 44 };

// "2026-10-28" -> "28/10"
const diaEMes = (data) => formatarData(data).slice(0, 5);

// Barra com os cantos de cima arredondados (a base fica reta, presa no eixo)
const caminhoDaBarra = (x, y, largura, altura) => {
  if (altura <= 0) return '';
  const r = Math.min(4, largura / 2, altura);
  return `M${x},${y + altura} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y + altura} Z`;
};

// Visitantes por dia no período (uma série só: o título do cartão já diz o que é)
function GraficoDiario({ dias = [] }) {
  const [destaque, setDestaque] = useState(null);

  if (dias.length === 0 || dias.every((d) => !d.visitantes && !d.visualizacoes && !d.buscas)) {
    return <p className="grafico-vazio">Ainda não há visitas registradas neste período.</p>;
  }

  const maximo = topoDoEixo(Math.max(0, ...dias.map((d) => Number(d.visitantes))));
  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const passo = larguraUtil / dias.length;
  // 2px de folga entre barras vizinhas
  const larguraBarra = Math.max(2, Math.min(18, passo - 2));
  const y = (valor) => MARGEM.topo + alturaUtil - (Number(valor) / maximo) * alturaUtil;
  // Rótulos do eixo: no máximo uns 8, para não encavalar
  const cadaQuantos = Math.max(1, Math.ceil(dias.length / 8));
  const ativo = destaque === null ? null : dias[destaque];

  return (
    <figure className="grafico">
      <div className="grafico-area">
        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label="Visitantes por dia">
          {[0, 0.5, 1].map((fracao) => (
            <g key={fracao}>
              <line
                x1={MARGEM.esquerda}
                x2={LARGURA - MARGEM.direita}
                y1={y(maximo * fracao)}
                y2={y(maximo * fracao)}
                className={fracao === 0 ? 'grafico-base' : 'grafico-grade'}
              />
              <text x={MARGEM.esquerda - 8} y={y(maximo * fracao) + 4} textAnchor="end" className="grafico-eixo">
                {formatarCompacto(maximo * fracao)}
              </text>
            </g>
          ))}

          {dias.map((d, i) => {
            const x = MARGEM.esquerda + passo * i + (passo - larguraBarra) / 2;
            // O último dia sempre ganha rótulo; os outros saem a cada N dias,
            // menos quando ficariam colados no rótulo do último dia
            const ultimo = i === dias.length - 1;
            const longeDoFim = dias.length - 1 - i >= cadaQuantos / 2;
            const mostrarRotulo = ultimo || (i % cadaQuantos === 0 && longeDoFim);
            return (
              <g key={d.data}>
                <path
                  d={caminhoDaBarra(x, y(d.visitantes), larguraBarra, y(0) - y(d.visitantes))}
                  fill={COR_VISITANTES}
                  opacity={destaque === null || destaque === i ? 1 : 0.45}
                />
                {mostrarRotulo && (
                  <text x={x + larguraBarra / 2} y={ALTURA - 9} textAnchor="middle" className="grafico-eixo">
                    {diaEMes(d.data)}
                  </text>
                )}
                {/* Área de toque maior que a barra */}
                <rect
                  data-testid={`dia-${d.data}`}
                  x={MARGEM.esquerda + passo * i}
                  y={MARGEM.topo}
                  width={passo}
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
            style={{ left: `${((MARGEM.esquerda + passo * (destaque + 0.5)) / LARGURA) * 100}%` }}
          >
            <strong>{formatarData(ativo.data)}</strong>
            <span><i style={{ background: COR_VISITANTES }} /> {ativo.visitantes} visitante(s)</span>
            <span>{ativo.visualizacoes} curso(s) aberto(s) · {ativo.buscas} busca(s)</span>
          </div>
        )}
      </div>

      <details className="grafico-tabela">
        <summary>Ver em tabela</summary>
        <table>
          <thead>
            <tr><th>Dia</th><th>Visitantes</th><th>Cursos abertos</th><th>Buscas</th></tr>
          </thead>
          <tbody>
            {dias.map((d) => (
              <tr key={d.data}>
                <td>{formatarData(d.data)}</td>
                <td>{d.visitantes}</td>
                <td>{d.visualizacoes}</td>
                <td>{d.buscas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export default GraficoDiario;
