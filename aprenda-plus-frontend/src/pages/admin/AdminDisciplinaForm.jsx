import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
      .catch(() => {
        setErro('Não foi possível salvar a disciplina.');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>{modoEdicao ? 'Editar disciplina' : 'Nova disciplina'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <select name="curso" value={form.curso?.idCurso || ''} onChange={handleCursoChange} required>
          <option value="">Selecione o curso</option>
          {cursos.map((curso) => (
            <option key={curso.idCurso} value={curso.idCurso}>{curso.nome}</option>
          ))}
        </select>

        <input name="nome" placeholder="Nome da disciplina" value={form.nome} onChange={handleChange} required />
        <textarea name="descricao" placeholder="Descrição" value={form.descricao || ''} onChange={handleChange} rows={3} />
        <textarea name="conteudo" placeholder="Conteúdo" value={form.conteudo || ''} onChange={handleChange} rows={3} />
        <input name="cargaHoraria" type="number" placeholder="Carga horária (h)" value={form.cargaHoraria} onChange={handleChange} required />
        <input name="modalidade" placeholder="Modalidade" value={form.modalidade || ''} onChange={handleChange} />
        <input name="preRequisitos" placeholder="Pré-requisitos" value={form.preRequisitos || ''} onChange={handleChange} />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminDisciplinaForm;