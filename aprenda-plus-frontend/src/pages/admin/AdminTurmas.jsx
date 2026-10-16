import { useState, useEffect, useMemo } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { usePaginacao } from '../../utils/paginacao';
import Paginacao from '../../components/admin/Paginacao';
import { Link } from 'react-router-dom';
import { listarTurmas, deletarTurma } from '../../services/turmaService';
import { listarMatriculas } from '../../services/matriculaService';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const STATUS_TURMA = {
  inscricoes_abertas: 'Inscrições abertas',
  inscricoes_encerradas: 'Inscrições encerradas',
  em_andamento: 'Em andamento',
  encerrada: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_MATRICULA = {
  ativa: 'Ativa',
  trancada: 'Trancada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

// Matrículas que ocupam lugar na turma (as canceladas não contam)
const contaComoMatriculado = (m) => m.status !== 'cancelada';

const contarMatriculados = (porTurma, turma) =>
  (porTurma[turma.idTurma] || []).filter(contaComoMatriculado).length;

// "2026-10-11" -> "11/10/2026"
const formatarData = (data) => {
  if (!data) return '-';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (t) => t.idTurma,
  nome: (t) => t.nome,
  curso: (t) => t.curso?.nome,
  periodo: (t) => t.periodoLetivo?.nome,
  vagas: (t) => t.capacidadeMaxima,
  status: (t) => STATUS_TURMA[t.status] || t.status,
};

function AdminTurmas() {
  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [cursoFiltro, setCursoFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [matriculas, setMatriculas] = useState(null); // null = ainda carregando (ou falhou)
  const [turmaAberta, setTurmaAberta] = useState(null);

  const carregar = () => {
    listarTurmas()
      .then((response) => {
        setTurmas(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar as turmas.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
    // As matrículas são um extra: se falharem, a lista de turmas continua funcionando
    listarMatriculas()
      .then((response) => setMatriculas(response.data || []))
      .catch(() => setMatriculas(null));
  }, []);

  // { idTurma: [matrículas da turma] }
  const matriculasPorTurma = useMemo(() => {
    const mapa = {};
    (matriculas || []).forEach((m) => {
      const id = m.turma?.idTurma;
      if (id == null) return;
      (mapa[id] = mapa[id] || []).push(m);
    });
    return mapa;
  }, [matriculas]);

  const quantidadeMatriculados = (turma) => contarMatriculados(matriculasPorTurma, turma);

  // A coluna "Matriculados" depende das matrículas carregadas
  const camposOrdenacao = useMemo(
    () => ({ ...CAMPOS_ORDENACAO, matriculados: (t) => contarMatriculados(matriculasPorTurma, t) }),
    [matriculasPorTurma]
  );

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      deletarTurma(id)
        .then(() => {
          setErro(null);
          carregar();
        })
        // Se o servidor recusar (ex.: registro ligado a outros cadastros), mostra o motivo
        .catch((error) =>
          setErro(error.response?.data?.mensagem || 'Não foi possível excluir esta turma.')
        );
    }
  };

  // Lista de cursos (sem repetir) que aparecem nas turmas
  const cursosDisponiveis = [];
  turmas.forEach((t) => {
    if (t.curso && !cursosDisponiveis.some((c) => c.idCurso === t.curso.idCurso)) {
      cursosDisponiveis.push(t.curso);
    }
  });

  const termo = normalizar(busca.trim());

  const turmasFiltradas = turmas.filter((turma) => {
    const nomeConfere = !termo || normalizar(turma.nome).includes(termo);
    const cursoConfere = !cursoFiltro || String(turma.curso?.idCurso) === cursoFiltro;
    const statusConfere = !statusFiltro || turma.status === statusFiltro;
    return nomeConfere && cursoConfere && statusConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(turmasFiltradas, camposOrdenacao);
  const pagina = usePaginacao(ordenados);

  if (carregando) return <p>Carregando turmas...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Turmas cadastradas</h1>
          <p className="admin-subtitulo">
            {turmasFiltradas.length} de {turmas.length} turma(s)
          </p>
        </div>
        <Link to="/admin/turmas/novo" className="admin-btn admin-btn-primary">
          + Nova turma
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaTurma"
            placeholder="Buscar turma pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <select
          name="filtroCurso"
          className="admin-filtro-select"
          value={cursoFiltro}
          onChange={(e) => setCursoFiltro(e.target.value)}
        >
          <option value="">Todos os cursos</option>
          {cursosDisponiveis.map((curso) => (
            <option key={curso.idCurso} value={String(curso.idCurso)}>{curso.nome}</option>
          ))}
        </select>

        <select
          name="filtroStatus"
          className="admin-filtro-select"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_TURMA).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <ColunaOrdenavel coluna="id" ordem={ordem} onOrdenar={alternar}>ID</ColunaOrdenavel>
                <ColunaOrdenavel coluna="nome" ordem={ordem} onOrdenar={alternar}>Nome</ColunaOrdenavel>
                <ColunaOrdenavel coluna="curso" ordem={ordem} onOrdenar={alternar}>Curso</ColunaOrdenavel>
                <ColunaOrdenavel coluna="periodo" ordem={ordem} onOrdenar={alternar}>Período letivo</ColunaOrdenavel>
                <ColunaOrdenavel coluna="vagas" ordem={ordem} onOrdenar={alternar}>Vagas</ColunaOrdenavel>
                <ColunaOrdenavel coluna="matriculados" ordem={ordem} onOrdenar={alternar}>Matriculados</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-vazio">
                    {busca || cursoFiltro || statusFiltro ? 'Nenhuma turma encontrada com esses filtros.' : 'Nenhuma turma cadastrada ainda.'}
                  </td>
                </tr>
              ) : (
                pagina.itens.map((turma) => (
                  <tr key={turma.idTurma}>
                    <td>{turma.idTurma}</td>
                    <td>{turma.nome}</td>
                    <td>{turma.curso?.nome || '-'}</td>
                    <td>{turma.periodoLetivo?.nome || '-'}</td>
                    <td>{turma.capacidadeMaxima}</td>
                    <td>
                      {matriculas === null ? (
                        '-'
                      ) : (
                        <button
                          type="button"
                          className="turma-matriculados"
                          onClick={() => setTurmaAberta(turma)}
                          title="Ver os alunos matriculados"
                        >
                          <span aria-hidden="true">👥</span> {quantidadeMatriculados(turma)}
                          {turma.capacidadeMaxima ? <small> / {turma.capacidadeMaxima}</small> : null}
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${turma.status}`}>
                        {STATUS_TURMA[turma.status] || turma.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/turmas/${turma.idTurma}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(turma.idTurma)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacao {...pagina} nome="turmas" />
      </div>

      {turmaAberta && (
        <AlunosDaTurma
          turma={turmaAberta}
          matriculas={matriculasPorTurma[turmaAberta.idTurma] || []}
          onFechar={() => setTurmaAberta(null)}
        />
      )}
    </div>
  );
}

// Janela com os alunos matriculados na turma (os ativos primeiro, depois por nome)
function AlunosDaTurma({ turma, matriculas, onFechar }) {
  useEffect(() => {
    const fecharComEsc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [onFechar]);

  const ordem = ['ativa', 'trancada', 'concluida', 'cancelada'];
  const lista = [...matriculas].sort((a, b) => {
    const porStatus = ordem.indexOf(a.status) - ordem.indexOf(b.status);
    if (porStatus !== 0) return porStatus;
    return (a.aluno?.nomeCompleto || '').localeCompare(b.aluno?.nomeCompleto || '', 'pt-BR');
  });
  const matriculados = matriculas.filter(contaComoMatriculado).length;
  const vagasLivres = turma.capacidadeMaxima ? Math.max(turma.capacidadeMaxima - matriculados, 0) : null;

  return (
    <div className="doc-painel-fundo" role="dialog" aria-modal="true" aria-label={`Alunos da ${turma.nome}`}>
      <div className="doc-painel turma-alunos">
        <div className="doc-painel-topo">
          <div>
            <h2>{turma.nome}</h2>
            <p>
              {[turma.curso?.nome, turma.periodoLetivo?.nome].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>

        <div className="turma-alunos-resumo">
          <span>
            <strong>{matriculados}</strong> {matriculados === 1 ? 'aluno matriculado' : 'alunos matriculados'}
          </span>
          {turma.capacidadeMaxima ? (
            <span>
              <strong>{vagasLivres}</strong> {vagasLivres === 1 ? 'vaga livre' : 'vagas livres'} de {turma.capacidadeMaxima}
            </span>
          ) : null}
        </div>

        {lista.length === 0 ? (
          <p className="form-dica">Nenhum aluno matriculado nesta turma ainda.</p>
        ) : (
          <ol className="turma-alunos-lista">
            {lista.map((m) => (
              <li key={m.idMatricula} className={m.status === 'cancelada' ? 'cancelada' : undefined}>
                <div className="turma-alunos-nome">
                  {m.aluno?.idAluno ? (
                    <Link to={`/admin/alunos/${m.aluno.idAluno}/editar`}>{m.aluno?.nomeCompleto || 'Aluno'}</Link>
                  ) : (
                    <strong>{m.aluno?.nomeCompleto || 'Aluno'}</strong>
                  )}
                  <span>
                    {[m.aluno?.email, `matrícula em ${formatarData(m.dataMatricula)}`].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <span className={`status-badge status-${m.status}`}>{STATUS_MATRICULA[m.status] || m.status}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default AdminTurmas;