import { useState } from 'react';
import { enviarAcessoProfessor } from '../../services/professorService';

// No cadastro do professor (painel): envia o link para ele criar a senha do Portal do Professor.
// Mostra o link também, para a secretaria copiar e mandar por outro meio se o e-mail não chegar.
function AcessoPortalProfessor({ idProfessor, acessoCriado }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const enviar = () => {
    setEnviando(true);
    setErro(null);
    setCopiado(false);
    enviarAcessoProfessor(idProfessor)
      .then(setResultado)
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível enviar o acesso.'))
      .finally(() => setEnviando(false));
  };

  const copiar = () => {
    try {
      navigator.clipboard.writeText(resultado.link).then(() => setCopiado(true), () => setCopiado(false));
    } catch {
      setCopiado(false);
    }
  };

  return (
    <section className="acesso-portal" aria-label="Acesso ao Portal do Professor">
      <div className="acesso-portal-texto">
        <strong>👩‍🏫 Portal do Professor</strong>
        <span className={acessoCriado ? 'acesso-portal-status ok' : 'acesso-portal-status'}>
          {acessoCriado ? '✓ Senha criada — o professor já pode entrar' : 'O professor ainda não criou a senha'}
        </span>
      </div>
      <button type="button" className="admin-btn admin-btn-secundario" onClick={enviar} disabled={enviando}>
        {enviando ? 'Enviando...' : acessoCriado ? 'Reenviar link de acesso' : 'Enviar acesso por e-mail'}
      </button>

      {erro && <div className="form-erro acesso-portal-resultado">{erro}</div>}
      {resultado && (
        <div className="acesso-portal-resultado" role="status">
          <p>
            {resultado.emailEnviado
              ? `Enviamos para ${resultado.email} um link para criar a senha (vale por 7 dias).`
              : 'O envio de e-mails não está configurado. Copie o link abaixo e mande para o professor (vale por 7 dias).'}
          </p>
          <div className="acesso-portal-link">
            <input type="text" readOnly value={resultado.link} aria-label="Link de acesso" onFocus={(e) => e.target.select()} />
            <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={copiar}>
              {copiado ? 'Copiado ✓' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default AcessoPortalProfessor;
