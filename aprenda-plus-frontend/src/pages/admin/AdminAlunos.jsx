import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { Link } from 'react-router-dom';
import { listarAlunos, deletarAluno } from '../../services/alunoService';

// Remove acentos e deixa minúsculo, pra busca "joao" encontrar "João"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// 12345678901 -> 123.456.789-01
const formatarCpf = (cpf) =>
  cpf && cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (a) => a.idAluno,
  nome: (a) => a.nomeCompleto,
  email: (a) => a.email,
  cpf: (a) => a.cpf,
  status: (a) => a.status,
};

function AdminAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  const carregar = () => {
    listarAlunos()
      .then((response) => {
        setAlunos(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar os alunos.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este aluno?')) {
      deletarAluno(id)
        .then(() => {
          setErro(null);
          carregar();
        })
        // Se o servidor recusar (ex.: registro ligado a outros cadastros), mostra o motivo
        .catch((error) =>
          setErro(error.response?.data?.mensagem || 'Não foi possível excluir este aluno.')
        );
    }
  };

  const termo = normalizar(busca.trim());
  const termoNumeros = busca.replace(/\D/g, '');

  const alunosFiltrados = alunos.filter((aluno) => {
    if (!termo) return true;
    const nomeConfere = normalizar(aluno.nomeCompleto).includes(termo);
    const cpfConfere = termoNumeros.length > 0 && (aluno.cpf || '').includes(termoNumeros);
    return nomeConfere || cpfConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(alunosFiltrados, CAMPOS_ORDENACAO);

  if (carregando) return <p>Carregando alunos...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Alunos cadastrados</h1>
          <p className="admin-subtitulo">
            {alunosFiltrados.length} de {alunos.length} aluno(s)
          </p>
        </div>
        <Link to="/admin/alunos/novo" className="admin-btn admin-btn-primary">
          + Novo aluno
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-busca">
        <span className="admin-busca-icone">🔍</span>
        <input
          type="text"
          name="buscaAluno"
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
                <ColunaOrdenavel coluna="id" ordem={ordem} onOrdenar={alternar}>ID</ColunaOrdenavel>
                <ColunaOrdenavel coluna="nome" ordem={ordem} onOrdenar={alternar}>Nome</ColunaOrdenavel>
                <ColunaOrdenavel coluna="email" ordem={ordem} onOrdenar={alternar}>E-mail</ColunaOrdenavel>
                <ColunaOrdenavel coluna="cpf" ordem={ordem} onOrdenar={alternar}>CPF</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-vazio">
                    {busca ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhum aluno cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                ordenados.map((aluno) => (
                  <tr key={aluno.idAluno}>
                    <td>{aluno.idAluno}</td>
                    <td>{aluno.nomeCompleto}</td>
                    <td>{aluno.email}</td>
                    <td>{formatarCpf(aluno.cpf)}</td>
                    <td>
                      <span className={`status-badge status-${aluno.status}`}>{aluno.status}</span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/alunos/${aluno.idAluno}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(aluno.idAluno)}
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

export default AdminAlunos;