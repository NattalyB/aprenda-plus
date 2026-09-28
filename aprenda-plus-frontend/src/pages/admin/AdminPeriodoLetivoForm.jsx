import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buscarPeriodoLetivoPorId, criarPeriodoLetivo, atualizarPeriodoLetivo } from '../../services/periodoLetivoService';

function AdminPeriodoLetivoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [form, setForm] = useState({
    nome: '',
    dataInicio: '',
    dataFim: '',
    status: 'ativo',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      buscarPeriodoLetivoPorId(id).then((response) => {
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

    const acao = modoEdicao ? atualizarPeriodoLetivo(id, form) : criarPeriodoLetivo(form);

    acao
      .then(() => {
        navigate('/admin/periodos-letivos');
      })
      .catch(() => {
        setErro('Não foi possível salvar. Confira se a data de fim não é anterior à de início.');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '450px' }}>
      <h1>{modoEdicao ? 'Editar período letivo' : 'Novo período letivo'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="nome" placeholder="Nome (ex: 2º Semestre 2026)" value={form.nome} onChange={handleChange} required />

        <label>Data de início</label>
        <input name="dataInicio" type="date" value={form.dataInicio} onChange={handleChange} required />

        <label>Data de fim</label>
        <input name="dataFim" type="date" value={form.dataFim} onChange={handleChange} required />

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="ativo">Ativo</option>
          <option value="encerrado">Encerrado</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminPeriodoLetivoForm;