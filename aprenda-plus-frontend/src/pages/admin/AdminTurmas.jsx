import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarTurmas, deletarTurma } from '../../services/turmaService';

function AdminTurmas() {
  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarTurmas().then((response) => {
      setTurmas(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta turma?')) {
      deletarTurma(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Turmas cadastradas</h1>
        <Link to="/admin/turmas/novo">
          <button>+ Nova turma</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Nome</th>
            <th>Curso</th>
            <th>Período letivo</th>
            <th>Vagas</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {turmas.map((turma) => (
            <tr key={turma.idTurma} style={{ borderBottom: '1px solid #333' }}>
              <td>{turma.idTurma}</td>
              <td>{turma.nome}</td>
              <td>{turma.curso?.nome}</td>
              <td>{turma.periodoLetivo?.nome}</td>
              <td>{turma.capacidadeMaxima}</td>
              <td>{turma.status}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/turmas/${turma.idTurma}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(turma.idTurma)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminTurmas;