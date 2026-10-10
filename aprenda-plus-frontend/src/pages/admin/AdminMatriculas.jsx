import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { Link } from 'react-router-dom';
import { listarMatriculas, deletarMatricula } from '../../services/matriculaService';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Aceita "2026-09-30" ou "2026-09-30T14:20:00" -> 30/09/2026
const formatarData = (data) => {
  if (!data) return '-';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

const STATUS_MATRICULA = [
  { valor: '', label: 'Todas' },
  { valor: 'ativa', label: 'Ativa' },
  { valor: 'trancada', label: 'Trancada' },
  { valor: 'concluida', label: 'Concluída' },
  { valor: 'cancelada', label: 'Cancelada' },
];

const LABEL_STATUS = Object.fromEntries(
  STATUS_MATRICULA.filter((s) => s.valor).map((s) => [s.valor, s.label])
);

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (m) => m.idMatricula,
  aluno: (m) => m.aluno?.nomeCompleto,
  turma: (m) => m.turma?.nome,
  data: (m) => m.dataMatricula,
  status: (m) => LABEL_STATUS[m.status] || m.status,
};

function AdminMatriculas() {
  const [matriculas, setMatriculas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  const carregar = () => {
    listarMatriculas()
      .then((response) => {
        setMatriculas(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar as matrículas.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta matrícula?')) {
      deletarMatricula(id).then(() => carregar());
    }
  };

  const termo = normalizar(busca.trim());
  const termoNumeros = busca.replace(/\D/g, '');

  const matriculasFiltradas = matriculas.filter((matricula) => {
    const textoConfere =
      !termo ||
      normalizar(matricula.aluno?.nomeCompleto).includes(termo) ||
      normalizar(matricula.turma?.nome).includes(termo) ||
      (termoNumeros.length > 0 && (matricula.aluno?.cpf || '').includes(termoNumeros));
    const statusConfere = !statusFiltro || matricula.status === statusFiltro;
    return textoConfere && statusConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(matriculasFiltradas, CAMPOS_ORDENACAO);

  if (carregando) return <p>Carregando matrículas...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Matrículas</h1>
          <p className="admin-subtitulo">
            {matriculasFiltradas.length} de {matriculas.length} matrícula(s)
          </p>
        </div>
        <Link to="/admin/matriculas/novo" className="admin-btn admin-btn-primary">
          + Nova matrícula
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaMatricula"
            placeholder="Buscar por aluno, CPF ou turma..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="admin-chips">
          {STATUS_MATRICULA.map((s) => (
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
                <ColunaOrdenavel coluna="aluno" ordem={ordem} onOrdenar={alternar}>Aluno</ColunaOrdenavel>
                <ColunaOrdenavel coluna="turma" ordem={ordem} onOrdenar={alternar}>Turma</ColunaOrdenavel>
                <ColunaOrdenavel coluna="data" ordem={ordem} onOrdenar={alternar}>Data</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {matriculasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-vazio">
                    {busca || statusFiltro ? 'Nenhuma matrícula encontrada com esses filtros.' : 'Nenhuma matrícula registrada ainda.'}
                  </td>
                </tr>
              ) : (
                ordenados.map((matricula) => (
                  <tr key={matricula.idMatricula}>
                    <td>{matricula.idMatricula}</td>
                    <td>{matricula.aluno?.nomeCompleto || '-'}</td>
                    <td>{matricula.turma?.nome || '-'}</td>
                    <td>{formatarData(matricula.dataMatricula)}</td>
                    <td>
                      <span className={`status-badge status-${matricula.status}`}>
                        {LABEL_STATUS[matricula.status] || matricula.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/matriculas/${matricula.idMatricula}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(matricula.idMatricula)}
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

export default AdminMatriculas;