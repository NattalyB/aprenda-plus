import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarMatriculas, deletarMatricula } from '../../services/matriculaService';

function AdminMatriculas() {
  const [matriculas, setMatriculas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarMatriculas().then((response) => {
      setMatriculas(response.data);
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

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Matrículas</h1>
        <Link to="/admin/matriculas/novo">
          <button>+ Nova matrícula</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Data</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {matriculas.map((matricula) => (
            <tr key={matricula.idMatricula} style={{ borderBottom: '1px solid #333' }}>
              <td>{matricula.idMatricula}</td>
              <td>{matricula.aluno?.nomeCompleto}</td>
              <td>{matricula.turma?.nome}</td>
              <td>{matricula.dataMatricula}</td>
              <td>{matricula.status}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/matriculas/${matricula.idMatricula}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(matricula.idMatricula)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminMatriculas;