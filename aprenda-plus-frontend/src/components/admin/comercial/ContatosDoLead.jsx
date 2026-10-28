import { useEffect, useState } from 'react';
import { listarContatosDoAluno, registrarContato } from '../../../services/comercialService';
import { formatarValor } from '../../../utils/precoCurso';
import {
  CANAIS,
  ETAPAS,
  RESULTADOS,
  formatarDataHora,
  linkEmailDoLead,
  linkWhatsappDoLead,
  mensagemSugerida,
  rotuloDoCanal,
  rotuloDoResultado,
  textoDiasParado,
} from '../../../utils/comercial';

const FORM_VAZIO = { canal: 'whatsapp', resultado: '', observacao: '' };

// Painel lateral de um lead: mensagem pronta, registro de contato e histórico de conversas
function ContatosDoLead({ lead, onFechar, onRegistrado }) {
  const [contatos, setContatos] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    listarContatosDoAluno(lead.idAluno)
      .then(setContatos)
      .catch(() => setContatos([]));
  }, [lead.idAluno]);

  // Esc fecha o painel
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  const mudar = (e) => setForm((atual) => ({ ...atual, [e.target.name]: e.target.value }));

  const mensagem = mensagemSugerida(lead);
  const whatsapp = linkWhatsappDoLead(lead);
  const email = linkEmailDoLead(lead);

  const copiarMensagem = () => {
    navigator.clipboard
      ?.writeText(mensagem)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {});
  };

  const enviar = (e) => {
    e.preventDefault();
    setErro(null);
    if (!form.resultado) {
      setErro('Escolha como foi o contato.');
      return;
    }
    setEnviando(true);
    registrarContato({ idAluno: lead.idAluno, ...form })
      .then((novo) => {
        setContatos((atual) => [novo, ...(atual || [])]);
        setForm(FORM_VAZIO);
        onRegistrado?.(novo);
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível registrar o contato.'))
      .finally(() => setEnviando(false));
  };

  return (
    <div
      className="doc-painel-fundo"
      role="dialog"
      aria-modal="true"
      aria-label={`Contatos com ${lead.nome}`}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className="doc-painel comercial-painel">
        <div className="doc-painel-topo">
          <div>
            <h2>{lead.nome}</h2>
            <p>
              <span className={`comercial-etapa ${ETAPAS[lead.etapa]?.classe || ''}`}>
                {ETAPAS[lead.etapa]?.rotulo || lead.etapa}
              </span>{' '}
              parado {textoDiasParado(lead.diasParado)}
              {lead.valor !== null && lead.valor !== undefined && ` · ${formatarValor(lead.valor)}`}
            </p>
          </div>
          <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>

        <dl className="comercial-dados">
          <div><dt>E-mail</dt><dd>{lead.email || '-'}</dd></div>
          <div><dt>Telefone</dt><dd>{lead.telefone || '-'}</dd></div>
          <div>
            <dt>Cursos</dt>
            <dd>{lead.cursos?.length ? lead.cursos.join(', ') : 'Ainda não abriu nenhum curso'}</dd>
          </div>
          <div>
            <dt>Ofertas</dt>
            <dd>
              {lead.aceitaMarketing
                ? 'Aceita receber ofertas'
                : 'Não aceitou ofertas: fale só sobre a compra que ficou parada, sem campanhas'}
            </dd>
          </div>
        </dl>

        <section className="comercial-mensagem" aria-label="Mensagem sugerida">
          <h3>Mensagem sugerida</h3>
          <p>{mensagem}</p>
          <div className="comercial-mensagem-acoes">
            {whatsapp && (
              <a className="admin-btn admin-btn-sm admin-btn-primary" href={whatsapp} target="_blank" rel="noreferrer">
                Abrir no WhatsApp
              </a>
            )}
            {email && (
              <a className="admin-btn admin-btn-sm admin-btn-secundario" href={email}>
                Enviar e-mail
              </a>
            )}
            <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={copiarMensagem}>
              {copiado ? 'Copiada!' : 'Copiar mensagem'}
            </button>
          </div>
        </section>

        <form onSubmit={enviar} className="comercial-form-contato">
          <h3>Registrar contato</h3>
          {erro && <div className="form-erro">{erro}</div>}
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="contato-canal">Canal</label>
              <select id="contato-canal" name="canal" value={form.canal} onChange={mudar}>
                {CANAIS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.rotulo}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="contato-resultado">Como foi</label>
              <select id="contato-resultado" name="resultado" value={form.resultado} onChange={mudar}>
                <option value="">Escolha...</option>
                {RESULTADOS.map((r) => (
                  <option key={r.valor} value={r.valor}>{r.rotulo}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="contato-observacao">Observação (opcional)</label>
            <textarea
              id="contato-observacao"
              name="observacao"
              rows={2}
              maxLength={500}
              placeholder="Ex.: pediu para ligar depois das 18h"
              value={form.observacao}
              onChange={mudar}
            />
          </div>
          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'SALVANDO...' : 'REGISTRAR CONTATO'}
          </button>
        </form>

        <section aria-label="Histórico de contatos">
          <h3 className="comercial-subtitulo">Histórico</h3>
          {contatos === null && <p className="grafico-vazio">Carregando...</p>}
          {contatos?.length === 0 && <p className="grafico-vazio">Ninguém falou com esta pessoa ainda.</p>}
          {contatos?.length > 0 && (
            <ul className="comercial-historico">
              {contatos.map((c) => (
                <li key={c.idContato}>
                  <strong>{rotuloDoResultado(c.resultado)}</strong>
                  <span>
                    {rotuloDoCanal(c.canal)} · {formatarDataHora(c.quando)} · {c.funcionarioNome}
                  </span>
                  {c.observacao && <p>{c.observacao}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default ContatosDoLead;
