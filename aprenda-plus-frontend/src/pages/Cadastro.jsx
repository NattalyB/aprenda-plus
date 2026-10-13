import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cadastrarAlunoComDocumento } from '../services/alunoService';
import { conferirArquivoDoDocumento } from '../services/documentoService';
import { mostrarAviso } from '../services/avisoService';
import CampoCep from '../components/CampoCep';
import CampoArquivo from '../components/CampoArquivo';

function Cadastro() {
  const navigate = useNavigate();
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [certificado, setCertificado] = useState(null);

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
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);

    // O certificado é conferido antes de enviar, pra não perder o formulário à toa
    const problemaNoArquivo = conferirArquivoDoDocumento(certificado);
    if (problemaNoArquivo) {
      setErro(problemaNoArquivo);
      return;
    }

    setEnviando(true);
    cadastrarAlunoComDocumento(form, certificado)
      .then(() => {
        mostrarAviso('Conta criada! Seu certificado foi enviado para análise da secretaria.', 'sucesso');
        navigate('/login');
      })
      .catch((error) => {
        setEnviando(false);
        const status = error.response?.status;
        const mensagem = error.response?.data?.mensagem;
        if (status === 409 || error.response?.data?.message?.includes('unique')) {
          setErro('E-mail ou CPF já cadastrado.');
        } else if (status === 413) {
          setErro('O arquivo pode ter no máximo 5 MB.');
        } else if (status === 400) {
          setErro(mensagem || 'Verifique os dados preenchidos.');
        } else {
          setErro('Não foi possível concluir o cadastro. Tente novamente.');
        }
      });
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h1 className="form-title">Cadastro</h1>
        <p className="form-subtitle">Crie sua conta e comece a aprender hoje mesmo.</p>

        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={handleSubmit}>
          {/* ===== Dados pessoais ===== */}
          <h2 className="form-section-title">Dados pessoais</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="nomeCompleto">Nome completo</label>
              <input id="nomeCompleto" name="nomeCompleto" placeholder="Ex: Maria da Silva" value={form.nomeCompleto} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" placeholder="seuemail@exemplo.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="telefone">Telefone</label>
                <input id="telefone" name="telefone" placeholder="(51) 99999-9999" value={form.telefone} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="dataNascimento">Data de nascimento</label>
                <input id="dataNascimento" name="dataNascimento" type="date" value={form.dataNascimento} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="cpf">CPF</label>
              <input id="cpf" name="cpf" placeholder="Apenas números" value={form.cpf} onChange={handleChange} maxLength={11} required />
            </div>
          </div>

          {/* ===== Endereço ===== */}
          <h2 className="form-section-title">Endereço</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="rua">Rua/Av</label>
              <input id="rua" name="rua" placeholder="Ex: Av. Brasil" value={form.rua} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="numero">Número</label>
                <input id="numero" name="numero" placeholder="Ex: 123" value={form.numero} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="complemento">Complemento (opcional)</label>
                <input id="complemento" name="complemento" placeholder="Apto, bloco..." value={form.complemento} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="cep">CEP</label>
                <CampoCep
                  value={form.cep}
                  onChange={handleChange}
                  onEnderecoEncontrado={(endereco) => setForm((atual) => ({ ...atual, ...endereco }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="bairro">Bairro</label>
                <input id="bairro" name="bairro" placeholder="Ex: Centro" value={form.bairro} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row form-row-uf">
              <div className="form-field">
                <label htmlFor="cidade">Cidade</label>
                <input id="cidade" name="cidade" placeholder="Ex: Canoas" value={form.cidade} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label htmlFor="estado">UF</label>
                <input id="estado" name="estado" placeholder="RS" value={form.estado} onChange={handleChange} maxLength={2} required />
              </div>
            </div>
          </div>

          {/* ===== Acesso ===== */}
          <h2 className="form-section-title">Acesso</h2>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="senhaHash">Senha</label>
              <input id="senhaHash" name="senhaHash" type="password" placeholder="Crie uma senha" value={form.senhaHash} onChange={handleChange} required />
            </div>
          </div>

          {/* ===== Escolaridade ===== */}
          <h2 className="form-section-title">Escolaridade</h2>
          <p className="form-dica form-dica-bloco">
            Nossos cursos são para quem já concluiu o ensino médio. Anexe o certificado (ou histórico) de
            conclusão: a secretaria confere o documento antes de liberar a sua matrícula.
          </p>
          <CampoArquivo
            id="certificado"
            label="Certificado de conclusão do ensino médio"
            arquivo={certificado}
            onChange={setCertificado}
          />

          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'SALVANDO...' : 'CRIAR CONTA'}
          </button>
        </form>

        <p className="form-rodape">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

export default Cadastro;