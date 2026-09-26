import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buscarAlunoPorId, criarAluno, atualizarAluno } from '../../services/alunoService';

function AdminAlunoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

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
    status: 'ativo',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      buscarAlunoPorId(id).then((response) => {
        // Na edição, não trazemos a senha de volta pro formulário (ela já vem como hash)
        setForm({ ...response.data, senhaHash: '' });
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

    // Se estiver editando e o campo de senha ficou vazio, não manda esse campo
    // (senão o backend tentaria criptografar uma string vazia)
    const dadosParaEnviar = { ...form };
    if (modoEdicao && !dadosParaEnviar.senhaHash) {
      delete dadosParaEnviar.senhaHash;
    }

    const acao = modoEdicao ? atualizarAluno(id, dadosParaEnviar) : criarAluno(dadosParaEnviar);

    acao
      .then(() => {
        navigate('/admin/alunos');
      })
      .catch(() => {
        setErro('Não foi possível salvar. Confira os campos (e-mail/CPF podem já existir).');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>{modoEdicao ? 'Editar aluno' : 'Novo aluno'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="nomeCompleto" placeholder="Nome completo" value={form.nomeCompleto} onChange={handleChange} required />
        <input name="telefone" placeholder="Telefone" value={form.telefone} onChange={handleChange} required />
        <input name="email" type="email" placeholder="E-mail" value={form.email} onChange={handleChange} required />
        <input name="dataNascimento" type="date" value={form.dataNascimento} onChange={handleChange} required />
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

        <input
          name="senhaHash"
          type="password"
          placeholder={modoEdicao ? 'Deixe em branco para manter a senha atual' : 'Senha'}
          value={form.senhaHash}
          onChange={handleChange}
          required={!modoEdicao}
        />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminAlunoForm;