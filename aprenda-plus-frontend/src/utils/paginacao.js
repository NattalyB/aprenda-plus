import { useState } from 'react';

export const OPCOES_POR_PAGINA = [20, 30, 50];

// Números das páginas que aparecem nos botões: primeira, última e as vizinhas da atual.
// null = reticências. Ex.: atual 6 de 12 -> [1, null, 5, 6, 7, null, 12]
export const paginasVisiveis = (atual, total) => {
  const paginas = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - atual) <= 1) {
      paginas.push(p);
    } else if (paginas[paginas.length - 1] !== null) {
      paginas.push(null);
    }
  }
  return paginas;
};

// Hook das listas do painel: divide a lista em páginas.
// Quando a lista muda de tamanho (busca ou filtro), volta para a página 1.
export function usePaginacao(lista, porPaginaInicial = OPCOES_POR_PAGINA[0]) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(porPaginaInicial);
  const [tamanhoAnterior, setTamanhoAnterior] = useState(lista.length);

  const total = lista.length;
  if (total !== tamanhoAnterior) {
    setTamanhoAnterior(total);
    setPagina(1);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(pagina, 1), totalPaginas);
  const inicio = (atual - 1) * porPagina;

  return {
    itens: lista.slice(inicio, inicio + porPagina),
    pagina: atual,
    totalPaginas,
    total,
    porPagina,
    inicio,
    irPara: (numero) => setPagina(Math.min(Math.max(numero, 1), totalPaginas)),
    mudarPorPagina: (quantidade) => {
      setPorPagina(quantidade);
      setPagina(1);
    },
  };
}
