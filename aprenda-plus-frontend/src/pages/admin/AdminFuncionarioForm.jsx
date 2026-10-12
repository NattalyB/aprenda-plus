import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { buscarFuncionarioPorId, criarFuncionario, atualizarFuncionario, listarNiveis } from '../../services/funcionarioService';
import { getAcessoAdmin } from '../../services/authAdminService';

// Id do funcionário logado: ele não pode inativar a própria conta
const idLogado = () => localStorage.getItem('idFuncionario');

function AdminFuncionarioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);
  const propriaConta = modoEdicao && String(id) === idLogado();

  const [form, setForm] = useState({
    nomeCompleto: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    cpf: '',
    cargo: 'administrativo',
    senhaHash: '',
    status: 'ativo',
    idNivel: '',
  });
  const [niveis, setNiveis] = useState([]);
  // Só um Master pode dar (ou tirar) o nível Master
  const souMaster = Boolean(getAcessoAdmin()?.master);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarNiveis()
      .then((response) => setNiveis(response.data || []))
      .catch(() => setNiveis([]));
  }, []);

  useEffect(() => {
    if (modoEdicao) {
      buscarFuncionarioPorId(id).then((response) => {
        // A senha nunca volta do servidor: o campo começa vazio
        const { nivel, ...dados } = response.data;
        setForm({ ...dados, senhaHash: '', idNivel: nivel?.idNivel ? String(nivel.idNivel) : '' });
      });
    }
  }, [id]);

  const nivelEscolhido = niveis.find((n) => String(n.idNivel) === String(form.idNivel));
  // Contas Master só podem ser alteradas por outro Master
  const contaMasterBloqueada = !souMaster && Boolean(nivelEscolhido?.master) && modoEdicao;
  const opcoesDeNivel = niveis.filter((n) => !n.master || souMaster || String(n.idNivel) === String(form.idNivel));

  const handleChange = (e) => {
    const { name, value } = e.target;
    // CPF: só números
    setForm({ ...form, [name]: name === 'cpf' ? value.replace(/\D/g, '').slice(0, 11) : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    // Na edição, senha em branco = manter a atual (não manda o campo)
    const { idNivel, ...dados } = form;
    if (modoEdicao && !dados.senhaHash) {
      delete dados.senhaHash;
    }
    dados.nivel = idNivel ? { idNivel: Number(idNivel) } : null;

    const acao = modoEdicao ? atualizarFuncionario(id, dados) : criarFuncionario(dados);

    acao
      .then(() => navigate('/admin/funcionarios'))
      .catch((error) => {
        setErro(error.response?.data?.mensagem || 'Não foi possível salvar. Confira os campos (e-mail/CPF podem já existir).');
        setEnviando(false);
      });
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">{modoEdicao ? 'Editar funcionário' : 'Novo funcionário'}</h1>
          <p className="admin-subtitulo">
            {modoEdicao
              ? 'Atualize os dados de acesso ao painel.'
              : 'Cadastre uma pessoa da equipe para administrar o painel.'}
          </p>
        </div>
      </div>

      <div className="form-card admin-form-card">
        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <h2 className="form-section-title">Dados pessoais</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nomeCompleto">Nome completo</label>
              <input id="nomeCompleto" name="nomeCompleto" placeholder="Ex: Ana Souza" value={form.nomeCompleto || ''} onChange={handleChange} required />
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
              <input id="cpf" name="cpf" placeholder="Apenas números" inputMode="numeric" value={form.cpf || ''} onChange={handleChange} minLength={11} maxLength={11} required />
            </div>
          </div>

          <h2 className="form-section-title">Acesso ao painel</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="idNivel">Nível de acesso</label>
              <select
                id="idNivel"
                name="idNivel"
                value={form.idNivel}
                onChange={handleChange}
                disabled={propriaConta || contaMasterBloqueada}
                required
              >
                <option value="">Escolha o nível...</option>
                {opcoesDeNivel.map((nivel) => (
                  <option key={nivel.idNivel} value={nivel.idNivel}>
                    {nivel.nome}
                  </option>
                ))}
              </select>
              <small className="form-dica">
                {propriaConta
                  ? 'Você não pode mudar o seu próprio nível de acesso.'
                  : contaMasterBloqueada
                    ? 'Só um usuário Master pode alterar uma conta Master.'
                    : 'O nível define quais módulos do painel a pessoa pode usar (configure em Sistema).'}
              </small>
            </div>

            <div className="form-field">
              <label htmlFor="email">E-mail de login</label>
              <input id="email" name="email" type="email" placeholder="nome@aprendaplus.com" value={form.email || ''} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="senhaHash">{modoEdicao ? 'Nova senha (opcional)' : 'Senha'}</label>
                <input
                  id="senhaHash"
                  name="senhaHash"
                  type="password"
                  autoComplete="new-password"
                  placeholder={modoEdicao ? 'Deixe em branco para manter' : 'Mínimo de 6 caracteres'}
                  value={form.senhaHash || ''}
                  onChange={handleChange}
                  minLength={6}
                  required={!modoEdicao}
                />
              </div>
              <div className="form-field">
                <label htmlFor="cargo">Cargo</label>
                <input id="cargo" name="cargo" placeholder="Ex: administrativo, secretaria" value={form.cargo || ''} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="status">Situação</label>
              <select id="status" name="status" value={form.status || 'ativo'} onChange={handleChange} disabled={propriaConta}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
              <small className="form-dica">
                {propriaConta
                  ? 'Você não pode inativar a sua própria conta.'
                  : 'Funcionários inativos ou bloqueados não conseguem entrar no painel.'}
              </small>
            </div>
          </div>

          <div className="form-acoes">
            <Link to="/admin/funcionarios" className="admin-btn admin-btn-secundario">
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

export default AdminFuncionarioForm;
