import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buscarMatriculaPorId, criarMatricula, atualizarMatricula } from '../../services/matriculaService';
import { listarAlunos } from '../../services/alunoService';
import { listarTurmas } from '../../services/turmaService';

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
      .catch(() => {
        setErro('Não foi possível salvar. Esse aluno já pode estar matriculado nessa turma.');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>{modoEdicao ? 'Editar matrícula' : 'Nova matrícula'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <select value={form.aluno?.idAluno || ''} onChange={handleAlunoChange} required>
          <option value="">Selecione o aluno</option>
          {alunos.map((aluno) => (
            <option key={aluno.idAluno} value={aluno.idAluno}>{aluno.nomeCompleto}</option>
          ))}
        </select>

        <select value={form.turma?.idTurma || ''} onChange={handleTurmaChange} required>
          <option value="">Selecione a turma</option>
          {turmas.map((turma) => (
            <option key={turma.idTurma} value={turma.idTurma}>{turma.nome}</option>
          ))}
        </select>

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="ativa">Ativa</option>
          <option value="trancada">Trancada</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <input name="planoPagamento" placeholder="Plano de pagamento (ex: à vista, 6x)" value={form.planoPagamento || ''} onChange={handleChange} />
        <input name="contratoUrl" placeholder="Link do contrato (opcional)" value={form.contratoUrl || ''} onChange={handleChange} />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminMatriculaForm;