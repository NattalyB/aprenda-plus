import { useEffect, useId, useRef, useState } from 'react';
import {
  OPCOES,
  TAMANHOS_LETRA,
  quantasAtivas,
  restaurarAcessibilidade,
  setAcessibilidade,
  useAcessibilidade,
} from '../utils/acessibilidade';

/** Botão ♿ que abre as preferências de acessibilidade (fica ao lado do seletor de tema). */
function PainelAcessibilidade({ abrirAcima = false }) {
  const prefs = useAcessibilidade();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const botao = useRef(null);
  const idPainel = useId();
  const ativas = quantasAtivas(prefs);

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (evento) => {
      if (caixa.current && !caixa.current.contains(evento.target)) setAberto(false);
    };
    const fecharEsc = (evento) => {
      if (evento.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [aberto]);

  return (
    <span className="acessibilidade" ref={caixa}>
      <button
        ref={botao}
        type="button"
        className={`seletor-tema-botao acessibilidade-botao ${ativas > 0 ? 'ativo' : ''}`}
        aria-label={ativas > 0 ? `Acessibilidade (${ativas} ativa${ativas > 1 ? 's' : ''})` : 'Acessibilidade'}
        title="Acessibilidade"
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((a) => !a)}
      >
        <span aria-hidden="true">♿</span>
      </button>

      {aberto && (
        <div id={idPainel} className={`acessibilidade-painel ${abrirAcima ? 'acima' : ''}`} role="dialog"
          aria-label="Opções de acessibilidade">
          <div className="acessibilidade-topo">
            <strong>Acessibilidade</strong>
            <button type="button" className="acessibilidade-fechar" onClick={() => setAberto(false)}
              aria-label="Fechar opções de acessibilidade">
              ✕
            </button>
          </div>

          <fieldset className="acessibilidade-grupo">
            <legend>Tamanho da letra</legend>
            <div className="acessibilidade-tamanhos">
              {TAMANHOS_LETRA.map((t, i) => (
                <button
                  key={t.chave}
                  type="button"
                  className={prefs.tamanhoLetra === t.chave ? 'ativo' : ''}
                  aria-pressed={prefs.tamanhoLetra === t.chave}
                  onClick={() => setAcessibilidade({ tamanhoLetra: t.chave })}
                >
                  <span aria-hidden="true" style={{ fontSize: `${13 + i * 3}px` }}>A</span> {t.rotulo}
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="acessibilidade-opcoes">
            {OPCOES.map((o) => (
              <li key={o.chave}>
                <label>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={prefs[o.chave]}
                    onChange={(e) => setAcessibilidade({ [o.chave]: e.target.checked })}
                  />
                  <span>
                    {o.rotulo}
                    <small>{o.dica}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <p className="acessibilidade-nota">
            Fica salvo neste navegador. O tema (☀️ 🌙 👁️) fica ao lado. Atalho do navegador: <kbd>Ctrl</kbd> + <kbd>+</kbd> também aumenta tudo.
          </p>
          {ativas > 0 && (
            <button type="button" className="acessibilidade-restaurar" onClick={restaurarAcessibilidade}>
              Voltar ao padrão
            </button>
          )}
        </div>
      )}
    </span>
  );
}

export default PainelAcessibilidade;
