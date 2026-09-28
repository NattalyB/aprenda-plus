import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
      .catch(() => {
        setErro('Não foi possível salvar a turma.');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>{modoEdicao ? 'Editar turma' : 'Nova turma'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="nome" placeholder="Nome da turma (ex: Turma A - Noite)" value={form.nome} onChange={handleChange} required />

        <select value={form.curso?.idCurso || ''} onChange={handleCursoChange} required>
          <option value="">Selecione o curso</option>
          {cursos.map((curso) => (
            <option key={curso.idCurso} value={curso.idCurso}>{curso.nome}</option>
          ))}
        </select>

        <select value={form.periodoLetivo?.idPeriodoLetivo || ''} onChange={handlePeriodoChange} required>
          <option value="">Selecione o período letivo</option>
          {periodos.map((periodo) => (
            <option key={periodo.idPeriodoLetivo} value={periodo.idPeriodoLetivo}>{periodo.nome}</option>
          ))}
        </select>

        <input name="cargaHoraria" type="number" placeholder="Carga horária (h)" value={form.cargaHoraria || ''} onChange={handleChange} />
        <input name="modalidade" placeholder="Modalidade (EAD, presencial...)" value={form.modalidade || ''} onChange={handleChange} />
        <input name="capacidadeMaxima" type="number" placeholder="Capacidade máxima de alunos" value={form.capacidadeMaxima} onChange={handleChange} required />
        <input name="diasHorarios" placeholder="Dias e horários (ex: seg/qua 19h-22h)" value={form.diasHorarios || ''} onChange={handleChange} />

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="inscricoes_abertas">Inscrições abertas</option>
          <option value="inscricoes_encerradas">Inscrições encerradas</option>
          <option value="em_andamento">Em andamento</option>
          <option value="encerrada">Encerrada</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminTurmaForm;