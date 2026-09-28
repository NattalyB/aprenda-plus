import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarDisciplinas, deletarDisciplina } from '../../services/disciplinaService';

function AdminDisciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarDisciplinas().then((response) => {
      setDisciplinas(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      deletarDisciplina(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Disciplinas cadastradas</h1>
        <Link to="/admin/disciplinas/novo">
          <button>+ Nova disciplina</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Nome</th>
            <th>Curso</th>
            <th>Carga horária</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {disciplinas.map((disciplina) => (
            <tr key={disciplina.idDisciplina} style={{ borderBottom: '1px solid #333' }}>
              <td>{disciplina.idDisciplina}</td>
              <td>{disciplina.nome}</td>
              <td>{disciplina.curso?.nome}</td>
              <td>{disciplina.cargaHoraria}h</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/disciplinas/${disciplina.idDisciplina}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(disciplina.idDisciplina)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDisciplinas;