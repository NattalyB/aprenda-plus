import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { buscarDisciplinaPorId, criarDisciplina, atualizarDisciplina } from '../../services/disciplinaService';
import { listarCursos } from '../../services/cursoService';

function AdminDisciplinaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [cursos, setCursos] = useState([]);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    cargaHoraria: '',
    modalidade: '',
    preRequisitos: '',
    curso: { idCurso: '' },
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarCursos().then((response) => setCursos(response.data));

    if (modoEdicao) {
      buscarDisciplinaPorId(id).then((response) => {
        setForm(response.data);
      });
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCursoChange = (e) => {
    setForm({ ...form, curso: { idCurso: e.target.value } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const acao = modoEdicao ? atualizarDisciplina(id, form) : criarDisciplina(form);

    acao
      .then(() => {
        navigate('/admin/disciplinas');
      })
      .catch((error) => {
        const errosCampos = error.response?.data?.erros;
        if (errosCampos) {
          setErro(Object.values(errosCampos).join(' '));
        } else {
          setErro('Não foi possível salvar a disciplina. Confira os campos.');
        }
        setEnviando(false);
      });
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar disciplina' : 'Nova disciplina'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao ? 'Atualize as informações da disciplina e salve.' : 'Preencha as informações para cadastrar uma nova disciplina.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Informações da disciplina ===== */}
          <h2 className="form-section-title">Informações da disciplina</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="curso">Curso</label>
              <select id="curso" name="curso" value={form.curso?.idCurso || ''} onChange={handleCursoChange} required>
                <option value="">Selecione o curso</option>
                {cursos.map((curso) => (
                  <option key={curso.idCurso} value={curso.idCurso}>{curso.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="nome">Nome da disciplina</label>
              <input id="nome" name="nome" placeholder="Ex: Banco de Dados" value={form.nome || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="cargaHoraria">Carga horária (horas)</label>
                <input id="cargaHoraria" name="cargaHoraria" type="number" placeholder="Ex: 80" value={form.cargaHoraria || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="modalidade">Modalidade</label>
                <input id="modalidade" name="modalidade" placeholder="EAD, presencial ou híbrido" value={form.modalidade || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="preRequisitos">Pré-requisitos</label>
              <input id="preRequisitos" name="preRequisitos" placeholder="Ex: Algoritmos I" value={form.preRequisitos || ''} onChange={handleChange} />
            </div>
          </div>

          {/* ===== Descrição e conteúdo ===== */}
          <h2 className="form-section-title">Descrição e conteúdo</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="descricao">Descrição</label>
              <textarea id="descricao" name="descricao" placeholder="Um resumo sobre a disciplina" value={form.descricao || ''} onChange={handleChange} rows={3} />
            </div>

            <div className="form-field">
              <label htmlFor="conteudo">Conteúdo</label>
              <textarea id="conteudo" name="conteudo" placeholder="Principais assuntos abordados" value={form.conteudo || ''} onChange={handleChange} rows={5} />
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/disciplinas" className="admin-btn admin-btn-secundario">
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

export default AdminDisciplinaForm;