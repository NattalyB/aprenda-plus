import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, salvarSessao } from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    login(form.email, form.senha)
      .then((response) => {
        salvarSessao(response.data);
        navigate('/');
      })
      .catch((error) => {
        setEnviando(false);
        if (error.response?.status === 401) {
          setErro('E-mail ou senha inválidos.');
        } else {
          setErro('Não foi possível fazer login. Tente novamente.');
        }
      });
  };

  return (
    <div className="form-page">
      <div className="form-card form-card-sm">
        <h1 className="form-title">Login</h1>
        <p className="form-subtitle">Que bom te ver de novo! Entre na sua conta.</p>

        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" placeholder="seuemail@exemplo.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="senha">Senha</label>
              <input id="senha" name="senha" type="password" placeholder="Digite sua senha" value={form.senha} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        <p className="form-rodape">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;