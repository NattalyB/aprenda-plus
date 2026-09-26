import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarProfessores, deletarProfessor } from '../../services/professorService';

function AdminProfessores() {
  const [professores, setProfessores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarProfessores().then((response) => {
      setProfessores(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este professor?')) {
      deletarProfessor(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Professores cadastrados</h1>
        <Link to="/admin/professores/novo">
          <button>+ Novo professor</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Nome</th>
            <th>E-mail</th>
            <th>CPF</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {professores.map((professor) => (
            <tr key={professor.idProfessor} style={{ borderBottom: '1px solid #333' }}>
              <td>{professor.idProfessor}</td>
              <td>{professor.nomeCompleto}</td>
              <td>{professor.email}</td>
              <td>{professor.cpf}</td>
              <td>{professor.status}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/professores/${professor.idProfessor}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(professor.idProfessor)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminProfessores;