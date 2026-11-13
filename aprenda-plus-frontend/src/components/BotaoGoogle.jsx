import { useEffect, useRef, useState } from 'react';
import { buscarConfigGoogle, carregarScriptGoogle } from '../services/googleService';
import { useTema } from '../utils/tema';

// Botão oficial "Continuar com o Google". Só aparece quando o servidor tem o ID de cliente configurado.
// texto: "continue_with" (entrar) ou "signup_with" (cadastrar).
function BotaoGoogle({ onCredencial, texto = 'continue_with' }) {
  const [idCliente, setIdCliente] = useState(null);
  const caixa = useRef(null);
  const aoReceber = useRef(onCredencial);
  const tema = useTema();

  useEffect(() => {
    aoReceber.current = onCredencial;
  }, [onCredencial]);

  useEffect(() => {
    let ativo = true;
    buscarConfigGoogle().then((c) => {
      if (ativo && c?.ativo && c.idCliente) setIdCliente(c.idCliente);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!idCliente) return undefined;
    let ativo = true;
    carregarScriptGoogle()
      .then((google) => {
        if (!ativo || !caixa.current || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: idCliente,
          callback: (resposta) => aoReceber.current?.(resposta.credential),
          ux_mode: 'popup',
        });
        caixa.current.innerHTML = '';
        google.accounts.id.renderButton(caixa.current, {
          theme: tema === 'claro' ? 'outline' : 'filled_black',
          size: 'large',
          shape: 'pill',
          text: texto,
          locale: 'pt-BR',
          width: Math.min(360, caixa.current.offsetWidth || 360),
        });
      })
      .catch(() => {
        // Sem conexão com o Google: fica só o login com e-mail e senha
        if (ativo) setIdCliente(null);
      });
    return () => {
      ativo = false;
    };
  }, [idCliente, tema, texto]);

  if (!idCliente) return null;
  return (
    <div className="login-google">
      <div className="login-google-ou" aria-hidden="true"><span>ou</span></div>
      <div ref={caixa} className="login-google-botao" data-testid="botao-google" />
    </div>
  );
}

export default BotaoGoogle;
