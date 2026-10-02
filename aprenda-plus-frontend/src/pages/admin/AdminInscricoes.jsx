import { useState, useEffect } from 'react';
import { listarInscricoes, atualizarInscricao, deletarInscricao } from '../../services/inscricaoService';
import { formatarValor } from '../../utils/precoCurso';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const STATUS_INSCRICAO = {
  pendente_pagamento: 'Pendente de pagamento',
  confirmada: 'Confirmada',
  aguardando_vaga: 'Aguardando vaga',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

function AdminInscricoes() {
  const [inscricoes, setInscricoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  const carregar = () => {
    listarInscricoes()
      .then((response) => {
        setInscricoes(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar as inscrições.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleStatusChange = (inscricao, novoStatus) => {
    atualizarInscricao(inscricao.idInscricao, { ...inscricao, status: novoStatus })
      .then(() => carregar())
      .catch(() => setErro('Não foi possível atualizar o status da inscrição.'));
  };

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta inscrição?')) {
      deletarInscricao(id).then(() => carregar());
    }
  };

  const termo = normalizar(busca.trim());

  const inscricoesFiltradas = inscricoes.filter((inscricao) => {
    const textoConfere =
      !termo ||
      normalizar(inscricao.aluno?.nomeCompleto).includes(termo) ||
      normalizar(inscricao.turma?.nome).includes(termo);
    const statusConfere = !statusFiltro || inscricao.status === statusFiltro;
    return textoConfere && statusConfere;
  });

  if (carregando) return <p>Carregando inscrições...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Inscrições</h1>
          <p className="admin-subtitulo">
            {inscricoesFiltradas.length} de {inscricoes.length} inscrição(ões) · clique no status para alterar
          </p>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaInscricao"
            placeholder="Buscar por aluno ou turma..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <select
          name="filtroStatus"
          className="admin-filtro-select"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_INSCRICAO).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Valor</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {inscricoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-vazio">
                    {busca || statusFiltro ? 'Nenhuma inscrição encontrada com esses filtros.' : 'Nenhuma inscrição registrada ainda.'}
                  </td>
                </tr>
              ) : (
                inscricoesFiltradas.map((inscricao) => (
                  <tr key={inscricao.idInscricao}>
                    <td>{inscricao.idInscricao}</td>
                    <td>{inscricao.aluno?.nomeCompleto || '-'}</td>
                    <td>{inscricao.turma?.nome || '-'}</td>
                    <td>{formatarValor(inscricao.valorTotal)}</td>
                    <td>{inscricao.formaPagamento || '-'}</td>
                    <td>
                      <select
                        name={`status-${inscricao.idInscricao}`}
                        className={`status-select status-${inscricao.status}`}
                        value={inscricao.status}
                        onChange={(e) => handleStatusChange(inscricao, e.target.value)}
                      >
                        {Object.entries(STATUS_INSCRICAO).map(([valor, label]) => (
                          <option key={valor} value={valor}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-excluir"
                        onClick={() => handleExcluir(inscricao.idInscricao)}
                      >
                        Excluir
                      </button>
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

export default AdminInscricoes;