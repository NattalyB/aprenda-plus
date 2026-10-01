import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarProfessores, deletarProfessor } from '../../services/professorService';

// Remove acentos e deixa minúsculo, pra busca "joao" encontrar "João"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// 12345678901 -> 123.456.789-01
const formatarCpf = (cpf) =>
  cpf && cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;

function AdminProfessores() {
  const [professores, setProfessores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  const carregar = () => {
    listarProfessores()
      .then((response) => {
        setProfessores(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar os professores.');
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

  const termo = normalizar(busca.trim());
  const termoNumeros = busca.replace(/\D/g, '');

  const professoresFiltrados = professores.filter((professor) => {
    if (!termo) return true;
    const nomeConfere = normalizar(professor.nomeCompleto).includes(termo);
    const cpfConfere = termoNumeros.length > 0 && (professor.cpf || '').includes(termoNumeros);
    return nomeConfere || cpfConfere;
  });

  if (carregando) return <p>Carregando professores...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Professores cadastrados</h1>
          <p className="admin-subtitulo">
            {professoresFiltrados.length} de {professores.length} professor(es)
          </p>
        </div>
        <Link to="/admin/professores/novo" className="admin-btn admin-btn-primary">
          + Novo professor
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-busca">
        <span className="admin-busca-icone">🔍</span>
        <input
          type="text"
          name="buscaProfessor"
          placeholder="Buscar por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {professoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-vazio">
                    {busca ? 'Nenhum professor encontrado para essa busca.' : 'Nenhum professor cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                professoresFiltrados.map((professor) => (
                  <tr key={professor.idProfessor}>
                    <td>{professor.idProfessor}</td>
                    <td>{professor.nomeCompleto}</td>
                    <td>{professor.email}</td>
                    <td>{formatarCpf(professor.cpf)}</td>
                    <td>
                      <span className={`status-badge status-${professor.status}`}>{professor.status}</span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/professores/${professor.idProfessor}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(professor.idProfessor)}
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

export default AdminProfessores;