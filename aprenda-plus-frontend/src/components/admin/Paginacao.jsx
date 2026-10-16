import { OPCOES_POR_PAGINA, paginasVisiveis } from '../../utils/paginacao';

// Rodapé das listas do painel: "Mostrando 21–40 de 132", páginas e quantos por página.
// Recebe o que o usePaginacao devolve. Com poucos registros, não aparece.
function Paginacao({ pagina, totalPaginas, total, porPagina, inicio, irPara, mudarPorPagina, nome = 'registros' }) {
  if (total <= OPCOES_POR_PAGINA[0]) return null;

  const fim = Math.min(inicio + porPagina, total);

  return (
    <nav className="paginacao" aria-label={`Páginas de ${nome}`}>
      <span className="paginacao-info">
        Mostrando <strong>{inicio + 1}–{fim}</strong> de <strong>{total}</strong>
      </span>

      <div className="paginacao-botoes">
        <button type="button" onClick={() => irPara(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
          ‹
        </button>
        {paginasVisiveis(pagina, totalPaginas).map((p, i) =>
          p === null ? (
            <span key={`r${i}`} className="paginacao-reticencias" aria-hidden="true">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === pagina ? 'ativa' : undefined}
              onClick={() => irPara(p)}
              aria-label={`Página ${p}`}
              aria-current={p === pagina ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button type="button" onClick={() => irPara(pagina + 1)} disabled={pagina === totalPaginas} aria-label="Próxima página">
          ›
        </button>
      </div>

      <label className="paginacao-quantidade">
        Por página
        <select value={porPagina} onChange={(e) => mudarPorPagina(Number(e.target.value))}>
          {OPCOES_POR_PAGINA.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
    </nav>
  );
}

export default Paginacao;
