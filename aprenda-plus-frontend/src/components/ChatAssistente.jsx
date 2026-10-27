import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { enviarPergunta } from '../services/chatService';
import { listarCursos } from '../services/cursoService';
import CursoModal from './CursoModal';
import { linkEmail, linkWhatsapp, numeroWhatsapp } from '../utils/contato';

// Assistente virtual do site (balão no canto da tela), com IA.
// A conversa fica guardada na aba do navegador enquanto a pessoa navega pelo site.

const CHAVE_CONVERSA = 'conversaAssistente';
const MAX_HISTORICO = 10;

const RESPOSTA_ATENDENTE =
  'Claro! Você pode falar com a nossa equipe pelos botões abaixo. Se quiser, conte rapidinho a sua dúvida na mensagem que a gente já responde com tudo. 😊';

const SUGESTOES = [
  'Me ajuda a escolher um curso',
  'Quais cursos são EAD?',
  'Como funciona o pagamento?',
  'Os cursos têm certificado?',
];

const BOAS_VINDAS = {
  autor: 'assistente',
  texto:
    'Olá! 👋 Sou o assistente virtual do AprendaPlus. Posso te ajudar a escolher um curso, ver preços e turmas ou explicar como fazer a inscrição. Como posso ajudar?',
  inicial: true,
};

const lerConversa = () => {
  try {
    const salva = JSON.parse(sessionStorage.getItem(CHAVE_CONVERSA) || 'null');
    return Array.isArray(salva) && salva.length > 0 ? salva : [BOAS_VINDAS];
  } catch {
    return [BOAS_VINDAS];
  }
};

const salvarConversa = (mensagens) => {
  try {
    sessionStorage.setItem(CHAVE_CONVERSA, JSON.stringify(mensagens));
  } catch {
    // navegador sem armazenamento (aba anônima, por exemplo): a conversa só não fica guardada
  }
};

// **negrito** dentro de uma linha
const comNegrito = (linha) =>
  linha.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') && parte.length > 4 ? (
      <strong key={i}>{parte.slice(2, -2)}</strong>
    ) : (
      parte
    )
  );

