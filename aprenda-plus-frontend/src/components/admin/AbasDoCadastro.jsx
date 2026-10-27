import { useSearchParams } from 'react-router-dom';

// Abas no topo de um cadastro (ex.: aluno -> Dados pessoais / Inscrições / Matrículas).
// A aba aberta fica no endereço (?aba=matriculas), então dá para voltar direto nela
// depois de salvar um formulário aberto a partir da aba.
// abas: [{ chave, rotulo }] — só as que o nível de acesso pode ver.
export function useAbaAtual(abas) {
  const [parametros, setParametros] = useSearchParams();
  const pedida = parametros.get('aba');
  const atual = abas.some((a) => a.chave === pedida) ? pedida : abas[0]?.chave;

  const trocar = (chave) => {
    const novos = new URLSearchParams(parametros);
    if (chave === abas[0]?.chave) novos.delete('aba');
    else novos.set('aba', chave);
    setParametros(novos, { replace: true });
  };

  return [atual, trocar];
}

function AbasDoCadastro({ abas, atual, onTrocar, rotulo }) {
  // Com uma aba só (ex.: nível sem acesso a Inscrições e Matrículas), não mostra a barra
  if (abas.length < 2) return null;

  return (
    <div className="cadastro-abas" role="tablist" aria-label={rotulo}>
      {abas.map((aba) => (
        <button
          key={aba.chave}
          type="button"
          role="tab"
          id={`aba-${aba.chave}`}
          aria-selected={atual === aba.chave}
          onClick={() => onTrocar(aba.chave)}
        >
          {aba.rotulo}
        </button>
      ))}
    </div>
  );
}

export default AbasDoCadastro;
