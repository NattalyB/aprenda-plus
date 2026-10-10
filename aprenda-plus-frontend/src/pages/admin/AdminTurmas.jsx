import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { Link } from 'react-router-dom';
import { listarTurmas, deletarTurma } from '../../services/turmaService';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const STATUS_TURMA = {
  inscricoes_abertas: 'Inscrições abertas',
  inscricoes_encerradas: 'Inscrições encerradas',
  em_andamento: 'Em andamento',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
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
  }, []);

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

  const { ordenados, ordem, alternar } = useOrdenacao(turmasFiltradas, CAMPOS_ORDENACAO);

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
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-vazio">
                    {busca || cursoFiltro || statusFiltro ? 'Nenhuma turma encontrada com esses filtros.' : 'Nenhuma turma cadastrada ainda.'}
                  </td>
                </tr>
              ) : (
                ordenados.map((turma) => (
                  <tr key={turma.idTurma}>
                    <td>{turma.idTurma}</td>
                    <td>{turma.nome}</td>
                    <td>{turma.curso?.nome || '-'}</td>
                    <td>{turma.periodoLetivo?.nome || '-'}</td>
                    <td>{turma.capacidadeMaxima}</td>
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
      </div>
    </div>
  );
}

export default AdminTurmas;