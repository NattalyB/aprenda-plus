import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarTurmas } from '../../services/turmaService';
import { listarProfessores } from '../../services/professorService';
import { listarDisciplinas } from '../../services/disciplinaService';
import {
  resumoDasSalas,
  buscarSalaDaTurma,
  definirProfessorDaSala,
  criarAulaEad,
  atualizarAulaEad,
  excluirAulaEad,
  moverAulaEad,
  copiarAulasDaTurma,
  publicarAvisoEad,
  excluirAvisoEad,
} from '../../services/conteudoEadService';
import FormAula from '../../components/admin/sala/FormAula';
import MuralDaTurma from '../../components/admin/sala/MuralDaTurma';
import AndamentoDaTurma from '../../components/admin/sala/AndamentoDaTurma';
import { formatarDataCurta, tipoDaAula } from '../../utils/salaDeAula';

const hoje = () => new Date().toISOString().slice(0, 10);

// Painel: monta a sala de aula EAD de cada turma
function AdminSalaDeAula() {
  const [parametros, setParametros] = useSearchParams();
  const idTurma = parametros.get('turma') || '';

  const [turmas, setTurmas] = useState(null);
  const [resumo, setResumo] = useState({});
  const [professores, setProfessores] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [sala, setSala] = useState(null);
  const [carregandoSala, setCarregandoSala] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [aba, setAba] = useState('aulas');
  const [professorEscolhido, setProfessorEscolhido] = useState('');
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova; aula = editar
  const [origemCopia, setOrigemCopia] = useState('');

  // Dados de apoio (cada um é opcional: se falhar, a tela continua)
  useEffect(() => {
    listarTurmas()
      .then((r) => setTurmas(r.data || []))
      .catch(() => {
        setTurmas([]);
        setErro('Não foi possível carregar as turmas.');
      });
    resumoDasSalas().then((r) => setResumo(r || {})).catch(() => setResumo({}));
    listarProfessores()
      .then((r) => setProfessores((r.data || []).filter((p) => !p.status || p.status === 'ativo')))
      .catch(() => setProfessores([]));
    listarDisciplinas().then((r) => setDisciplinas(r.data || [])).catch(() => setDisciplinas([]));
  }, []);

  const aplicarSala = useCallback((dados) => {
    setSala(dados);
    setProfessorEscolhido(dados?.idProfessor ? String(dados.idProfessor) : '');
    setResumo((atual) => ({ ...atual, [dados.idTurma]: dados.aulas.length }));
  }, []);

  useEffect(() => {
    setSala(null);
    setSucesso(null);
    setErro(null);
    setAba('aulas');
    if (!idTurma) return;
    setCarregandoSala(true);
    buscarSalaDaTurma(idTurma)
      .then(aplicarSala)
      .catch(() => setErro('Não foi possível carregar a sala de aula desta turma.'))
      .finally(() => setCarregandoSala(false));
  }, [idTurma, aplicarSala]);

  // Executa uma alteração que devolve a sala inteira atualizada
  const executar = (promessa, mensagem) =>
    promessa.then((dados) => {
      aplicarSala(dados);
      setErro(null);
      setSucesso(mensagem);
      return dados;
    });

  const comErro = (texto) => (error) => {
    setSucesso(null);
    setErro(error.response?.data?.mensagem || texto);
  };

  const escolherTurma = (valor) => {
    setParametros(valor ? { turma: valor } : {});
  };

  const salvarProfessor = () => {
    if (!professorEscolhido) {
      setErro('Escolha o professor responsável.');
      return;
    }
    const criando = !sala?.idPlano;
    executar(
      definirProfessorDaSala(idTurma, Number(professorEscolhido)),
      criando ? 'Sala de aula criada! Agora cadastre as aulas.' : 'Professor responsável atualizado.'
    ).catch(comErro('Não foi possível salvar o professor.'));
  };

  const salvarAula = (dados) => {
    const nova = !editando?.idAula;
    const promessa = nova ? criarAulaEad(idTurma, dados) : atualizarAulaEad(editando.idAula, dados);
    return executar(promessa, nova ? 'Aula cadastrada.' : 'Aula atualizada.').then(() => setEditando(null));
  };

  const excluirAula = (aula) => {
    if (!window.confirm(`Excluir a aula "${aula.titulo}"? O progresso dos alunos nela também será apagado.`)) return;
    executar(excluirAulaEad(aula.idAula), 'Aula excluída.').catch(comErro('Não foi possível excluir a aula.'));
  };

  const mover = (aula, direcao) => {
    executar(moverAulaEad(aula.idAula, direcao), null).catch(comErro('Não foi possível mudar a ordem.'));
  };

  const copiar = () => {
    if (!origemCopia) return;
    copiarAulasDaTurma(idTurma, Number(origemCopia))
      .then((resposta) => {
        aplicarSala(resposta.plano);
        setErro(null);
        setSucesso(`${resposta.copiadas} ${resposta.copiadas === 1 ? 'aula copiada' : 'aulas copiadas'}. Confira as datas de liberação.`);
        setOrigemCopia('');
      })
      .catch(comErro('Não foi possível copiar as aulas.'));
  };

  const publicarAviso = (aviso) => executar(publicarAvisoEad(idTurma, aviso), aviso.enviarEmail
    ? 'Aviso publicado e enviado por e-mail aos alunos.'
    : 'Aviso publicado no mural.');

  const excluirAviso = (aviso) => {
    if (!window.confirm(`Excluir o aviso "${aviso.titulo}"?`)) return;
    executar(excluirAvisoEad(aviso.idAviso), 'Aviso excluído.').catch(comErro('Não foi possível excluir o aviso.'));
  };

  if (!turmas) return <p>Carregando...</p>;

  const turmaAtual = turmas.find((t) => String(t.idTurma) === idTurma);
  const idCurso = sala?.idCurso ?? turmaAtual?.curso?.idCurso;
  const disciplinasDoCurso = disciplinas.filter(
    (d) => !idCurso || (d.cursos || []).some((c) => c.idCurso === idCurso)
  );
  const outrasTurmas = turmas.filter((t) => String(t.idTurma) !== idTurma && resumo[t.idTurma] > 0);
  const aulas = sala?.aulas || [];
  const avisos = sala?.avisos || [];

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Sala de aula (EAD)</h1>
          <p className="admin-subtitulo">
            Monte as aulas de cada turma com vídeos do YouTube, textos e materiais, publique avisos e acompanhe o
            progresso dos alunos.
          </p>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

      <div className="admin-filtros">
        <label htmlFor="turma" className="ead-rotulo">Turma</label>
        <select
          id="turma"
          name="turma"
          className="admin-filtro-select ead-seletor"
          value={idTurma}
          onChange={(e) => escolherTurma(e.target.value)}
        >
          <option value="">Escolha uma turma...</option>
          {turmas.map((t) => (
            <option key={t.idTurma} value={String(t.idTurma)}>
              {t.nome}
              {t.curso?.nome ? ` — ${t.curso.nome}` : ''}
              {resumo[t.idTurma] ? ` (${resumo[t.idTurma]} ${resumo[t.idTurma] === 1 ? 'aula' : 'aulas'})` : ''}
            </option>
          ))}
        </select>
      </div>

      {!idTurma && (
        <div className="admin-card ead-vazio">
          <span aria-hidden="true">🎬</span>
          <p>Escolha uma turma para montar a sala de aula dela.</p>
        </div>
      )}

      {idTurma && carregandoSala && <p>Carregando a sala de aula...</p>}

      {idTurma && sala && (
        <>
          <div className="admin-card ead-professor">
            <div className="form-field">
              <label htmlFor="professor">Professor responsável</label>
              <select id="professor" value={professorEscolhido} onChange={(e) => setProfessorEscolhido(e.target.value)}>
                <option value="">Escolha o professor...</option>
                {professores.map((p) => (
                  <option key={p.idProfessor} value={String(p.idProfessor)}>{p.nomeCompleto}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={salvarProfessor}
              disabled={sala.idPlano && String(sala.idProfessor) === professorEscolhido}
            >
              {sala.idPlano ? 'Salvar professor' : 'Criar sala de aula'}
            </button>
            {!sala.idPlano && (
              <p className="form-dica">
                {sala.professor
                  ? `Sugestão: ${sala.professor}, professor(a) desta turma.`
                  : 'A sala de aula da turma é criada assim que você escolher o professor.'}
              </p>
            )}
          </div>

          <div className="financeiro-abas" role="tablist">
            <button type="button" role="tab" aria-selected={aba === 'aulas'} onClick={() => setAba('aulas')}>
              📚 Aulas ({aulas.length})
            </button>
            <button type="button" role="tab" aria-selected={aba === 'mural'} onClick={() => setAba('mural')}>
              📌 Mural ({avisos.length})
            </button>
            <button type="button" role="tab" aria-selected={aba === 'andamento'} onClick={() => setAba('andamento')}>
              📈 Andamento
            </button>
          </div>

          {aba === 'aulas' && (
            <>
              <div className="ead-barra">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => setEditando({})}
                  disabled={!sala.idPlano}
                  title={sala.idPlano ? undefined : 'Escolha o professor primeiro'}
                >
                  + Nova aula
                </button>
                <div className="ead-copiar">
                  <label htmlFor="origem" className="ead-rotulo">Copiar aulas de</label>
                  <select id="origem" value={origemCopia} onChange={(e) => setOrigemCopia(e.target.value)} disabled={outrasTurmas.length === 0}>
                    <option value="">{outrasTurmas.length === 0 ? 'Nenhuma outra turma com aulas' : 'Escolha a turma...'}</option>
                    {outrasTurmas.map((t) => (
                      <option key={t.idTurma} value={String(t.idTurma)}>
                        {t.nome} ({resumo[t.idTurma]} {resumo[t.idTurma] === 1 ? 'aula' : 'aulas'})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="admin-btn admin-btn-secundario" onClick={copiar} disabled={!origemCopia}>
                    Copiar
                  </button>
                </div>
              </div>

              {aulas.length === 0 ? (
                <div className="admin-card ead-vazio">
                  <span aria-hidden="true">📭</span>
                  <p>
                    {sala.idPlano
                      ? 'Nenhuma aula ainda. Clique em "+ Nova aula" ou copie as aulas de outra turma.'
                      : 'Escolha o professor responsável para começar a montar as aulas.'}
                  </p>
                </div>
              ) : (
                <ol className="ead-aulas">
                  {aulas.map((aula, i) => {
                    const tipo = tipoDaAula(aula.tipo);
                    const futura = aula.dataLiberacao && aula.dataLiberacao > hoje();
                    return (
                      <li key={aula.idAula} className={aula.publicada ? 'ead-aula' : 'ead-aula rascunho'}>
                        <span className="ead-aula-numero">{aula.numero}</span>
                        <div className="ead-aula-info">
                          <strong>{aula.titulo}</strong>
                          <span className="ead-aula-selos">
                            <span>{tipo.icone} {tipo.texto}</span>
                            {aula.disciplina && <span>{aula.disciplina}</span>}
                            {aula.videoUrl && <span>▶ Vídeo</span>}
                            {aula.materialUrl && <span>📎 Material</span>}
                            {aula.duracaoMinutos ? <span>{aula.duracaoMinutos} min</span> : null}
                            {futura && <span className="ead-selo-data">🔒 Libera em {formatarDataCurta(aula.dataLiberacao)}</span>}
                            {!aula.publicada && <span className="ead-selo-rascunho">Rascunho</span>}
                          </span>
                        </div>
                        <div className="admin-acoes">
                          <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => mover(aula, 'cima')} disabled={i === 0} aria-label={`Subir a aula ${aula.titulo}`}>↑</button>
                          <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => mover(aula, 'baixo')} disabled={i === aulas.length - 1} aria-label={`Descer a aula ${aula.titulo}`}>↓</button>
                          <button type="button" className="admin-btn admin-btn-sm admin-btn-editar" onClick={() => setEditando(aula)}>Editar</button>
                          <button type="button" className="admin-btn admin-btn-sm admin-btn-excluir" onClick={() => excluirAula(aula)}>Excluir</button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}

          {aba === 'mural' && <MuralDaTurma avisos={avisos} onPublicar={publicarAviso} onExcluir={excluirAviso} />}

          {aba === 'andamento' && <AndamentoDaTurma idTurma={idTurma} />}
        </>
      )}

      {editando && (
        <FormAula
          aula={editando.idAula ? editando : null}
          disciplinas={disciplinasDoCurso}
          onSalvar={salvarAula}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

export default AdminSalaDeAula;
