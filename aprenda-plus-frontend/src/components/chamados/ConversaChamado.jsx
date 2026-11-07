import { useState } from 'react';
import VisualizarDocumento from '../VisualizarDocumento';
import CampoAnexo from './CampoAnexo';
import {
  PRIORIDADES,
  SITUACOES,
  classeSituacao,
  dataHora,
  encerrado,
  erroDoAnexo,
  rotuloCategoria,
  rotuloPrioridade,
  rotuloSituacao,
  tamanhoLegivel,
} from '../../utils/chamados';

// Conversa de um chamado.
// modo "solicitante": quem abriu responde e pode fechar o chamado.
// modo "suporte": quem atende responde, muda situação e prioridade e assume o chamado.
// acoes: { escrever(texto, anexo, status), fechar(), atualizar(mudancas), baixarAnexo(idMensagem) }
function ConversaChamado({ chamado, modo, acoes, meuId, onAtualizado }) {
  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState(null);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [vendo, setVendo] = useState(null);

  const suporte = modo === 'suporte';
  const fechado = encerrado(chamado);

  const executar = (promessa, mensagem) => {
    setEnviando(true);
    setErro(null);
    setSucesso(null);
    return promessa
      .then((atualizado) => {
        setSucesso(mensagem);
        onAtualizado(atualizado);
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível concluir. Tente de novo.'))
      .finally(() => setEnviando(false));
  };

  const enviar = (status) => (e) => {
    e?.preventDefault();
    if (!texto.trim()) return setErro(suporte ? 'Escreva a resposta.' : 'Escreva a mensagem.');
    const problemaDoAnexo = erroDoAnexo(anexo);
    if (problemaDoAnexo) return setErro(problemaDoAnexo);
    return executar(acoes.escrever(texto, anexo, status), status === 'resolvido'
      ? 'Resposta enviada e chamado marcado como resolvido.'
      : 'Mensagem enviada.').then(() => {
      setTexto('');
      setAnexo(null);
    });
  };

  const mudar = (mudancas, mensagem) => executar(acoes.atualizar(mudancas), mensagem);

  return (
    <div className="chamado-conversa">
      <div className="admin-card chamado-cabecalho">
        <div className="chamado-cabecalho-topo">
          <h2>
            <span className="chamado-numero">#{chamado.idChamado}</span> {chamado.assunto}
          </h2>
          <span className={`chamado-situacao chamado-situacao-${classeSituacao(chamado.status)}`}>
            {rotuloSituacao(chamado.status)}
          </span>
        </div>
        <dl className="chamado-dados">
          <div><dt>Categoria</dt><dd>{rotuloCategoria(chamado.categoria)}</dd></div>
          <div><dt>Prioridade</dt><dd className={`chamado-prioridade-${chamado.prioridade}`}>{rotuloPrioridade(chamado.prioridade)}</dd></div>
          {chamado.tela && <div><dt>Tela</dt><dd>{chamado.tela}</dd></div>}
          {suporte && (
            <div>
              <dt>Aberto por</dt>
              <dd>
                {chamado.nomeSolicitante} ({chamado.tipoSolicitante === 'professor' ? 'professor' : 'equipe'})
                {chamado.emailSolicitante && <span className="chamado-email"> · {chamado.emailSolicitante}</span>}
              </dd>
            </div>
          )}
          <div><dt>Responsável</dt><dd>{chamado.responsavelNome || 'Ainda ninguém'}</dd></div>
          <div><dt>Aberto em</dt><dd>{dataHora(chamado.criadoEm)}</dd></div>
          {chamado.resolvidoEm && <div><dt>Resolvido em</dt><dd>{dataHora(chamado.resolvidoEm)}</dd></div>}
        </dl>

        {suporte && (
          <div className="chamado-atendimento">
            <div className="form-field">
              <label htmlFor="chamado-mudar-situacao">Situação</label>
              <select id="chamado-mudar-situacao" value={chamado.status} disabled={enviando}
                onChange={(e) => mudar({ status: e.target.value }, 'Situação atualizada.')}>
                {SITUACOES.map((s) => <option key={s.chave} value={s.chave}>{s.rotulo}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="chamado-mudar-prioridade">Prioridade</label>
              <select id="chamado-mudar-prioridade" value={chamado.prioridade} disabled={enviando}
                onChange={(e) => mudar({ prioridade: e.target.value }, 'Prioridade atualizada.')}>
                {PRIORIDADES.map((p) => <option key={p.chave} value={p.chave}>{p.rotulo}</option>)}
              </select>
            </div>
            {chamado.responsavelId === meuId ? (
              <button type="button" className="admin-btn admin-btn-secundario" disabled={enviando}
                onClick={() => mudar({ responsavelId: 0 }, 'Você deixou de ser o responsável.')}>
                Deixar de ser o responsável
              </button>
            ) : (
              <button type="button" className="admin-btn admin-btn-primary" disabled={enviando}
                onClick={() => mudar({ responsavelId: meuId }, 'Agora você é o responsável por este chamado.')}>
                Assumir o chamado
              </button>
            )}
          </div>
        )}
      </div>

      {erro && <div className="form-erro" role="alert">{erro}</div>}
      {sucesso && <div className="form-sucesso" role="status">{sucesso}</div>}

      <ol className="chamado-mensagens" aria-label="Conversa do chamado">
        {(chamado.mensagens || []).map((m, i) => (
          <li key={m.idMensagem} className={`chamado-mensagem chamado-mensagem-${m.autorTipo}`}>
            <div className="chamado-mensagem-topo">
              <strong>{m.autorTipo === 'suporte' ? `🎧 ${m.autorNome} (suporte)` : m.autorNome}</strong>
              <span>{i === 0 ? 'abriu o chamado · ' : ''}{dataHora(m.criadoEm)}</span>
            </div>
            <p className="chamado-mensagem-texto">{m.texto}</p>
            {m.anexoNome && (
              <button type="button" className="chamado-anexo" onClick={() => setVendo(m)}>
                📎 {m.anexoNome} {m.anexoTamanho ? `(${tamanhoLegivel(m.anexoTamanho)})` : ''}
              </button>
            )}
          </li>
        ))}
      </ol>

      {fechado && !suporte ? (
        <div className="admin-card chamado-encerrado">
          🔒 Este chamado foi fechado. Se o problema voltou, abra um novo chamado.
        </div>
      ) : (
        <form className="admin-card chamado-resposta" onSubmit={enviar(undefined)} noValidate>
          <div className="form-field">
            <label htmlFor="chamado-texto">{suporte ? 'Responder' : 'Escrever no chamado'}</label>
            <textarea id="chamado-texto" rows={4} maxLength={5000} value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={suporte ? 'Explique a solução ou peça mais detalhes...' : 'Mais detalhes, ou responda o suporte...'} />
          </div>
          <CampoAnexo id="chamado-resposta-anexo" arquivo={anexo} onMudar={setAnexo} />
          <div className="chamado-form-acoes">
            {!suporte && (
              <button type="button" className="admin-btn admin-btn-secundario" disabled={enviando}
                onClick={() => executar(acoes.fechar(), 'Chamado fechado. Obrigado!')}>
                ✓ Problema resolvido, fechar chamado
              </button>
            )}
            {suporte && chamado.status !== 'resolvido' && (
              <button type="button" className="admin-btn admin-btn-secundario" disabled={enviando} onClick={enviar('resolvido')}>
                Responder e marcar como resolvido
              </button>
            )}
            <button type="submit" className="admin-btn admin-btn-primary" disabled={enviando}>
              {enviando ? 'Enviando...' : suporte ? 'Responder' : 'Enviar mensagem'}
            </button>
          </div>
          {suporte && <p className="chamado-form-dica">Quem abriu o chamado recebe a resposta por e-mail.</p>}
        </form>
      )}

      {vendo && (
        <VisualizarDocumento
          documento={{ idDocumento: vendo.idMensagem, contentType: vendo.anexoTipo, nomeArquivo: vendo.anexoNome }}
          carregar={acoes.baixarAnexo}
          onFechar={() => setVendo(null)}
        />
      )}
    </div>
  );
}

export default ConversaChamado;
