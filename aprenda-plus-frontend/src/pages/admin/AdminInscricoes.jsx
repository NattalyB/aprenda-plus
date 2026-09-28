import { useState, useEffect } from 'react';
import { listarInscricoes, atualizarInscricao, deletarInscricao } from '../../services/inscricaoService';

const statusOptions = ['pendente_pagamento', 'confirmada', 'cancelada', 'aguardando_vaga', 'concluida'];

function AdminInscricoes() {
  const [inscricoes, setInscricoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    listarInscricoes().then((response) => {
      setInscricoes(response.data);
      setCarregando(false);
    });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleStatusChange = (inscricao, novoStatus) => {
    atualizarInscricao(inscricao.idInscricao, { ...inscricao, status: novoStatus }).then(() => carregar());
  };

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta inscrição?')) {
      deletarInscricao(id).then(() => carregar());
    }
  };

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <h1>Inscrições</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
            <th>ID</th>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {inscricoes.map((inscricao) => (
            <tr key={inscricao.idInscricao} style={{ borderBottom: '1px solid #333' }}>
              <td>{inscricao.idInscricao}</td>
              <td>{inscricao.aluno?.nomeCompleto}</td>
              <td>{inscricao.turma?.nome}</td>
              <td>R$ {inscricao.valorTotal}</td>
              <td>
                <select
                  value={inscricao.status}
                  onChange={(e) => handleStatusChange(inscricao, e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </td>
              <td>
                <button onClick={() => handleExcluir(inscricao.idInscricao)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminInscricoes;