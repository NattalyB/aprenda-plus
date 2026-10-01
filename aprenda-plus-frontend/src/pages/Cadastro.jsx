import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { criarAluno } from '../services/alunoService';

function Cadastro() {
  const navigate = useNavigate();
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState({
    nomeCompleto: '',
    telefone: '',
    email: '',
    dataNascimento: '',
    cpf: '',
    senhaHash: '',
    rua: '',
    numero: '',
    complemento: '',
    cep: '',
    bairro: '',
    cidade: '',
    estado: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    criarAluno(form)
      .then(() => {
        navigate('/login');
      })
      .catch((error) => {
        setEnviando(false);
        if (error.response?.status === 400) {
          setErro('Verifique os dados preenchidos.');
        } else if (error.response?.status === 409 || error.response?.data?.message?.includes('unique')) {
          setErro('E-mail ou CPF já cadastrado.');
        } else {
          setErro('Não foi possível concluir o cadastro. Tente novamente.');
        }
      });
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h1 className="form-title">Cadastro</h1>
        <p className="form-subtitle">Crie sua conta e comece a aprender hoje mesmo.</p>

        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Dados pessoais ===== */}
          <h2 className="form-section-title">Dados pessoais</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nomeCompleto">Nome completo</label>
              <input id="nomeCompleto" name="nomeCompleto" placeholder="Ex: Maria da Silva" value={form.nomeCompleto} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" placeholder="seuemail@exemplo.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="telefone">Telefone</label>
                <input id="telefone" name="telefone" placeholder="(51) 99999-9999" value={form.telefone} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input id="dataNascimento" name="dataNascimento" type="date" value={form.dataNascimento} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="cpf">CPF</label>
              <input id="cpf" name="cpf" placeholder="Apenas números" value={form.cpf} onChange={handleChange} maxLength={11} required />
            </div>
          </div>

          {/* ===== Endereço ===== */}
          <h2 className="form-section-title">Endereço</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="rua">Rua/Av</label>
              <input id="rua" name="rua" placeholder="Ex: Av. Brasil" value={form.rua} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="numero">Número</label>
                <input id="numero" name="numero" placeholder="Ex: 123" value={form.numero} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="complemento">Complemento (opcional)</label>
                <input id="complemento" name="complemento" placeholder="Apto, bloco..." value={form.complemento} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="cep">CEP</label>
                <input id="cep" name="cep" placeholder="00000-000" value={form.cep} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="bairro">Bairro</label>
                <input id="bairro" name="bairro" placeholder="Ex: Centro" value={form.bairro} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row form-row-uf">
              <div className="form-field">
                <label htmlFor="cidade">Cidade</label>
                <input id="cidade" name="cidade" placeholder="Ex: Canoas" value={form.cidade} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="estado">UF</label>
                <input id="estado" name="estado" placeholder="RS" value={form.estado} onChange={handleChange} maxLength={2} required />
              </div>
            </div>
          </div>

          {/* ===== Acesso ===== */}
          <h2 className="form-section-title">Acesso</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="senhaHash">Senha</label>
              <input id="senhaHash" name="senhaHash" type="password" placeholder="Crie uma senha" value={form.senhaHash} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'SALVANDO...' : 'CRIAR CONTA'}
          </button>
        </form>

        <p className="form-rodape">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default Cadastro;