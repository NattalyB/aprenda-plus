import { useState } from 'react';
import { TIPOS_DOCUMENTO, formatarTamanho } from '../services/documentoService';

// Campo de anexo: clica pra escolher ou arrasta o arquivo pra cima.
// O <input type="file"> continua lá (escondido só visualmente), então funciona com teclado e leitor de tela.
function CampoArquivo({ id, label, arquivo, onChange, dica = 'PDF, JPG ou PNG · até 5 MB' }) {
  const [arrastando, setArrastando] = useState(false);

  const escolher = (lista) => {
    if (lista && lista.length > 0) onChange(lista[0]);
  };

  const classes = ['campo-arquivo'];
  if (arrastando) classes.push('arrastando');
  if (arquivo) classes.push('com-arquivo');

  return (
    <div
      className={classes.join(' ')}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        escolher(e.dataTransfer?.files);
      }}
      data-testid={`${id}-area`}
    >
      <input
        id={id}
        type="file"
        className="campo-arquivo-input"
        accept={TIPOS_DOCUMENTO}
        onChange={(e) => escolher(e.target.files)}
      />
      <label htmlFor={id} className="campo-arquivo-label">
        <span className="campo-arquivo-icone" aria-hidden="true">{arquivo ? '📄' : '📎'}</span>
        <span className="campo-arquivo-texto">
          <strong>{label}</strong>
          {arquivo ? (
            <span className="campo-arquivo-nome">
              {arquivo.name} · {formatarTamanho(arquivo.size)} — <u>trocar arquivo</u>
            </span>
          ) : (
            <span className="campo-arquivo-dica">Clique para escolher ou arraste aqui · {dica}</span>
          )}
        </span>
      </label>
    </div>
  );
}

export default CampoArquivo;
