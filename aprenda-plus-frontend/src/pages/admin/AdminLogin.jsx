import { useState } from 'react';
import CampoSenha from '../../components/CampoSenha';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../../assets/logo-aprenda-plus-branco.png';
import { loginFuncionario, salvarSessaoAdmin } from '../../services/authAdminService';

function AdminLogin() {
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

    loginFuncionario(form.email, form.senha)
      .then((response) => {
        salvarSessaoAdmin(response.data);
        navigate('/admin');
      })
      .catch((error) => {
        setEnviando(false);
        if (error.response?.status === 401) {
          setErro('E-mail ou senha inválidos.');
        } else if (error.response?.data?.erro) {
          // Ex.: conta inativa ou bloqueada (o servidor explica o motivo)
          setErro(error.response.data.erro);
        } else {
          setErro('Não foi possível fazer login. Tente novamente.');
        }
      });
  };

  return (
    <div className="admin-login-page">
      <img src={logo} alt="Aprenda Plus" className="admin-login-logo" />

      <div className="form-card form-card-sm">
        <span className="admin-badge admin-login-badge">PAINEL ADMIN</span>
        <h1 className="form-title">Área restrita</h1>
        <p className="form-subtitle">Entre com sua conta de funcionário.</p>

        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" placeholder="seuemail@aprendaplus.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="senha">Senha</label>
              <CampoSenha id="senha" placeholder="Digite sua senha" value={form.senha} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        <p className="form-rodape">
          Esqueceu a senha? <Link to="/admin/esqueci-senha">Criar uma nova senha</Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;