import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  professorLogado,
  salaDaTurma,
  disciplinasDaTurma,
  andamentoDaMinhaTurma,
  criarAula,
  editarAula,
  excluirAula,
  moverAula,
  publicarAviso,
  editarAviso,
  excluirAviso,
} from '../../services/docenteService';
import FormAula from '../../components/admin/sala/FormAula';
import MuralDaTurma from '../../components/admin/sala/MuralDaTurma';
import AndamentoDaTurma from '../../components/admin/sala/AndamentoDaTurma';
import { formatarDataCurta, tipoDaAula } from '../../utils/salaDeAula';

const hoje = () => new Date().toISOString().slice(0, 10);

// Portal do Professor: uma turma (aulas, mural e andamento dos alunos)
function TurmaProfessor() {
  const { idTurma } = useParams();
  const logado = professorLogado();
  const [sala, setSala] = useState(null);
  const [disciplinas, setDisciplinas] = useState([]);
  const [aba, setAba] = useState('andamento');
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova; aula = editar
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  useEffect(() => {
    if (!logado) return;
    salaDaTurma(idTurma)
      .then(setSala)
      .catch((error) =>
        setErro(
          error.response?.status === 403
            ? 'Esta turma não é sua.'
            : error.response?.data?.mensagem || 'Não foi possível carregar a turma.'
        )
      );
    disciplinasDaTurma(idTurma)
      .then((lista) => setDisciplinas(lista || []))
      .catch(() => setDisciplinas([]));
  }, [idTurma, logado]);

  // Cada alteração devolve a sala inteira atualizada
  const executar = useCallback(
    (promessa, mensagem) =>
      promessa.then((dados) => {
        setSala(dados);
        setErro(null);
        setSucesso(mensagem);
        return dados;
      }),
    []
  );

  const comErro = (texto) => (error) => {
    setSucesso(null);
    setErro(error.response?.data?.mensagem || texto);
  };

  if (!logado) return <Navigate to="/login?perfil=professor" replace />;

  const voltar = (
    <Link to="/professor" className="portal-prof-voltar">
      ← Minhas turmas
    </Link>
  );

  if (!sala) {
    return (
      <main className="portal-prof">
        {voltar}
        {erro ? <div className="form-erro">{erro}</div> : <p>Carregando turma...</p>}
      </main>
    );
  }

  const aulas = sala.aulas || [];
  const avisos = sala.avisos || [];
  const temSala = Boolean(sala.idPlano);

  const salvarAula = (dados) => {
    const nova = !editando?.idAula;
    const promessa = nova ? criarAula(idTurma, dados) : editarAula(editando.idAula, dados);
    return executar(promessa, nova ? 'Aula cadastrada.' : 'Aula atualizada.').then(() => setEditando(null));
  };

  const apagarAula = (aula) => {
    if (!window.confirm(`Excluir a aula "${aula.titulo}"? O progresso dos alunos nela também será apagado.`)) return;
    executar(excluirAula(aula.idAula), 'Aula excluída.').catch(comErro('Não foi possível excluir a aula.'));
  };

  const mover = (aula, direcao) => {
    executar(moverAula(aula.idAula, direcao), null).catch(comErro('Não foi possível mudar a ordem.'));
  };

  const ABAS = [
    { chave: 'andamento', texto: '📈 Andamento' },
    { chave: 'aulas', texto: `📚 Aulas (${aulas.length})` },
    { chave: 'mural', texto: `📌 Mural (${avisos.length})` },
  ];

  return (
    <main className="portal-prof">
      {voltar}
      <div className="portal-prof-topo">
        <div>
          <span className="portal-prof-selo">👩‍🏫 Portal do Professor</span>
          <h1>{sala.turma}</h1>
          <p>{sala.curso}{sala.professor ? ` · Responsável pela sala: ${sala.professor}` : ''}</p>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && <div className="form-sucesso">{sucesso}</div>}

      <div className="financeiro-abas" role="tablist">
        {ABAS.map((a) => (
          <button key={a.chave} type="button" role="tab" aria-selected={aba === a.chave} onClick={() => setAba(a.chave)}>
            {a.texto}
          </button>
        ))}
      </div>

      {aba === 'andamento' && <AndamentoDaTurma idTurma={idTurma} carregar={andamentoDaMinhaTurma} />}

      {aba === 'aulas' &&
        (!temSala ? (
          <div className="admin-card ead-vazio">
            <span aria-hidden="true">📭</span>
            <p>A sala de aula desta turma ainda não foi criada. Peça à secretaria para definir o professor responsável.</p>
          </div>
        ) : (
          <>
            <div className="portal-prof-acoes">
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditando({})}>
                + Nova aula
              </button>
            </div>
            {aulas.length === 0 ? (
              <div className="admin-card ead-vazio">
                <span aria-hidden="true">📭</span>
                <p>Nenhuma aula ainda. Clique em "+ Nova aula" para começar.</p>
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
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-excluir" onClick={() => apagarAula(aula)}>Excluir</button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        ))}

      {aba === 'mural' && (
        <MuralDaTurma
          avisos={avisos}
          onPublicar={(aviso) =>
            executar(
              publicarAviso(idTurma, aviso),
              aviso.enviarEmail ? 'Aviso publicado e enviado por e-mail aos alunos.' : 'Aviso publicado no mural.'
            )
          }
          onEditar={(aviso, dados) =>
            executar(editarAviso(aviso.idAviso, { titulo: dados.titulo, mensagem: dados.mensagem, fixado: dados.fixado }), 'Aviso atualizado.')
          }
          onExcluir={(aviso) => {
            if (!window.confirm(`Excluir o aviso "${aviso.titulo}"?`)) return;
            executar(excluirAviso(aviso.idAviso), 'Aviso excluído.').catch(comErro('Não foi possível excluir o aviso.'));
          }}
        />
      )}

      {editando && (
        <FormAula
          aula={editando.idAula ? editando : null}
          disciplinas={disciplinas}
          onSalvar={salvarAula}
          onFechar={() => setEditando(null)}
        />
      )}
    </main>
  );
}

export default TurmaProfessor;
