import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarCursos, deletarCurso } from '../../services/cursoService';

function AdminCursos() {
  const [cursos, setCursos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarCursos().then((response) => {
      setCursos(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este curso?')) {
      deletarCurso(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Cursos cadastrados</h1>
        <Link to="/admin/cursos/novo">
          <button>+ Novo curso</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {cursos.map((curso) => (
            <tr key={curso.idCurso} style={{ borderBottom: '1px solid #333' }}>
              <td>{curso.idCurso}</td>
              <td>{curso.nome}</td>
              <td>{curso.categoria}</td>
              <td>R$ {curso.valor}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/cursos/${curso.idCurso}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(curso.idCurso)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminCursos;