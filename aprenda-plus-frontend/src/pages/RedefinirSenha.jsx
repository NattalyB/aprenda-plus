import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import logoBranco from '../assets/logo-aprenda-plus-branco.png';
import CampoSenha from '../components/CampoSenha';
import { redefinirSenha } from '../services/senhaService';
import { mostrarAviso } from '../services/avisoService';

const MINIMO = 6;

// Tela aberta pelo link do e-mail: cria a nova senha. painel = funcionário do painel admin.
function RedefinirSenha({ painel = false }) {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') || '';
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const esqueci = painel ? '/admin/esqueci-senha' : '/esqueci-senha';

  const salvar = (e) => {
    e.preventDefault();
    if (senha.length < MINIMO) {
      setErro(`A nova senha deve ter pelo menos ${MINIMO} caracteres.`);
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas digitadas não são iguais.');
      return;
    }
    setErro(null);
    setSalvando(true);
    redefinirSenha(token, senha)
      .then((dados) => {
        mostrarAviso(dados.mensagem || 'Senha alterada!', 'sucesso');
        navigate(
          dados.tipo === 'funcionario' ? '/admin/login' : dados.tipo === 'professor' ? '/login?perfil=professor' : '/login'
        );
      })
      .catch((error) => {
        setErro(error.response?.data?.mensagem || 'Não foi possível alterar a senha. Tente novamente.');
        setSalvando(false);
      });
  };

  const cartao = (
    <div className="form-card form-card-sm">
      {painel && <span className="admin-badge admin-login-badge">PAINEL ADMIN</span>}
      <h1 className="form-title">Criar nova senha</h1>

      {!token ? (
        <>
          <div className="form-erro">Este link está incompleto. Peça um novo link de nova senha.</div>
          <p className="form-rodape">
            <Link to={esqueci}>Pedir um novo link</Link>
          </p>
        </>
      ) : (
        <>
          <p className="form-subtitle">Escolha a sua nova senha (mínimo de {MINIMO} caracteres).</p>
          {erro && (
            <div className="form-erro">
              {erro}
              {erro.includes('link') && (
                <>
                  {' '}
                  <Link to={esqueci}>Pedir um novo link</Link>
                </>
              )}
            </div>
          )}
          <form onSubmit={salvar}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="novaSenha">Nova senha</label>
                <CampoSenha id="novaSenha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" required />
              </div>
              <div className="form-field">
                <label htmlFor="confirmarNovaSenha">Confirmar nova senha</label>
                <CampoSenha
                  id="confirmarNovaSenha"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {confirmar && (
                  <p className={confirmar === senha ? 'senha-confere ok' : 'senha-confere'} aria-live="polite">
                    {confirmar === senha ? '✓ As senhas são iguais' : 'As senhas ainda não são iguais'}
                  </p>
                )}
              </div>
            </div>
            <button type="submit" className="form-btn" disabled={salvando}>
              {salvando ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
            </button>
          </form>
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

export default RedefinirSenha;
