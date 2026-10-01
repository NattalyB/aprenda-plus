import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { buscarTurmaPorId, criarTurma, atualizarTurma } from '../../services/turmaService';
import { listarCursos } from '../../services/cursoService';
import { listarPeriodosLetivos } from '../../services/periodoLetivoService';

function AdminTurmaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [cursos, setCursos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [form, setForm] = useState({
    nome: '',
    curso: { idCurso: '' },
    periodoLetivo: { idPeriodoLetivo: '' },
    cargaHoraria: '',
    modalidade: '',
    capacidadeMaxima: '',
    diasHorarios: '',
    status: 'inscricoes_abertas',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarCursos().then((response) => setCursos(response.data));
    listarPeriodosLetivos().then((response) => setPeriodos(response.data));

    if (modoEdicao) {
      buscarTurmaPorId(id).then((response) => {
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

  const handlePeriodoChange = (e) => {
    setForm({ ...form, periodoLetivo: { idPeriodoLetivo: e.target.value } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const acao = modoEdicao ? atualizarTurma(id, form) : criarTurma(form);

    acao
      .then(() => {
        navigate('/admin/turmas');
      })
      .catch((error) => {
        const errosCampos = error.response?.data?.erros;
        if (errosCampos) {
          setErro(Object.values(errosCampos).join(' '));
        } else {
          setErro('Não foi possível salvar a turma. Confira os campos.');
        }
        setEnviando(false);
      });
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar turma' : 'Nova turma'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao ? 'Atualize as informações da turma e salve.' : 'Defina o curso, o período e os detalhes da nova turma.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Identificação ===== */}
          <h2 className="form-section-title">Identificação</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nome">Nome da turma</label>
              <input id="nome" name="nome" placeholder="Ex: Turma A - Noite" value={form.nome || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
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
                <label htmlFor="periodoLetivo">Período letivo</label>
                <select id="periodoLetivo" name="periodoLetivo" value={form.periodoLetivo?.idPeriodoLetivo || ''} onChange={handlePeriodoChange} required>
                  <option value="">Selecione o período</option>
                  {periodos.map((periodo) => (
                    <option key={periodo.idPeriodoLetivo} value={periodo.idPeriodoLetivo}>{periodo.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ===== Detalhes ===== */}
          <h2 className="form-section-title">Detalhes</h2>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="capacidadeMaxima">Capacidade máxima</label>
                <input id="capacidadeMaxima" name="capacidadeMaxima" type="number" placeholder="Ex: 40" value={form.capacidadeMaxima || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="cargaHoraria">Carga horária (horas)</label>
                <input id="cargaHoraria" name="cargaHoraria" type="number" placeholder="Ex: 3000" value={form.cargaHoraria || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="modalidade">Modalidade</label>
                <input id="modalidade" name="modalidade" placeholder="EAD, presencial ou híbrido" value={form.modalidade || ''} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label htmlFor="diasHorarios">Dias e horários</label>
                <input id="diasHorarios" name="diasHorarios" placeholder="Ex: seg/qua 19h-22h" value={form.diasHorarios || ''} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ===== Status ===== */}
          <h2 className="form-section-title">Status</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="status">Situação da turma</label>
              <select id="status" name="status" value={form.status || 'inscricoes_abertas'} onChange={handleChange}>
                <option value="inscricoes_abertas">Inscrições abertas</option>
                <option value="inscricoes_encerradas">Inscrições encerradas</option>
                <option value="em_andamento">Em andamento</option>
                <option value="encerrada">Encerrada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/turmas" className="admin-btn admin-btn-secundario">
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

export default AdminTurmaForm;