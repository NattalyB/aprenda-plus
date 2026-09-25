import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h1>Login</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required />
        <input name="senha" type="password" placeholder="Senha" value={form.senha} onChange={handleChange} required />
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Confirmar'}
        </button>
      </form>
    </div>
  );
}

export default Login;