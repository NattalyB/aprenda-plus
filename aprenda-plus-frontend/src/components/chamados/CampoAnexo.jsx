import { useRef } from 'react';
import { tamanhoLegivel } from '../../utils/chamados';

// Campo para anexar um print (PNG/JPG) ou PDF de até 5 MB.
function CampoAnexo({ id, arquivo, onMudar, rotulo = 'Anexar print ou PDF (opcional, até 5 MB)' }) {
  const entrada = useRef(null);

  const remover = () => {
    onMudar(null);
    if (entrada.current) entrada.current.value = '';
  };

  return (
    <div className="chamado-anexo-campo">
      <label htmlFor={id}>📎 {rotulo}</label>
      <input
        id={id}
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        onChange={(e) => onMudar(e.target.files?.[0] || null)}
      />
      {arquivo && (
        <span className="chamado-anexo-escolhido">
          {arquivo.name} ({tamanhoLegivel(arquivo.size)})
          <button type="button" className="chamado-link" onClick={remover}>Remover</button>
        </span>
      )}
    </div>
  );
}

export default CampoAnexo;
