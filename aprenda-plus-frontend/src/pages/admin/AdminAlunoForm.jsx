import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { buscarAlunoPorId, criarAluno, atualizarAluno } from '../../services/alunoService';

function AdminAlunoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);

  const [form, setForm] = useState({
    nomeCompleto: '',
    telefone: '',
    email: '',
    dataNascimento: '',
    cpf: '',
    senhaHash: '',
    rua: '',
    numero: '',
    complemento: '',
    cep: '',
    bairro: '',
    cidade: '',
    estado: '',
    status: 'ativo',
  });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (modoEdicao) {
      buscarAlunoPorId(id).then((response) => {
        // Na edição, não trazemos a senha de volta pro formulário (ela já vem como hash)
        setForm({ ...response.data, senhaHash: '' });
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

    // Se estiver editando e o campo de senha ficou vazio, não manda esse campo
    const dadosParaEnviar = { ...form };
    if (modoEdicao && !dadosParaEnviar.senhaHash) {
      delete dadosParaEnviar.senhaHash;
    }

    const acao = modoEdicao ? atualizarAluno(id, dadosParaEnviar) : criarAluno(dadosParaEnviar);

    acao
      .then(() => {
        navigate('/admin/alunos');
      })
      .catch((error) => {
        // Se o backend devolveu quais campos estão errados, mostra as mensagens
        const errosCampos = error.response?.data?.erros;
        if (errosCampos) {
          setErro(Object.values(errosCampos).join(' '));
        } else {
          setErro('Não foi possível salvar. Confira os campos (e-mail/CPF podem já existir).');
        }
        setEnviando(false);
      });
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar aluno' : 'Novo aluno'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao ? 'Atualize os dados do aluno e salve.' : 'Preencha os dados para cadastrar um novo aluno.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Dados pessoais ===== */}
          <h2 className="form-section-title">Dados pessoais</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nomeCompleto">Nome completo</label>
              <input id="nomeCompleto" name="nomeCompleto" placeholder="Ex: Maria da Silva" value={form.nomeCompleto || ''} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" placeholder="seuemail@exemplo.com" value={form.email || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="telefone">Telefone</label>
                <input id="telefone" name="telefone" placeholder="(51) 99999-9999" value={form.telefone || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input id="dataNascimento" name="dataNascimento" type="date" value={form.dataNascimento || ''} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="cpf">CPF</label>
              <input id="cpf" name="cpf" placeholder="Apenas números" value={form.cpf || ''} onChange={handleChange} maxLength={11} required />
            </div>
          </div>

          {/* ===== Endereço ===== */}
          <h2 className="form-section-title">Endereço</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="rua">Rua/Av</label>
              <input id="rua" name="rua" placeholder="Ex: Av. Brasil" value={form.rua || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="numero">Número</label>
                <input id="numero" name="numero" placeholder="Ex: 123" value={form.numero || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="complemento">Complemento (opcional)</label>
                <input id="complemento" name="complemento" placeholder="Apto, bloco..." value={form.complemento || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="cep">CEP</label>
                <input id="cep" name="cep" placeholder="00000-000" value={form.cep || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="bairro">Bairro</label>
                <input id="bairro" name="bairro" placeholder="Ex: Centro" value={form.bairro || ''} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row form-row-uf">
              <div className="form-field">
                <label htmlFor="cidade">Cidade</label>
                <input id="cidade" name="cidade" placeholder="Ex: Canoas" value={form.cidade || ''} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="estado">UF</label>
                <input id="estado" name="estado" placeholder="RS" value={form.estado || ''} onChange={handleChange} maxLength={2} required />
              </div>
            </div>
          </div>

          {/* ===== Acesso e status ===== */}
          <h2 className="form-section-title">Acesso e status</h2>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={form.status || 'ativo'} onChange={handleChange}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="senhaHash">{modoEdicao ? 'Nova senha (opcional)' : 'Senha'}</label>
                <input
                  id="senhaHash"
                  name="senhaHash"
                  type="password"
                  placeholder={modoEdicao ? 'Deixe em branco para manter' : 'Crie uma senha'}
                  value={form.senhaHash}
                  onChange={handleChange}
                  required={!modoEdicao}
                />
              </div>
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/alunos" className="admin-btn admin-btn-secundario">
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

export default AdminAlunoForm;