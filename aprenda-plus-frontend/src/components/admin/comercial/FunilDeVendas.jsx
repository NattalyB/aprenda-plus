import { etapasDoFunil, formatarPorcentagem } from '../../../utils/comercial';

// Funil: quantas pessoas chegaram em cada etapa, a % em relação às visitas
// e quanto se perdeu desde a etapa anterior
function FunilDeVendas({ funil = [] }) {
  const etapas = etapasDoFunil(funil);
  const maior = Math.max(0, ...etapas.map((e) => e.pessoas));

  if (etapas.length === 0 || maior === 0) {
    return <p className="grafico-vazio">Ainda não há movimento registrado neste período.</p>;
  }

  return (
    <ol className="comercial-funil" aria-label="Funil de vendas">
      {etapas.map((etapa) => (
        <li key={etapa.chave}>
          <span className="comercial-funil-nome">{etapa.rotulo}</span>
          <span className="barras-trilho">
            <span className="barras-barra" style={{ width: `${(etapa.pessoas / maior) * 100}%` }} />
          </span>
          <span className="comercial-funil-valor">
            <strong>{etapa.pessoas}</strong>
            <small>{formatarPorcentagem(etapa.porcentagem)}</small>
          </span>
          <span className="comercial-funil-perda">
            {etapa.perda !== null && etapa.perda > 0 ? `−${formatarPorcentagem(etapa.perda)}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default FunilDeVendas;
