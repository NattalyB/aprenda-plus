// Cabeçalho de tabela que ordena a lista ao ser clicado.
// A setinha mostra a ordem atual: ▲ crescente (A-Z, menor primeiro) e ▼ decrescente.
function ColunaOrdenavel({ coluna, ordem, onOrdenar, children }) {
  const ativa = ordem.coluna === coluna;
  const crescente = ordem.direcao === 'asc';

  let ariaSort = 'none';
  if (ativa) ariaSort = crescente ? 'ascending' : 'descending';

  let seta = '↕';
  if (ativa) seta = crescente ? '▲' : '▼';

  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className={ativa ? 'admin-ordenar ativa' : 'admin-ordenar'}
        onClick={() => onOrdenar(coluna)}
        title="Clique para ordenar"
      >
        {children}
        <span className="admin-ordenar-seta" aria-hidden="true">{seta}</span>
      </button>
    </th>
  );
}

export default ColunaOrdenavel;
