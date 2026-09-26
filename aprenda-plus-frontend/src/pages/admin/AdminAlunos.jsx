import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarAlunos, deletarAluno } from '../../services/alunoService';

function AdminAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarAlunos().then((response) => {
      setAlunos(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      deletarAluno(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Alunos cadastrados</h1>
        <Link to="/admin/alunos/novo">
          <button>+ Novo aluno</button>
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
          {alunos.map((aluno) => (
            <tr key={aluno.idAluno} style={{ borderBottom: '1px solid #333' }}>
              <td>{aluno.idAluno}</td>
              <td>{aluno.nomeCompleto}</td>
              <td>{aluno.email}</td>
              <td>{aluno.cpf}</td>
              <td>{aluno.status}</td>
              <td style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/admin/alunos/${aluno.idAluno}/editar`}>
                  <button>Editar</button>
                </Link>
                <button onClick={() => handleExcluir(aluno.idAluno)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminAlunos;