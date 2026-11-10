import { useEffect, useState } from 'react';
import { listarManutencoes } from '../services/atualizacaoService';
import { manutencoesPendentes, periodoManutencao, situacaoManutencao } from '../utils/atualizacoes';

const CHAVE_OCULTAS = 'manutencoesOcultas';

const lerOcultas = () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_OCULTAS));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
};

// Faixa no topo avisando das manutenções programadas ou em andamento.
// No painel recebe a lista pronta (manutencoes); no Portal do Professor busca sozinha (perfil="professor").
function FaixaManutencao({ manutencoes, perfil }) {
  const [buscadas, setBuscadas] = useState([]);
  const [ocultas, setOcultas] = useState(lerOcultas);

  useEffect(() => {
    if (manutencoes !== undefined) return;
    listarManutencoes(perfil)
      .then((lista) => setBuscadas(lista || []))
      .catch(() => {
        // Sem conexão: só não mostra a faixa
      });
  }, [manutencoes, perfil]);

  const visiveis = manutencoesPendentes(manutencoes ?? buscadas).filter((m) => !ocultas.includes(m.idAtualizacao));
  if (visiveis.length === 0) return null;

  const ocultar = (id) => {
    const novas = [...ocultas, id];
    setOcultas(novas);
    try {
      localStorage.setItem(CHAVE_OCULTAS, JSON.stringify(novas));
    } catch {
      // sem armazenamento: some só até recarregar
    }
  };

  return (
    <div className="faixas-manutencao">
      {visiveis.map((m) => {
        const andamento = situacaoManutencao(m) === 'andamento';
        return (
          <div key={m.idAtualizacao} className={`faixa-manutencao ${andamento ? 'em-andamento' : ''}`} role="status">
            <span className="faixa-manutencao-icone" aria-hidden="true">🔧</span>
            <p>
              <strong>{andamento ? 'Manutenção em andamento' : 'Manutenção programada'}:</strong>{' '}
              {m.titulo} · <strong>{periodoManutencao(m)}</strong>
              {m.descricao && <span className="faixa-manutencao-texto"> {m.descricao}</span>}
            </p>
            <button type="button" className="faixa-manutencao-fechar" onClick={() => ocultar(m.idAtualizacao)}
              aria-label="Ocultar aviso de manutenção">
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default FaixaManutencao;
