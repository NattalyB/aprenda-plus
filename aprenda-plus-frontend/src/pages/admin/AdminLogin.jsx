import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        } else {
          setErro('Não foi possível fazer login.');
        }
      });
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h1>Painel Administrativo</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required />
        <input name="senha" type="password" placeholder="Senha" value={form.senha} onChange={handleChange} required />
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        <a href="mailto:suporte@aprendaplus.com">Esqueci minha senha / Fale com o suporte</a>
      </p>
    </div>
  );
}

export default AdminLogin;