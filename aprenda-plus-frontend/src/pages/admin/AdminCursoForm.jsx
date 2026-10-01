import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { buscarCursoPorId, criarCurso, atualizarCurso } from '../../services/cursoService';

const formatarValor = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
    numeroParcelas: '',
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

    // Campo de parcelas vazio vai como null (curso sem parcelamento definido)
    const dadosParaEnviar = {
      ...form,
      numeroParcelas: form.numeroParcelas ? Number(form.numeroParcelas) : null,
    };

    const acao = modoEdicao ? atualizarCurso(id, dadosParaEnviar) : criarCurso(dadosParaEnviar);

    acao
      .then(() => {
        navigate('/admin/cursos');
      })
      .catch((error) => {
        const errosCampos = error.response?.data?.erros;
        if (errosCampos) {
          setErro(Object.values(errosCampos).join(' '));
        } else {
          setErro('Não foi possível salvar o curso. Confira os campos.');
        }
        setEnviando(false);
      });
  };

  // Prévia da mensalidade
  const parcelas = Number(form.numeroParcelas);
  const mensalidade = form.valor && parcelas > 0 ? Number(form.valor) / parcelas : null;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar curso' : 'Novo curso'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao ? 'Atualize as informações do curso e salve.' : 'Preencha as informações para cadastrar um novo curso.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Informações do curso ===== */}
          <h2 className="form-section-title">Informações do curso</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nome">Nome do curso</label>
              <input id="nome" name="nome" placeholder="Ex: Engenharia de Software" value={form.nome || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" value={form.categoria || 'superior'} onChange={handleChange} required>
                  <option value="superior">Superior</option>
                  <option value="profissionalizante">Profissionalizante</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="modalidade">Modalidade</label>
                <input id="modalidade" name="modalidade" placeholder="EAD, presencial ou híbrido" value={form.modalidade || ''} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="descricao">Descrição</label>
              <textarea id="descricao" name="descricao" placeholder="Um resumo sobre o curso e a área de atuação" value={form.descricao || ''} onChange={handleChange} rows={4} />
            </div>
          </div>

          {/* ===== Conteúdo programático ===== */}
          <h2 className="form-section-title">Conteúdo programático</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="conteudo">Tópicos do curso</label>
              <textarea
                id="conteudo"
                name="conteudo"
                placeholder={'Exemplo:\nAlgoritmos e Estruturas de Dados\nBanco de Dados\nDesenvolvimento Web'}
                value={form.conteudo || ''}
                onChange={handleChange}
                rows={7}
              />
              <span className="form-dica">
                💡 Digite um tópico por linha (aperte Enter entre eles). Cada linha vira um item da lista no site.
              </span>
            </div>
          </div>

          {/* ===== Valores e requisitos ===== */}
          <h2 className="form-section-title">Valores e requisitos</h2>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="valor">Valor total (R$)</label>
                <input id="valor" name="valor" type="number" step="0.01" min="0" placeholder="Ex: 7999.99" value={form.valor || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="cargaHoraria">Carga horária (horas)</label>
                <input id="cargaHoraria" name="cargaHoraria" type="number" placeholder="Ex: 3000" value={form.cargaHoraria || ''} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="numeroParcelas">Número de parcelas (mensalidades)</label>
                <input id="numeroParcelas" name="numeroParcelas" type="number" min="1" max="120" placeholder="Ex: 24" value={form.numeroParcelas || ''} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Mensalidade calculada</label>
                <div className={mensalidade ? 'form-preview' : 'form-preview form-preview-vazio'}>
                  {mensalidade
                    ? `${parcelas}x de ${formatarValor(mensalidade)}`
                    : 'Preencha o valor e as parcelas'}
                </div>
              </div>
            </div>
            <span className="form-dica">
              💡 No site, a mensalidade aparece em destaque e o valor total fica logo abaixo, menor. Sem parcelas, o site mostra só o valor total.
            </span>

            <div className="form-field">
              <label htmlFor="preRequisitos">Pré-requisitos</label>
              <input id="preRequisitos" name="preRequisitos" placeholder="Ex: Ensino Médio Completo" value={form.preRequisitos || ''} onChange={handleChange} />
            </div>

            <div className="form-field">
              <label htmlFor="formasPagamento">Formas de pagamento</label>
              <input id="formasPagamento" name="formasPagamento" placeholder="Ex: Pix, boleto, cartão" value={form.formasPagamento || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/cursos" className="admin-btn admin-btn-secundario">
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

export default AdminCursoForm;