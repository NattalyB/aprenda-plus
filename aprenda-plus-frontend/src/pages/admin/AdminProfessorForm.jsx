import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buscarProfessorPorId, criarProfessor, atualizarProfessor } from '../../services/professorService';

function AdminProfessorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [form, setForm] = useState({
    nomeCompleto: '',
    telefone: '',
    email: '',
    dataNascimento: '',
    cpf: '',
    rua: '',
    numero: '',
    complemento: '',
    cep: '',
    bairro: '',
    cidade: '',
    estado: '',
    status: 'ativo',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      buscarProfessorPorId(id).then((response) => {
        setForm(response.data);
      });
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const acao = modoEdicao ? atualizarProfessor(id, form) : criarProfessor(form);

    acao
      .then(() => {
        navigate('/admin/professores');
      })
      .catch(() => {
        setErro('Não foi possível salvar. Confira os campos (e-mail/CPF podem já existir).');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>{modoEdicao ? 'Editar professor' : 'Novo professor'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="nomeCompleto" placeholder="Nome completo" value={form.nomeCompleto} onChange={handleChange} required />
        <input name="telefone" placeholder="Telefone" value={form.telefone || ''} onChange={handleChange} />
        <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required />
        <input name="dataNascimento" type="date" value={form.dataNascimento || ''} onChange={handleChange} />
        <input name="cpf" placeholder="CPF" value={form.cpf} onChange={handleChange} maxLength={11} required />

        <input name="rua" placeholder="Rua/Av" value={form.rua || ''} onChange={handleChange} />
        <input name="numero" placeholder="Número" value={form.numero || ''} onChange={handleChange} />
        <input name="complemento" placeholder="Complemento" value={form.complemento || ''} onChange={handleChange} />
        <input name="cep" placeholder="CEP" value={form.cep || ''} onChange={handleChange} />
        <input name="bairro" placeholder="Bairro" value={form.bairro || ''} onChange={handleChange} />
        <input name="cidade" placeholder="Cidade" value={form.cidade || ''} onChange={handleChange} />
        <input name="estado" placeholder="UF" value={form.estado || ''} onChange={handleChange} maxLength={2} />

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminProfessorForm;