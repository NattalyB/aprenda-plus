import { useState } from 'react';
import { abrirChamado } from '../../services/chamadoService';
import { CATEGORIAS, PRIORIDADES, erroDoAnexo } from '../../utils/chamados';
import CampoAnexo from './CampoAnexo';

// Formulário para abrir um chamado de suporte (funcionário do painel ou professor).
function FormNovoChamado({ perfil, telaInicial = '', onCriado, onCancelar }) {
  const [form, setForm] = useState({
    assunto: '',
    categoria: 'erro',
    prioridade: 'media',
    descricao: '',
    tela: telaInicial,
  });
  const [anexo, setAnexo] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }));

  const enviar = (e) => {
    e.preventDefault();
    if (!form.assunto.trim()) return setErro('Informe o assunto do chamado.');
    if (!form.descricao.trim()) return setErro('Descreva o problema.');
    const problemaDoAnexo = erroDoAnexo(anexo);
    if (problemaDoAnexo) return setErro(problemaDoAnexo);

    setEnviando(true);
    setErro(null);
    abrirChamado(perfil, form, anexo)
      .then((chamado) => onCriado(chamado))
      .catch((error) => {
        setErro(error.response?.data?.mensagem || 'Não foi possível abrir o chamado. Tente de novo.');
        setEnviando(false);
      });
  };

  return (
    <form className="admin-card chamado-form" onSubmit={enviar} noValidate>
      <h2 className="form-section-title">Abrir chamado</h2>
      <p className="chamado-form-dica">
        Conte o que aconteceu com o máximo de detalhes: o que você estava fazendo, o que esperava e o que apareceu.
        Um print da tela ajuda muito.
      </p>
      {erro && <div className="form-erro" role="alert">{erro}</div>}

      <div className="form-field">
        <label htmlFor="chamado-assunto">Assunto *</label>
        <input id="chamado-assunto" type="text" maxLength={150} value={form.assunto} onChange={mudar('assunto')}
          placeholder="Ex.: Erro ao salvar uma turma" />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="chamado-categoria">Categoria</label>
          <select id="chamado-categoria" value={form.categoria} onChange={mudar('categoria')}>
            {CATEGORIAS.map((c) => <option key={c.chave} value={c.chave}>{c.rotulo}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="chamado-prioridade">Prioridade</label>
          <select id="chamado-prioridade" value={form.prioridade} onChange={mudar('prioridade')}>
            {PRIORIDADES.map((p) => <option key={p.chave} value={p.chave}>{p.rotulo} — {p.dica}</option>)}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="chamado-tela">Onde aconteceu? (tela)</label>
        <input id="chamado-tela" type="text" maxLength={200} value={form.tela} onChange={mudar('tela')}
          placeholder="Ex.: Financeiro > Parcelas" />
      </div>

      <div className="form-field">
        <label htmlFor="chamado-descricao">Descrição do problema *</label>
        <textarea id="chamado-descricao" rows={6} maxLength={5000} value={form.descricao} onChange={mudar('descricao')}
          placeholder="Ex.: Ao clicar em Salvar na turma ADM-B aparece a mensagem 'Erro ao salvar'." />
      </div>

      <CampoAnexo id="chamado-anexo" arquivo={anexo} onMudar={setAnexo} />

      <div className="chamado-form-acoes">
        <button type="button" className="admin-btn admin-btn-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Abrir chamado'}
        </button>
      </div>
    </form>
  );
}

export default FormNovoChamado;