// Texto simples da IA: parágrafos, listas com "-" ou "*" e **negrito** (sem HTML)
export function TextoFormatado({ texto }) {
  const blocos = [];
  (texto || '').split('\n').forEach((bruta) => {
    const linha = bruta.trim();
    if (!linha) return;
    const item = linha.match(/^[-*•]\s+(.*)$/);
    if (item) {
      const ultimo = blocos[blocos.length - 1];
      if (ultimo?.tipo === 'lista') ultimo.itens.push(item[1]);
      else blocos.push({ tipo: 'lista', itens: [item[1]] });
    } else {
      blocos.push({ tipo: 'paragrafo', texto: linha });
    }
  });
  return blocos.map((b, i) =>
    b.tipo === 'lista' ? (
      <ul key={i}>
        {b.itens.map((t, j) => (
          <li key={j}>{comNegrito(t)}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>{comNegrito(b.texto)}</p>
    )
  );
}

function ChatAssistente() {
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState(lerConversa);
  const [digitado, setDigitado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cursos, setCursos] = useState(null);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const fimRef = useRef(null);
  const campoRef = useRef(null);

  // Carrega os cursos na primeira vez que o chat abre (para os botões "Ver curso")
  useEffect(() => {
    if (!aberto || cursos !== null) return;
    listarCursos()
      .then((r) => setCursos(r.data || []))
      .catch(() => setCursos([]));
  }, [aberto, cursos]);

  useEffect(() => {
    salvarConversa(mensagens);
  }, [mensagens]);

  useEffect(() => {
    if (!aberto) return;
    fimRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [aberto, mensagens, enviando]);

  useEffect(() => {
    if (aberto) campoRef.current?.focus();
  }, [aberto]);

  // Na sala de aula o balão atrapalharia os vídeos
  if (location.pathname.startsWith('/sala') || location.pathname.startsWith('/professor')) return null;

  const enviar = (texto) => {
    const pergunta = (texto || '').trim();
    if (!pergunta || enviando) return;

    const historico = mensagens
      .filter((m) => !m.inicial && !m.erro)
      .slice(-MAX_HISTORICO)
      .map(({ autor, texto: t }) => ({ autor, texto: t }));

    setMensagens((atual) => [...atual, { autor: 'aluno', texto: pergunta }]);
    setDigitado('');
    setEnviando(true);

    enviarPergunta(pergunta, historico)
      .then((resposta) => {
        setMensagens((atual) => [
          ...atual,
          { autor: 'assistente', texto: resposta.resposta, cursos: resposta.cursos || [], atendente: Boolean(resposta.atendente) },
        ]);
      })
      .catch((error) => {
        setMensagens((atual) => [
          ...atual,
          {
            autor: 'assistente',
            erro: true,
            texto:
              error.response?.data?.mensagem ||
              'Não consegui responder agora. 😕 Verifique sua conexão e tente de novo em instantes.',
          },
        ]);
      })
      .finally(() => {
        setEnviando(false);
        campoRef.current?.focus();
      });
  };

  // Botão fixo "Falar com atendente": responde na hora, sem passar pela IA
  const falarComAtendente = () => {
    if (enviando) return;
    setMensagens((atual) => [
      ...atual,
      { autor: 'aluno', texto: 'Quero falar com um atendente' },
      { autor: 'assistente', texto: RESPOSTA_ATENDENTE, atendente: true },
    ]);
  };

  const recomecar = () => {
    setMensagens([BOAS_VINDAS]);
    setDigitado('');
  };

  const cursoPorId = (id) => (cursos || []).find((c) => c.idCurso === id);
  const whatsapp = numeroWhatsapp();
  const soBoasVindas = mensagens.length === 1 && mensagens[0].inicial;

  return (
    <>
      {aberto && (
        <section
          className="chat-painel"
          role="dialog"
          aria-label="Assistente virtual"
          onKeyDown={(e) => e.key === 'Escape' && setAberto(false)}
        >
          <header className="chat-topo">
            <span className="chat-avatar" aria-hidden="true">🤖</span>
            <div className="chat-topo-texto">
              <strong>Assistente AprendaPlus</strong>
              <span>
                <span className="chat-selo-ia">IA</span> Tira dúvidas sobre os cursos
              </span>
            </div>
            {!soBoasVindas && (
              <button type="button" className="chat-topo-btn" onClick={recomecar} title="Nova conversa" aria-label="Nova conversa">
                ↺
              </button>
            )}
            <button type="button" className="chat-topo-btn" onClick={() => setAberto(false)} aria-label="Fechar o assistente">
              ×
            </button>
          </header>

          <div className="chat-mensagens" aria-live="polite">
            {mensagens.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.autor}${m.erro ? ' chat-msg-erro' : ''}`}>
                <div className="chat-balao">
                  <TextoFormatado texto={m.texto} />
                </div>
                {m.cursos?.length > 0 && (
                  <div className="chat-cursos">
                    {m.cursos.map((id) => {
                      const curso = cursoPorId(id);
                      return curso ? (
                        <button key={id} type="button" className="chat-curso-btn" onClick={() => setCursoSelecionado(curso)}>
                          📘 Ver {curso.nome}
                        </button>
                      ) : null;
                    })}
                  </div>
                )}
                {m.atendente && (
                  <div className="chat-cursos">
                    {whatsapp && (
                      <a className="chat-contato-btn chat-contato-whats" href={linkWhatsapp(whatsapp, mensagens.slice(0, i))} target="_blank" rel="noopener noreferrer">
                        💬 Chamar no WhatsApp
                      </a>
                    )}
                    <a className="chat-contato-btn" href={linkEmail(mensagens.slice(0, i))} target="_blank" rel="noopener noreferrer">
                      ✉️ Enviar e-mail
                    </a>
                  </div>
                )}
              </div>
            ))}

            {soBoasVindas && (
              <div className="chat-sugestoes">
                {SUGESTOES.map((s) => (
                  <button key={s} type="button" onClick={() => enviar(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {enviando && (
              <div className="chat-msg chat-msg-assistente">
                <div className="chat-balao chat-digitando" aria-label="O assistente está digitando">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(digitado);
            }}
          >
            <input
              ref={campoRef}
              type="text"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              placeholder="Escreva sua dúvida..."
              maxLength={500}
              aria-label="Sua mensagem"
              disabled={enviando}
            />
            <button type="submit" disabled={enviando || !digitado.trim()} aria-label="Enviar mensagem">
              ➤
            </button>
          </form>
          <div className="chat-rodape">
            <button type="button" className="chat-atendente-btn" onClick={falarComAtendente} disabled={enviando}>
              👤 Falar com atendente
            </button>
            <span>Respostas geradas por IA. Confira os detalhes na página do curso.</span>
          </div>
        </section>
      )}

      <button
        type="button"
        className={aberto ? 'chat-bolha aberta' : 'chat-bolha'}
        onClick={() => setAberto((a) => !a)}
        aria-label={aberto ? 'Minimizar o assistente' : 'Abrir o assistente virtual'}
        aria-expanded={aberto}
      >
        {aberto ? '×' : '💬'}
        {!aberto && <span className="chat-bolha-texto">Dúvidas? Fale comigo</span>}
      </button>

      <CursoModal curso={cursoSelecionado} onClose={() => setCursoSelecionado(null)} />
    </>
  );
}

export default ChatAssistente;
