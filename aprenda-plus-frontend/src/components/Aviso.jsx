import { useState, useEffect } from 'react';

const ICONES = {
  sucesso: '✅',
  erro: '⛔',
  aviso: '⚠️',
};

function Aviso() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let timer;

    const exibir = (evento) => {
      clearTimeout(timer);
      setAviso({ ...evento.detail, id: Date.now() });
      timer = setTimeout(() => setAviso(null), 4000);
    };

    window.addEventListener('mostrar-aviso', exibir);
    return () => {
      window.removeEventListener('mostrar-aviso', exibir);
      clearTimeout(timer);
    };
  }, []);

  if (!aviso) return null;

  return (
    <div key={aviso.id} className={`aviso aviso-${aviso.tipo}`} role="alert">
      <span className="aviso-icone">{ICONES[aviso.tipo]}</span>
      <span className="aviso-texto">{aviso.mensagem}</span>
      <button className="aviso-fechar" onClick={() => setAviso(null)} aria-label="Fechar">
        ×
      </button>
    </div>
  );
}

export default Aviso;