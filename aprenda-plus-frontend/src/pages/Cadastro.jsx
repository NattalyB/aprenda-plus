import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <h1>Cadastro</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="nomeCompleto" placeholder="Nome completo" value={form.nomeCompleto} onChange={handleChange} required />
        <input name="telefone" placeholder="Telefone" value={form.telefone} onChange={handleChange} required />
        <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required />
        <input name="dataNascimento" type="date" value={form.dataNascimento} onChange={handleChange} required />
        <input name="cpf" placeholder="CPF (apenas números)" value={form.cpf} onChange={handleChange} maxLength={11} required />

        <input name="rua" placeholder="Rua/Av" value={form.rua} onChange={handleChange} />
        <input name="numero" placeholder="Número" value={form.numero} onChange={handleChange} />
        <input name="complemento" placeholder="Complemento" value={form.complemento} onChange={handleChange} />
        <input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} />
        <input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} />
        <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} />
        <input name="estado" placeholder="UF" value={form.estado} onChange={handleChange} maxLength={2} />

        <input name="senhaHash" type="password" placeholder="Senha" value={form.senhaHash} onChange={handleChange} required />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default Cadastro;