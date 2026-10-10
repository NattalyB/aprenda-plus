import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
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

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (i) => i.idInscricao,
  aluno: (i) => i.aluno?.nomeCompleto,
  turma: (i) => i.turma?.nome,
  valor: (i) => (i.valorTotal == null ? null : Number(i.valorTotal)),
  pagamento: (i) => i.formaPagamento,
  status: (i) => STATUS_INSCRICAO[i.status] || i.status,
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
      deletarInscricao(id)
        .then(() => {
          setErro(null);
          carregar();
        })
        // Se o servidor recusar (ex.: registro ligado a outros cadastros), mostra o motivo
        .catch((error) =>
          setErro(error.response?.data?.mensagem || 'Não foi possível excluir esta inscrição.')
        );
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

  const { ordenados, ordem, alternar } = useOrdenacao(inscricoesFiltradas, CAMPOS_ORDENACAO);

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
                <ColunaOrdenavel coluna="id" ordem={ordem} onOrdenar={alternar}>ID</ColunaOrdenavel>
                <ColunaOrdenavel coluna="aluno" ordem={ordem} onOrdenar={alternar}>Aluno</ColunaOrdenavel>
                <ColunaOrdenavel coluna="turma" ordem={ordem} onOrdenar={alternar}>Turma</ColunaOrdenavel>
                <ColunaOrdenavel coluna="valor" ordem={ordem} onOrdenar={alternar}>Valor</ColunaOrdenavel>
                <ColunaOrdenavel coluna="pagamento" ordem={ordem} onOrdenar={alternar}>Pagamento</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
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
                ordenados.map((inscricao) => (
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