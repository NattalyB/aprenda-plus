import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import logoBranco from '../assets/logo-aprenda-plus-branco.png';
import { pedirNovaSenha } from '../services/senhaService';

// Pede o link de nova senha por e-mail. painel = funcionário do painel admin.
function EsqueciSenha({ painel = false }) {
  const [parametros] = useSearchParams();
  const professor = !painel && parametros.get('perfil') === 'professor';
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState(null);
  const [erro, setErro] = useState(null);

  const enviar = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    pedirNovaSenha(email.trim(), painel ? 'funcionario' : professor ? 'professor' : 'aluno')
      .then((dados) => setResposta(dados.mensagem))
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível enviar agora. Tente novamente.'))
      .finally(() => setEnviando(false));
  };

  const voltar = painel ? '/admin/login' : professor ? '/login?perfil=professor' : '/login';

  const cartao = (
    <div className="form-card form-card-sm">
      {painel && <span className="admin-badge admin-login-badge">PAINEL ADMIN</span>}
      <h1 className="form-title">Esqueci minha senha</h1>

      {resposta ? (
        <>
          <div className="form-sucesso-grande" role="status">
            <strong>📧 Confira o seu e-mail</strong>
            <p>{resposta}</p>
            <p>O link vale por 1 hora. Se não encontrar, olhe também a caixa de spam.</p>
          </div>
          <p className="form-rodape">
            <Link to={voltar}>← Voltar para o login</Link>
          </p>
        </>
      ) : (
        <>
          <p className="form-subtitle">
            Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
          </p>
          {erro && <div className="form-erro">{erro}</div>}
          <form onSubmit={enviar}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={painel ? 'seuemail@aprendaplus.com' : 'seuemail@exemplo.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="form-btn" disabled={enviando}>
              {enviando ? 'ENVIANDO...' : 'ENVIAR LINK'}
            </button>
          </form>
          <p className="form-rodape">
            Lembrou a senha? <Link to={voltar}>Voltar para o login</Link>
          </p>
        </>
      )}
    </div>
  );

  if (painel) {
    return (
      <div className="admin-login-page">
        <img src={logoBranco} alt="Aprenda Plus" className="admin-login-logo" />
        {cartao}
      </div>
    );
  }
  return <div className="form-page">{cartao}</div>;
}

export default EsqueciSenha;
