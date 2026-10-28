import { useState, useEffect } from 'react';
import CampoSenha from '../../components/CampoSenha';
import { CampoCpf, CampoTelefone } from '../../components/CamposFormatados';
import { useNavigate, useParams, useOutletContext, Link } from 'react-router-dom';
import { buscarAlunoPorId, criarAluno, atualizarAluno } from '../../services/alunoService';
import CampoCep from '../../components/CampoCep';
import DocumentosDoAluno from '../../components/admin/DocumentosDoAluno';
import UltimaAlteracao from '../../components/admin/UltimaAlteracao';
import AbasDoCadastro, { useAbaAtual } from '../../components/admin/AbasDoCadastro';
import AdminInscricoes from './AdminInscricoes';
import AdminMatriculas from './AdminMatriculas';
import { podeUsar } from '../../utils/modulosAdmin';

function AdminAlunoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = Boolean(id);
  const { acesso } = useOutletContext() || {};

  // Na edição: abas com as inscrições e matrículas do aluno,
  // só para quem tem esses módulos liberados no nível de acesso
  const abas = [{ chave: 'dados', rotulo: '👤 Dados pessoais' }];
  if (modoEdicao && podeUsar(acesso, 'inscricoes')) abas.push({ chave: 'inscricoes', rotulo: '🧾 Inscrições' });
  if (modoEdicao && podeUsar(acesso, 'matriculas')) abas.push({ chave: 'matriculas', rotulo: '✅ Matrículas' });
  const [aba, trocarAba] = useAbaAtual(abas);

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
    aceitaMarketing: false,
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
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
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
            {modoEdicao
              ? form.nomeCompleto || 'Atualize os dados do aluno e salve.'
              : 'Preencha os dados para cadastrar um novo aluno.'}
          </p>
          {modoEdicao && <UltimaAlteracao alvo="alunos" id={id} />}
        </div>
      </div>

      <AbasDoCadastro abas={abas} atual={aba} onTrocar={trocarAba} rotulo="Cadastro do aluno" />

      {aba === 'inscricoes' && <AdminInscricoes idAluno={id} />}
      {aba === 'matriculas' && <AdminMatriculas idAluno={id} />}

      {aba === 'dados' && (
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
                  <CampoTelefone value={form.telefone} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label htmlFor="dataNascimento">Data de nascimento</label>
                  <input id="dataNascimento" name="dataNascimento" type="date" value={form.dataNascimento || ''} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="cpf">CPF</label>
                <CampoCpf value={form.cpf} onChange={handleChange} required />
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
                  <CampoCep
                    value={form.cep || ''}
                    onChange={handleChange}
                    onEnderecoEncontrado={(endereco) => setForm((atual) => ({ ...atual, ...endereco }))}
                  />
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
                  <CampoSenha
                    id="senhaHash"
                    placeholder={modoEdicao ? 'Deixe em branco para manter' : 'Crie uma senha'}
                    value={form.senhaHash}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required={!modoEdicao}
                  />
                </div>
              </div>
              <label className="form-consentimento">
                <input
                  type="checkbox"
                  name="aceitaMarketing"
                  checked={Boolean(form.aceitaMarketing)}
                  onChange={handleChange}
                />
                <span>
                  Aceita receber ofertas e campanhas (e-mail e WhatsApp)
                  <small>Só marque se o próprio aluno pediu. Desmarque quando ele pedir para não receber mais.</small>
                </span>
              </label>
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

          {modoEdicao && (
            <section className="doc-secao" aria-label="Documento de escolaridade">
              <h2 className="form-section-title">Documento de escolaridade</h2>
              <DocumentosDoAluno idAluno={id} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminAlunoForm;