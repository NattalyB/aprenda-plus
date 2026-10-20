// Etiqueta colorida do nível de acesso. A cor é escolhida pelo Master no módulo Sistema
// e vale para todo mundo daquele nível (ex.: todo Financeiro verde).

export const COR_MASTER = '#001e42';
export const COR_PADRAO = '#64748b';

// Cores sugeridas no módulo Sistema (o Master também pode escolher qualquer outra)
export const CORES_SUGERIDAS = [
  '#001e42', '#7c3aed', '#0284c7', '#16a34a', '#ea580c', '#db2777', '#b91c1c', '#ca8a04', '#0d9488', '#64748b',
];

export const corDoNivel = (nivel) => nivel?.cor || (nivel?.master ? COR_MASTER : COR_PADRAO);

// Texto branco em cor escura e texto escuro em cor clara, para sempre dar para ler
export const corDoTexto = (fundo) => {
  const hex = /^#[0-9a-f]{6}$/i.test(fundo || '') ? fundo.slice(1) : COR_PADRAO.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminancia = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminancia > 0.4 ? '#111827' : '#ffffff';
};

// nivel = { nome, cor, master }
function EtiquetaNivel({ nivel, className = '' }) {
  if (!nivel?.nome) return null;
  const fundo = corDoNivel(nivel);
  return (
    <span className={`nivel-badge ${className}`.trim()} style={{ background: fundo, color: corDoTexto(fundo) }}>
      {nivel.nome}
    </span>
  );
}

export default EtiquetaNivel;
