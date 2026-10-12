import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { estaLogado } from '../services/authService';
import { listarMinhasInscricoes, trocarTurmaDaInscricao } from '../services/inscricaoService';
import { listarTurmasDisponiveis } from '../services/turmaService';
import { mostrarAviso } from '../services/avisoService';
import { formatarValor } from '../utils/precoCurso';

const STATUS = {
  pendente_pagamento: 'Pendente de pagamento',
  confirmada: 'Confirmada',
  aguardando_vaga: 'Aguardando vaga',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

// "2026-10-11T14:50:59" -> "11/10/2026"
const formatarData = (data) => {
  if (!data) return null;
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

// Texto das vagas: "1 vaga", "12 vagas" ou "Lotada"
const textoVagas = (vagas) => {
  if (vagas <= 0) return 'Lotada';
  if (vagas === 1) return '1 vaga';
  return `${vagas} vagas`;
};

// Painel para escolher outra turma do mesmo curso
function TrocaDeTurma({ inscricao, onTrocada, onCancelar }) {
  const [turmas, setTurmas] = useState(null);
  const [escolhida, setEscolhida] = useState(null);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarTurmasDisponiveis(inscricao.idCurso)
      .then((lista) => setTurmas(lista.filter((t) => t.idTurma !== inscricao.idTurma)))
      .catch(() => setErro('Não foi possível carregar as turmas. Tente novamente.'));
  }, [inscricao.idCurso, inscricao.idTurma]);

  const confirmar = () => {
    setSalvando(true);
    setErro(null);
    trocarTurmaDaInscricao(inscricao.idInscricao, escolhida)
      .then((atualizada) => {
        mostrarAviso(`Pronto! Agora você está na ${atualizada.turma}.`, 'sucesso');
        onTrocada(atualizada);
      })
      .catch((error) => {
        setErro(error.response?.data?.mensagem || 'Não foi possível trocar de turma.');
        setSalvando(false);
      });
  };

  if (erro && !turmas) {
    return <div className="form-erro">{erro}</div>;
  }

  if (!turmas) {
    return <p className="minhas-dica">Carregando turmas...</p>;
  }

  if (turmas.length === 0) {
    return (
      <div className="minhas-troca">
        <p className="minhas-dica">Não há outras turmas abertas para este curso no momento.</p>
        <button type="button" className="admin-btn admin-btn-secundario" onClick={onCancelar}>
          Fechar
        </button>
      </div>
    );
  }

  return (
    <fieldset className="minhas-troca">
      <legend>Escolha sua nova turma</legend>
      {erro && <div className="form-erro">{erro}</div>}

      <div className="minhas-turmas">
        {turmas.map((turma) => {
          const lotada = turma.vagasRestantes <= 0;
          return (
            <label
              key={turma.idTurma}
              className={[
                'minhas-turma-opcao',
                escolhida === turma.idTurma ? 'escolhida' : '',
                lotada ? 'lotada' : '',
              ].join(' ').trim()}
            >
              <input
                type="radio"
                name={`turma-${inscricao.idInscricao}`}
                value={turma.idTurma}
                disabled={lotada}
                checked={escolhida === turma.idTurma}
                onChange={() => setEscolhida(turma.idTurma)}
              />
              <span className="minhas-turma-info">
                <strong>{turma.nome}</strong>
                <span>
                  {[turma.diasHorarios, turma.modalidade, turma.periodoLetivo].filter(Boolean).join(' · ') ||
                    'Horário a definir'}
                </span>
              </span>
              <span className={lotada ? 'minhas-vagas sem-vaga' : 'minhas-vagas'}>{textoVagas(turma.vagasRestantes)}</span>
            </label>
          );
        })}
      </div>

      <div className="minhas-troca-acoes">
        <button type="button" className="admin-btn admin-btn-secundario" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={confirmar}
          disabled={!escolhida || salvando}
        >
          {salvando ? 'Trocando...' : 'Confirmar troca'}
        </button>
      </div>
    </fieldset>
  );
}

function MinhasInscricoes() {
  const logado = estaLogado();
  const [inscricoes, setInscricoes] = useState(null);
  const [erro, setErro] = useState(null);
  const [trocando, setTrocando] = useState(null);

  useEffect(() => {
    if (!logado) return;
    listarMinhasInscricoes()
      .then(setInscricoes)
      .catch(() => setErro('Não foi possível carregar suas inscrições.'));
  }, [logado]);

  const atualizarInscricao = (atualizada) => {
    setInscricoes((lista) => lista.map((i) => (i.idInscricao === atualizada.idInscricao ? atualizada : i)));
    setTrocando(null);
  };

  if (!logado) {
    return (
      <div className="carrinho-page">
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🔒</span>
          <h2>Faça login para ver suas inscrições</h2>
          <p>Entre na sua conta para acompanhar seus cursos e escolher sua turma.</p>
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
      </div>
    );
  }

  if (!inscricoes) {
    return (
      <div className="carrinho-page">
        <p className="carrinho-carregando">Carregando suas inscrições...</p>
      </div>
    );
  }

  return (
    <div className="carrinho-page">
      <h1 className="carrinho-titulo">Minhas inscrições</h1>
      <p className="minhas-subtitulo">
        Acompanhe seus cursos e, se precisar, troque de turma enquanto houver vagas.
      </p>

      {inscricoes.length === 0 ? (
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">📚</span>
          <h2>Você ainda não tem inscrições</h2>
          <p>Escolha um curso e conclua sua inscrição pelo carrinho.</p>
          <div className="carrinho-estado-botoes">
            <Link to="/" className="admin-btn admin-btn-primary">Ver cursos</Link>
          </div>
        </div>
      ) : (
        <ul className="minhas-lista">
          {inscricoes.map((inscricao) => (
            <li key={inscricao.idInscricao} className="minhas-card">
              <div className="minhas-card-topo">
                <h2>{inscricao.curso || 'Curso'}</h2>
                <span className={`status-badge status-${inscricao.status}`}>
                  {STATUS[inscricao.status] || inscricao.status}
                </span>
              </div>

              <dl className="minhas-detalhes">
                <div>
                  <dt>Turma</dt>
                  <dd>
                    {inscricao.turma || 'A definir'}
                    {(inscricao.diasHorarios || inscricao.modalidade) && (
                      <small>{[inscricao.diasHorarios, inscricao.modalidade].filter(Boolean).join(' · ')}</small>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>
                    {inscricao.formaPagamento || '-'}
                    {inscricao.valorTotal != null && <small>Total de {formatarValor(inscricao.valorTotal)}</small>}
                  </dd>
                </div>
                {inscricao.dataInscricao && (
                  <div>
                    <dt>Inscrição feita em</dt>
                    <dd>{formatarData(inscricao.dataInscricao)}</dd>
                  </div>
                )}
              </dl>

              {inscricao.podeTrocarTurma &&
                (trocando === inscricao.idInscricao ? (
                  <TrocaDeTurma
                    inscricao={inscricao}
                    onTrocada={atualizarInscricao}
                    onCancelar={() => setTrocando(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secundario minhas-btn-trocar"
                    onClick={() => setTrocando(inscricao.idInscricao)}
                  >
                    Trocar de turma
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MinhasInscricoes;
