import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarPeriodosLetivos, deletarPeriodoLetivo } from '../../services/periodoLetivoService';

function AdminPeriodosLetivos() {
  const [periodos, setPeriodos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarPeriodosLetivos().then((response) => {
      setPeriodos(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este período letivo?')) {
      deletarPeriodoLetivo(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Períodos letivos cadastrados</h1>
        <Link to="/admin/periodos-letivos/novo">
          <button>+ Novo período</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Nome</th>
            <th>Início</th>
            <th>Fim</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {periodos.map((periodo) => (
            <tr key={periodo.idPeriodoLetivo} style={{ borderBottom: '1px solid #333' }}>
              <td>{periodo.idPeriodoLetivo}</td>
              <td>{periodo.nome}</td>
              <td>{periodo.dataInicio}</td>
              <td>{periodo.dataFim}</td>
              <td>{periodo.status}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/periodos-letivos/${periodo.idPeriodoLetivo}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(periodo.idPeriodoLetivo)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPeriodosLetivos;