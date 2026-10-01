import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { buscarMatriculaPorId, criarMatricula, atualizarMatricula } from '../../services/matriculaService';
import { listarAlunos } from '../../services/alunoService';
import { listarTurmas } from '../../services/turmaService';

// 12345678901 -> 123.456.789-01
const formatarCpf = (cpf) =>
  cpf && cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;

function AdminMatriculaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [form, setForm] = useState({
    aluno: { idAluno: '' },
    turma: { idTurma: '' },
    status: 'ativa',
    contratoUrl: '',
    planoPagamento: '',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarAlunos().then((response) => setAlunos(response.data));
    listarTurmas().then((response) => setTurmas(response.data));

    if (modoEdicao) {
      buscarMatriculaPorId(id).then((response) => {
        setForm(response.data);
      });
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAlunoChange = (e) => {
    setForm({ ...form, aluno: { idAluno: e.target.value } });
  };

  const handleTurmaChange = (e) => {
    setForm({ ...form, turma: { idTurma: e.target.value } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const acao = modoEdicao ? atualizarMatricula(id, form) : criarMatricula(form);

    acao
      .then(() => {
        navigate('/admin/matriculas');
      })
      .catch((error) => {
        const errosCampos = error.response?.data?.erros;
        if (errosCampos) {
          setErro(Object.values(errosCampos).join(' '));
        } else {
          setErro('Não foi possível salvar. Esse aluno já pode estar matriculado nessa turma.');
        }
        setEnviando(false);
      });
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar matrícula' : 'Nova matrícula'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao ? 'Atualize o status ou os dados da matrícula.' : 'Escolha o aluno e a turma para criar a matrícula.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Aluno e turma ===== */}
          <h2 className="form-section-title">Aluno e turma</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="aluno">Aluno</label>
              <select id="aluno" name="aluno" value={form.aluno?.idAluno || ''} onChange={handleAlunoChange} required>
                <option value="">Selecione o aluno</option>
                {alunos.map((aluno) => (
                  <option key={aluno.idAluno} value={aluno.idAluno}>
                    {aluno.nomeCompleto} — CPF {formatarCpf(aluno.cpf)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="turma">Turma</label>
              <select id="turma" name="turma" value={form.turma?.idTurma || ''} onChange={handleTurmaChange} required>
                <option value="">Selecione a turma</option>
                {turmas.map((turma) => (
                  <option key={turma.idTurma} value={turma.idTurma}>
                    {turma.nome}{turma.curso?.nome ? ` — ${turma.curso.nome}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ===== Status e pagamento ===== */}
          <h2 className="form-section-title">Status e pagamento</h2>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={form.status || 'ativa'} onChange={handleChange}>
                  <option value="ativa">Ativa</option>
                  <option value="trancada">Trancada</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="planoPagamento">Plano de pagamento</label>
                <input id="planoPagamento" name="planoPagamento" placeholder="Ex: à vista, 6x, 12x" value={form.planoPagamento || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="contratoUrl">Link do contrato (opcional)</label>
              <input id="contratoUrl" name="contratoUrl" placeholder="https://..." value={form.contratoUrl || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/matriculas" className="admin-btn admin-btn-secundario">
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

export default AdminMatriculaForm;