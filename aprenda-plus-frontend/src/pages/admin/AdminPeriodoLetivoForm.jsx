import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

    // Confere as datas antes de enviar
    if (form.dataInicio && form.dataFim && form.dataFim < form.dataInicio) {
      setErro('A data de fim não pode ser anterior à data de início.');
      return;
    }

    setEnviando(true);
    const acao = modoEdicao ? atualizarPeriodoLetivo(id, form) : criarPeriodoLetivo(form);

    acao
      .then(() => {
        navigate('/admin/periodos-letivos');
      })
      .catch((error) => {
        const errosCampos = error.response?.data?.erros;
        if (errosCampos) {
          setErro(Object.values(errosCampos).join(' '));
        } else {
          setErro('Não foi possível salvar o período letivo. Confira os campos.');
        }
        setEnviando(false);
      });
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar período letivo' : 'Novo período letivo'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao ? 'Atualize as datas ou o status do período.' : 'Defina o nome e as datas do novo período.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <h2 className="form-section-title">Dados do período</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nome">Nome do período</label>
              <input id="nome" name="nome" placeholder="Ex: 2º Semestre 2026" value={form.nome || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="dataInicio">Data de início</label>
                <input id="dataInicio" name="dataInicio" type="date" value={form.dataInicio || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="dataFim">Data de fim</label>
                <input id="dataFim" name="dataFim" type="date" value={form.dataFim || ''} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status || 'ativo'} onChange={handleChange}>
                <option value="ativo">Ativo</option>
                <option value="encerrado">Encerrado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/periodos-letivos" className="admin-btn admin-btn-secundario">
              Cancelar
            </Link>
            <button type="submit" className="form-btn" disabled={enviando}>
              {enviando ? 'SALVANDO...' : 'SALVAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminPeriodoLetivoForm;