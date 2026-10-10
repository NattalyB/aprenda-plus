import { useMemo, useState } from 'react';

// Vazio = null, undefined ou texto em branco. Registros com o campo vazio
// sempre vão para o fim da lista, seja crescente ou decrescente.
const estaVazio = (valor) => valor === null || valor === undefined || String(valor).trim() === '';

// Compara dois valores:
// - números pelo valor ("10" vem depois de "9");
// - textos em ordem alfabética, ignorando acentos e maiúsculas ("Álvaro" fica junto de "Alberto").
export const comparar = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true });
};

// Devolve uma CÓPIA da lista ordenada (não altera a lista original).
// "campos" diz como pegar o valor de cada coluna, ex.: { nome: (curso) => curso.nome }
export const ordenarLista = (lista, campos, { coluna, direcao }) => {
  const pegarValor = campos[coluna];
  if (!pegarValor) return [...lista];

  const sinal = direcao === 'desc' ? -1 : 1;

  return [...lista].sort((itemA, itemB) => {
    const a = pegarValor(itemA);
    const b = pegarValor(itemB);

    if (estaVazio(a) && estaVazio(b)) return 0;
    if (estaVazio(a)) return 1;
    if (estaVazio(b)) return -1;

    return comparar(a, b) * sinal;
  });
};

// Hook usado nas listas do painel admin.
// Guarda qual coluna está ordenando e em qual direção.
// Clicar na mesma coluna inverte a direção; clicar em outra começa pela crescente.
export function useOrdenacao(lista, campos, inicial = { coluna: 'id', direcao: 'asc' }) {
  const [ordem, setOrdem] = useState(inicial);

  const alternar = (coluna) => {
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
        : { coluna, direcao: 'asc' }
    );
  };

  // "campos" deve ser criado fora do componente, para não mudar a cada render
  const ordenados = useMemo(() => ordenarLista(lista, campos, ordem), [lista, campos, ordem]);

  return { ordenados, ordem, alternar };
}
