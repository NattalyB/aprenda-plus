import { useEffect, useState } from 'react';
import { ultimaAlteracao } from '../../services/atividadeService';
import { formatarDataHora } from '../../utils/salaDeAula';

// Linha discreta no topo dos formulários de edição:
// "Cadastrado por Ana em 20/10/2026 às 09:00 · Última alteração por Carla em 27/10/2026 às 18:45"
// Se o registro é anterior ao histórico (ou a consulta falhar), não mostra nada.
function UltimaAlteracao({ alvo, id }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!alvo || !id) return undefined;
    let ativo = true;
    ultimaAlteracao(alvo, id)
      .then((r) => ativo && setDados(r))
      .catch(() => ativo && setDados(null));
    return () => {
      ativo = false;
    };
  }, [alvo, id]);

  if (!dados || (!dados.criadoPor && !dados.alteradoPor)) return null;

  return (
    <p className="ultima-alteracao">
      <span aria-hidden="true">🕒 </span>
      {dados.criadoPor && (
        <span>
          Cadastrado por <strong>{dados.criadoPor}</strong> em {formatarDataHora(dados.criadoEm)}
        </span>
      )}
      {dados.criadoPor && dados.alteradoPor && <span className="ultima-alteracao-sep"> · </span>}
      {dados.alteradoPor && (
        <span>
          Última alteração por <strong>{dados.alteradoPor}</strong> em {formatarDataHora(dados.alteradoEm)}
        </span>
      )}
    </p>
  );
}

export default UltimaAlteracao;
