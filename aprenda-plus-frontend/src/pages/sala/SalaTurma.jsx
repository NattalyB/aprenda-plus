import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { estaLogado } from '../../services/authService';
import { abrirSala, concluirAula, desmarcarAula } from '../../services/salaService';
import { mostrarAviso } from '../../services/avisoService';
import BarraProgresso from '../../components/BarraProgresso';
import {
  agruparPorDisciplina,
  formatarDataCurta,
  formatarDataHora,
  tipoDaAula,
  urlDoPlayer,
} from '../../utils/salaDeAula';

// Primeira aula liberada que o aluno ainda não concluiu (ou a primeira de todas)
const aulaParaContinuar = (aulas) =>
  aulas.find((a) => a.liberada && !a.concluida) || aulas.find((a) => a.liberada) || aulas[0] || null;

// Quebra o texto do professor em parágrafos
const Paragrafos = ({ texto }) =>
  String(texto)
    .split(/\n{2,}|\n/)
    .filter((p) => p.trim())
    .map((p, i) => <p key={i}>{p}</p>);

function AulaAberta({ aula, anterior, proxima, salvando, onAlternar, onIr }) {
  const tipo = tipoDaAula(aula.tipo);
  const player = urlDoPlayer(aula.videoUrl);

  return (
    <article className="sala-aula" aria-labelledby="titulo-aula">
      <div className="sala-aula-topo">
        <span className="sala-aula-meta">
          Aula {aula.numero}
          {aula.disciplina && ` · ${aula.disciplina}`}
          {aula.duracaoMinutos ? ` · ${aula.duracaoMinutos} min` : ''}
        </span>
        <span className="sala-aula-tipo">
          <span aria-hidden="true">{tipo.icone}</span> {tipo.texto}
        </span>
      </div>
      <h2 id="titulo-aula">{aula.titulo}</h2>

      {!aula.liberada ? (
        <div className="sala-aula-bloqueada">
          <span aria-hidden="true">🔒</span>
          <p>
            Esta aula será liberada em <strong>{formatarDataCurta(aula.dataLiberacao)}</strong>.
          </p>
        </div>
      ) : (
        <>
          {player && (
            <div className="sala-video">
              <iframe
                src={player}
                title={`Vídeo da aula: ${aula.titulo}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {aula.conteudo && (
            <div className="sala-aula-texto">
              <Paragrafos texto={aula.conteudo} />
            </div>
          )}

          {aula.materialUrl && (
            <a className="sala-material" href={aula.materialUrl} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true">📎</span> Abrir material de apoio
            </a>
          )}

          {!player && !aula.conteudo && !aula.materialUrl && (
            <p className="sala-vazio">O professor ainda não adicionou o conteúdo desta aula.</p>
          )}
        </>
      )}

      <div className="sala-aula-rodape">
        <button
          type="button"
          className="admin-btn admin-btn-secundario"
          onClick={() => onIr(anterior)}
          disabled={!anterior}
        >
          ← Anterior
        </button>

        {aula.liberada && (
          <button
            type="button"
            className={aula.concluida ? 'sala-concluir feita' : 'sala-concluir'}
            onClick={() => onAlternar(aula)}
            disabled={salvando}
            aria-pressed={aula.concluida}
          >
            {aula.concluida ? '✅ Aula concluída' : '✓ Marcar como concluída'}
          </button>
        )}

        <button
          type="button"
          className="admin-btn admin-btn-secundario"
          onClick={() => onIr(proxima)}
          disabled={!proxima}
        >
          Próxima →
        </button>
      </div>
      {aula.concluida && <p className="sala-dica">Clique de novo se quiser desmarcar.</p>}
    </article>
  );
}

// Sala de aula de uma turma: aulas, mural de avisos e certificado
function SalaTurma() {
  const { idTurma } = useParams();
  const navigate = useNavigate();
  const logado = estaLogado();
  const [sala, setSala] = useState(null);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState('aulas');
  const [idAberta, setIdAberta] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!logado) return;
    abrirSala(idTurma)
      .then((dados) => {
        setSala(dados);
        setIdAberta(aulaParaContinuar(dados.aulas || [])?.idAula ?? null);
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível abrir a sala de aula.'));
  }, [idTurma, logado]);

  if (!logado) {
    return (
      <div className="carrinho-page">
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🔒</span>
          <h2>Faça login para entrar na sala de aula</h2>
          <div className="carrinho-estado-botoes">
            <Link to="/login" className="admin-btn admin-btn-primary">Entrar</Link>
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="carrinho-page">
        <div className="form-erro">{erro}</div>
        <Link to="/sala" className="admin-btn admin-btn-secundario">← Minhas turmas</Link>
      </div>
    );
  }

  if (!sala) {
    return (
      <div className="carrinho-page">
        <p className="carrinho-carregando">Abrindo a sala de aula...</p>
      </div>
    );
  }

  const aulas = sala.aulas || [];
  const avisos = sala.avisos || [];
  const posicao = aulas.findIndex((a) => a.idAula === idAberta);
  const aberta = posicao >= 0 ? aulas[posicao] : null;
  const anterior = posicao > 0 ? aulas[posicao - 1] : null;
  const proxima = posicao >= 0 && posicao < aulas.length - 1 ? aulas[posicao + 1] : null;
  const terminou = sala.totalAulas > 0 && sala.concluidas === sala.totalAulas;

  const alternar = (aula) => {
    setSalvando(true);
    const acao = aula.concluida ? desmarcarAula(aula.idAula) : concluirAula(aula.idAula);
    acao
      .then((atualizada) => {
        setSala(atualizada);
        if (!aula.concluida) {
          const completa = atualizada.totalAulas > 0 && atualizada.concluidas === atualizada.totalAulas;
          mostrarAviso(
            completa ? 'Parabéns, você concluiu todas as aulas! Seu certificado já pode ser emitido. 🎓' : 'Aula concluída! 🎉',
            'sucesso'
          );
        }
      })
      .catch((error) => mostrarAviso(error.response?.data?.mensagem || 'Não foi possível salvar. Tente novamente.', 'erro'))
      .finally(() => setSalvando(false));
  };

  const ir = (aula) => {
    if (!aula) return;
    setIdAberta(aula.idAula);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="sala-page">
      <Link to="/sala" className="sala-voltar">← Minhas turmas</Link>

      <header className="sala-cabecalho">
        <div>
          <h1>{sala.curso || sala.turma}</h1>
          <p>
            {[sala.turma, sala.professor && `Prof. ${sala.professor}`, sala.modalidade, sala.diasHorarios]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="sala-progresso">
          <strong>{sala.percentual}%</strong>
          <span>
            {sala.concluidas} de {sala.totalAulas} {sala.totalAulas === 1 ? 'aula concluída' : 'aulas concluídas'}
          </span>
          <BarraProgresso percentual={sala.percentual} />
        </div>
      </header>

      <div className="sala-abas" role="tablist" aria-label="Seções da sala de aula">
        {[
          ['aulas', `📚 Aulas (${aulas.length})`],
          ['mural', `📌 Mural${avisos.length ? ` (${avisos.length})` : ''}`],
          ['certificado', terminou ? '🎓 Certificado ✨' : '🎓 Certificado'],
        ].map(([chave, texto]) => (
          <button
            key={chave}
            type="button"
            role="tab"
            aria-selected={aba === chave}
            className={aba === chave ? 'sala-aba ativa' : 'sala-aba'}
            onClick={() => setAba(chave)}
          >
            {texto}
          </button>
        ))}
      </div>

      {aba === 'aulas' &&
        (aulas.length === 0 ? (
          <div className="sala-vazia">
            <span aria-hidden="true">🛠️</span>
            <p>O professor está preparando as aulas desta turma. Volte em breve!</p>
          </div>
        ) : (
          <div className="sala-layout">
            <nav className="sala-indice" aria-label="Aulas da turma">
              {agruparPorDisciplina(aulas).map((grupo) => (
                <div key={grupo.nome} className="sala-indice-grupo">
                  <h3>{grupo.nome}</h3>
                  <ol>
                    {grupo.aulas.map((aula) => {
                      let icone = '○';
                      let situacao = 'não concluída';
                      if (aula.concluida) {
                        icone = '✅';
                        situacao = 'concluída';
                      } else if (!aula.liberada) {
                        icone = '🔒';
                        situacao = `libera em ${formatarDataCurta(aula.dataLiberacao)}`;
                      }
                      return (
                        <li key={aula.idAula}>
                          <button
                            type="button"
                            className={aula.idAula === idAberta ? 'sala-indice-item ativo' : 'sala-indice-item'}
                            onClick={() => ir(aula)}
                            aria-current={aula.idAula === idAberta ? 'true' : undefined}
                            aria-label={`Aula ${aula.numero}: ${aula.titulo} (${situacao})`}
                          >
                            <span className="sala-indice-icone" aria-hidden="true">{icone}</span>
                            <span className="sala-indice-texto">
                              <span>{aula.numero}. {aula.titulo}</span>
                              {!aula.liberada && <small>Libera em {formatarDataCurta(aula.dataLiberacao)}</small>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </nav>

            {aberta && (
              <AulaAberta
                aula={aberta}
                anterior={anterior}
                proxima={proxima}
                salvando={salvando}
                onAlternar={alternar}
                onIr={ir}
              />
            )}
          </div>
        ))}

      {aba === 'mural' && (
        <section className="sala-mural" aria-label="Mural de avisos">
          {avisos.length === 0 ? (
            <p className="sala-vazio">Nenhum aviso por enquanto.</p>
          ) : (
            avisos.map((aviso) => (
              <article key={aviso.idAviso} className={aviso.fixado ? 'sala-aviso fixado' : 'sala-aviso'}>
                <h3>
                  {aviso.fixado && <span aria-label="Aviso fixado">📌 </span>}
                  {aviso.titulo}
                </h3>
                <div className="sala-aviso-texto">
                  <Paragrafos texto={aviso.mensagem} />
                </div>
                <p className="sala-aviso-autor">
                  {[aviso.autor, formatarDataHora(aviso.criadoEm)].filter(Boolean).join(' · ')}
                </p>
              </article>
            ))
          )}
        </section>
      )}

      {aba === 'certificado' && (
        <section className="sala-certificado" aria-label="Certificado">
          {sala.certificado || terminou ? (
            <>
              <span className="sala-certificado-icone" aria-hidden="true">🎓</span>
              <h2>{sala.certificado ? 'Seu certificado está pronto' : 'Parabéns, você concluiu o curso!'}</h2>
              <p>
                O certificado traz um código de verificação: qualquer pessoa pode conferir se ele é verdadeiro no site
                do AprendaPlus.
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => navigate(`/sala/${idTurma}/certificado`)}
              >
                {sala.certificado ? 'Ver certificado' : 'Emitir certificado'}
              </button>
            </>
          ) : (
            <>
              <span className="sala-certificado-icone" aria-hidden="true">🔒</span>
              <h2>Conclua todas as aulas para liberar o certificado</h2>
              <p>
                {sala.totalAulas === 0
                  ? 'As aulas ainda estão sendo preparadas.'
                  : `Faltam ${sala.totalAulas - sala.concluidas} de ${sala.totalAulas} aulas.`}
              </p>
              <BarraProgresso percentual={sala.percentual} />
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default SalaTurma;
