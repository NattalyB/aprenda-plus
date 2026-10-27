import { useState } from 'react';
import CampoSenha from '../components/CampoSenha';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, salvarSessao } from '../services/authService';
import { loginProfessor, salvarSessaoProfessor } from '../services/docenteService';

const PERFIS = {
  aluno: {
    aba: '🎓 Sou aluno',
    subtitulo: 'Que bom te ver de novo! Entre na sua conta.',
    placeholder: 'seuemail@exemplo.com',
  },
  professor: {
    aba: '👩‍🏫 Sou professor',
    subtitulo: 'Entre no Portal do Professor para acompanhar suas turmas.',
    placeholder: 'seuemail@aprendaplus.com',
  },
};

// Login do site: o aluno entra na área dele e o professor no Portal do Professor.
// (A equipe do painel administrativo usa o login próprio em /admin/login.)
function Login() {
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const perfil = parametros.get('perfil') === 'professor' ? 'professor' : 'aluno';
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const trocarPerfil = (novo) => {
    setErro(null);
    setParametros(novo === 'professor' ? { perfil: 'professor' } : {}, { replace: true });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const entrar =
      perfil === 'professor'
        ? loginProfessor(form.email, form.senha).then((dados) => {
            salvarSessaoProfessor(dados);
            navigate('/professor');
          })
        : login(form.email, form.senha).then((response) => {
            salvarSessao(response.data);
            navigate('/');
          });

    entrar.catch((error) => {
      setEnviando(false);
      const doServidor = error.response?.data?.erro;
      if (error.response?.status === 401 && (!doServidor || doServidor === 'E-mail ou senha inválidos')) {
        setErro('E-mail ou senha inválidos.');
      } else if (doServidor) {
        // Ex.: conta inativa ou professor que ainda não criou a senha (o servidor explica o motivo)
        setErro(doServidor);
      } else {
        setErro('Não foi possível fazer login. Tente novamente.');
      }
    });
  };

  const textos = PERFIS[perfil];

  return (
    <div className="form-page">
      <div className="form-card form-card-sm">
        <div className="login-perfis" role="tablist" aria-label="Como você quer entrar">
          {Object.entries(PERFIS).map(([chave, p]) => (
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={perfil === chave}
              className={perfil === chave ? 'login-perfil ativo' : 'login-perfil'}
              onClick={() => trocarPerfil(chave)}
            >
              {p.aba}
            </button>
          ))}
        </div>

        <h1 className="form-title">{perfil === 'professor' ? 'Portal do Professor' : 'Login'}</h1>
        <p className="form-subtitle">{textos.subtitulo}</p>

        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" placeholder={textos.placeholder} value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="senha">Senha</label>
              <CampoSenha id="senha" placeholder="Digite sua senha" value={form.senha} onChange={handleChange} required />
              <Link to={perfil === 'professor' ? '/esqueci-senha?perfil=professor' : '/esqueci-senha'} className="form-link-senha">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        {perfil === 'professor' ? (
          <p className="form-rodape">Primeiro acesso? Peça à secretaria para enviar o link de criação de senha.</p>
        ) : (
          <p className="form-rodape">
            Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
