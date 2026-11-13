import { TEMAS, setTema, useTema } from '../utils/tema';
import PainelAcessibilidade from './PainelAcessibilidade';

/** Três botões para escolher o tema da tela (claro, escuro ou alto contraste) e o botão ♿ de acessibilidade. */
function SeletorTema({ compacto = false, className = '', abrirAcima = false }) {
  const tema = useTema();
  return (
    <div className={`seletor-tema ${compacto ? 'seletor-tema-compacto' : ''} ${className}`.trim()}
      role="group" aria-label="Tema e acessibilidade">
      {TEMAS.map((t) => (
        <button
          key={t.chave}
          type="button"
          className={`seletor-tema-botao ${tema === t.chave ? 'ativo' : ''}`}
          aria-pressed={tema === t.chave}
          aria-label={`Tema ${t.rotulo.toLowerCase()}`}
          title={`Tema ${t.rotulo.toLowerCase()}`}
          onClick={() => setTema(t.chave)}
        >
          <span aria-hidden="true">{t.icone}</span>
        </button>
      ))}
      <span className="seletor-tema-divisor" aria-hidden="true" />
      <PainelAcessibilidade abrirAcima={abrirAcima} />
    </div>
  );
}

export default SeletorTema;
