import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { usePaginacao } from '../../utils/paginacao';
import Paginacao from '../../components/admin/Paginacao';
import { Link } from 'react-router-dom';
import { listarFuncionarios, deletarFuncionario } from '../../services/funcionarioService';
import { getAcessoAdmin } from '../../services/authAdminService';
import EtiquetaNivel from '../../components/admin/EtiquetaNivel';

// Remove acentos e deixa minúsculo, pra busca "joao" encontrar "João"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (f) => f.idFuncionario,
  nome: (f) => f.nomeCompleto,
  email: (f) => f.email,
  cargo: (f) => f.cargo,
  nivel: (f) => f.nivel?.nome,
  status: (f) => f.status,
};

// Id do funcionário que está logado (ele não pode excluir a própria conta)
const idLogado = () => Number(localStorage.getItem('idFuncionario'));

function AdminFuncionarios() {
  // Quem não é Master não exclui contas Master (o servidor também confere)
  const souMaster = Boolean(getAcessoAdmin()?.master);
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');

  const carregar = () => {
    listarFuncionarios()
      .then((response) => {
        setFuncionarios(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar os funcionários.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário? Ele perderá o acesso ao painel.')) {
      deletarFuncionario(id)
        .then(() => {
          setErro(null);
          carregar();
        })
        // Se o servidor recusar (ex.: registro ligado a outros cadastros), mostra o motivo
        .catch((error) =>
          setErro(error.response?.data?.mensagem || 'Não foi possível excluir este funcionário.')
        );
    }
  };

  const termo = normalizar(busca.trim());
  const termoNumeros = busca.replace(/\D/g, '');

  const funcionariosFiltrados = funcionarios.filter((funcionario) => {
    if (!termo) return true;
    const nomeConfere = normalizar(funcionario.nomeCompleto).includes(termo);
    const cpfConfere = termoNumeros.length > 0 && (funcionario.cpf || '').includes(termoNumeros);
    return nomeConfere || cpfConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(funcionariosFiltrados, CAMPOS_ORDENACAO);
  const pagina = usePaginacao(ordenados);

  if (carregando) return <p>Carregando funcionários...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Funcionários do painel</h1>
          <p className="admin-subtitulo">
            {funcionariosFiltrados.length} de {funcionarios.length} funcionário(s) com acesso ao painel
          </p>
        </div>
        <Link to="/admin/funcionarios/novo" className="admin-btn admin-btn-primary">
          + Novo funcionário
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-busca">
        <span className="admin-busca-icone">🔍</span>
        <input
          type="text"
          name="buscaFuncionario"
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
                <ColunaOrdenavel coluna="cargo" ordem={ordem} onOrdenar={alternar}>Cargo</ColunaOrdenavel>
                <ColunaOrdenavel coluna="nivel" ordem={ordem} onOrdenar={alternar}>Nível</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-vazio">
                    {busca ? 'Nenhum funcionário encontrado para essa busca.' : 'Nenhum funcionário cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                pagina.itens.map((funcionario) => (
                  <tr key={funcionario.idFuncionario}>
                    <td>{funcionario.idFuncionario}</td>
                    <td>
                      {funcionario.nomeCompleto}
                      {funcionario.idFuncionario === idLogado() && <span className="admin-voce"> (você)</span>}
                    </td>
                    <td>{funcionario.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>{funcionario.cargo || '-'}</td>
                    <td>
                      {funcionario.nivel ? (
                        <EtiquetaNivel nivel={funcionario.nivel} />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${funcionario.status}`}>{funcionario.status}</span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/funcionarios/${funcionario.idFuncionario}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        {funcionario.idFuncionario !== idLogado() && (souMaster || !funcionario.nivel?.master) && (
                          <button
                            className="admin-btn admin-btn-sm admin-btn-excluir"
                            onClick={() => handleExcluir(funcionario.idFuncionario)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacao {...pagina} nome="funcionários" />
      </div>
    </div>
  );
}

export default AdminFuncionarios;