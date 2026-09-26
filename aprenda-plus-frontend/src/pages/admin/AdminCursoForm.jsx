import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buscarCursoPorId, criarCurso, atualizarCurso } from '../../services/cursoService';

function AdminCursoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [form, setForm] = useState({
    nome: '',
    categoria: 'superior',
    descricao: '',
    conteudo: '',
    cargaHoraria: '',
    modalidade: '',
    preRequisitos: '',
    valor: '',
    formasPagamento: '',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      buscarCursoPorId(id).then((response) => {
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

    const acao = modoEdicao ? atualizarCurso(id, form) : criarCurso(form);

    acao
      .then(() => {
        navigate('/admin/cursos');
      })
      .catch(() => {
        setErro('Não foi possível salvar o curso. Confira os campos.');
        setEnviando(false);
      });
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1>{modoEdicao ? 'Editar curso' : 'Novo curso'}</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input name="nome" placeholder="Nome do curso" value={form.nome} onChange={handleChange} required />

        <select name="categoria" value={form.categoria} onChange={handleChange} required>
          <option value="superior">Superior</option>
          <option value="profissionalizante">Profissionalizante</option>
        </select>

        <textarea name="descricao" placeholder="Descrição" value={form.descricao} onChange={handleChange} rows={3} />
        <textarea name="conteudo" placeholder="Conteúdo programático" value={form.conteudo} onChange={handleChange} rows={3} />

        <input name="cargaHoraria" type="number" placeholder="Carga horária (h)" value={form.cargaHoraria} onChange={handleChange} required />
        <input name="modalidade" placeholder="Modalidade (EAD, presencial, híbrido)" value={form.modalidade} onChange={handleChange} required />
        <input name="preRequisitos" placeholder="Pré-requisitos" value={form.preRequisitos} onChange={handleChange} />
        <input name="valor" type="number" step="0.01" placeholder="Valor (R$)" value={form.valor} onChange={handleChange} required />
        <input name="formasPagamento" placeholder="Formas de pagamento" value={form.formasPagamento} onChange={handleChange} />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

export default AdminCursoForm;