import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { Link } from 'react-router-dom';
import { listarPeriodosLetivos, deletarPeriodoLetivo } from '../../services/periodoLetivoService';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// 2026-08-01 -> 01/08/2026
const formatarData = (data) => {
  if (!data) return '-';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

const STATUS = [
  { valor: '', label: 'Todos' },
  { valor: 'ativo', label: 'Ativo' },
  { valor: 'encerrado', label: 'Encerrado' },
  { valor: 'cancelado', label: 'Cancelado' },
];

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (p) => p.idPeriodoLetivo,
  nome: (p) => p.nome,
  inicio: (p) => p.dataInicio,
  fim: (p) => p.dataFim,
  status: (p) => p.status,
};

function AdminPeriodosLetivos() {
  const [periodos, setPeriodos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  const carregar = () => {
    listarPeriodosLetivos()
      .then((response) => {
        setPeriodos(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar os períodos letivos.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este período letivo?')) {
      deletarPeriodoLetivo(id)
        .then(() => {
          setErro(null);
          carregar();
        })
        // Se o servidor recusar (ex.: registro ligado a outros cadastros), mostra o motivo
        .catch((error) =>
          setErro(error.response?.data?.mensagem || 'Não foi possível excluir este período letivo.')
        );
    }
  };

  const termo = normalizar(busca.trim());

  const periodosFiltrados = periodos.filter((periodo) => {
    const nomeConfere = !termo || normalizar(periodo.nome).includes(termo);
    const statusConfere = !statusFiltro || periodo.status === statusFiltro;
    return nomeConfere && statusConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(periodosFiltrados, CAMPOS_ORDENACAO);

  if (carregando) return <p>Carregando períodos letivos...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Períodos letivos</h1>
          <p className="admin-subtitulo">
            {periodosFiltrados.length} de {periodos.length} período(s)
          </p>
        </div>
        <Link to="/admin/periodos-letivos/novo" className="admin-btn admin-btn-primary">
          + Novo período
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaPeriodo"
            placeholder="Buscar período pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="admin-chips">
          {STATUS.map((s) => (
            <button
              key={s.valor}
              type="button"
              className={statusFiltro === s.valor ? 'admin-chip ativo' : 'admin-chip'}
              onClick={() => setStatusFiltro(s.valor)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <ColunaOrdenavel coluna="id" ordem={ordem} onOrdenar={alternar}>ID</ColunaOrdenavel>
                <ColunaOrdenavel coluna="nome" ordem={ordem} onOrdenar={alternar}>Nome</ColunaOrdenavel>
                <ColunaOrdenavel coluna="inicio" ordem={ordem} onOrdenar={alternar}>Início</ColunaOrdenavel>
                <ColunaOrdenavel coluna="fim" ordem={ordem} onOrdenar={alternar}>Fim</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {periodosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-vazio">
                    {busca || statusFiltro ? 'Nenhum período encontrado com esses filtros.' : 'Nenhum período letivo cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                ordenados.map((periodo) => (
                  <tr key={periodo.idPeriodoLetivo}>
                    <td>{periodo.idPeriodoLetivo}</td>
                    <td>{periodo.nome}</td>
                    <td>{formatarData(periodo.dataInicio)}</td>
                    <td>{formatarData(periodo.dataFim)}</td>
                    <td>
                      <span className={`status-badge status-${periodo.status}`}>{periodo.status}</span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/periodos-letivos/${periodo.idPeriodoLetivo}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(periodo.idPeriodoLetivo)}
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

export default AdminPeriodosLetivos;