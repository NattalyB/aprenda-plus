import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import DocumentosDoAluno from '../../components/admin/DocumentosDoAluno';
import { situacaoDosDocumentos, STATUS_DOCUMENTO } from '../../services/documentoService';
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

const FILTROS_DOCUMENTO = {
  pendente: 'Documento em análise',
  aprovado: 'Documento aprovado',
  recusado: 'Documento recusado',
  sem: 'Sem documento',
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
  const [sucesso, setSucesso] = useState(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [parametros] = useSearchParams();
  const [documentoFiltro, setDocumentoFiltro] = useState(parametros.get('documento') || '');
  const [documentos, setDocumentos] = useState({}); // { idAluno: 'aprovado' | 'pendente' | 'recusado' }
  const [revisando, setRevisando] = useState(null); // aluno com a janela de documentos aberta

  const carregarDocumentos = () => {
    situacaoDosDocumentos()
      .then((response) => setDocumentos(response.data || {}))
      .catch(() => setDocumentos({}));
  };

  const situacaoDoc = (inscricao) => documentos[inscricao.aluno?.idAluno] || 'sem';

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
    carregarDocumentos();
  }, []);

  const documentoRevisado = (documento) => {
    carregarDocumentos();
    setErro(null);
    const nome = revisando?.nomeCompleto || 'do aluno';
    setSucesso(
      documento.status === 'aprovado'
        ? `Documento aprovado! Agora você já pode confirmar o pagamento de ${nome}.`
        : `Documento recusado. ${nome} vai receber um e-mail com o motivo.`
    );
    setRevisando(null);
  };

  // Ao mudar o status, o servidor cuida da matrícula e da lista de espera:
  // - confirmada (pagamento aprovado) -> cria a matrícula do aluno na turma;
  // - cancelada -> cancela a matrícula e chama o primeiro da lista de espera.
  const handleStatusChange = (inscricao, novoStatus) => {
    setErro(null);
    setSucesso(null);
    atualizarInscricao(inscricao.idInscricao, { ...inscricao, status: novoStatus })
      .then(() => {
        const nome = inscricao.aluno?.nomeCompleto;
        if (novoStatus === 'confirmada') {
          setSucesso(`Pagamento confirmado! A matrícula ${nome ? `de ${nome}` : 'do aluno'} foi criada em Matrículas.`);
        } else if (novoStatus === 'cancelada') {
          setSucesso('Inscrição cancelada. Se havia alguém na lista de espera desta turma, ele foi chamado.');
        }
        carregar();
      })
      .catch((error) =>
        setErro(error.response?.data?.mensagem || 'Não foi possível atualizar o status da inscrição.')
      );
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
    const documentoConfere = !documentoFiltro || situacaoDoc(inscricao) === documentoFiltro;
    return textoConfere && statusConfere && documentoConfere;
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
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

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

        <select
          name="filtroDocumento"
          className="admin-filtro-select"
          value={documentoFiltro}
          onChange={(e) => setDocumentoFiltro(e.target.value)}
        >
          <option value="">Todos os documentos</option>
          {Object.entries(FILTROS_DOCUMENTO).map(([valor, label]) => (
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
                <th>Documento</th>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {inscricoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-vazio">
                    {busca || statusFiltro || documentoFiltro ? 'Nenhuma inscrição encontrada com esses filtros.' : 'Nenhuma inscrição registrada ainda.'}
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
                      <BotaoDocumento
                        situacao={situacaoDoc(inscricao)}
                        disabled={!inscricao.aluno?.idAluno}
                        onClick={() => setRevisando(inscricao.aluno)}
                      />
                    </td>
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

      {revisando && (
        <div className="doc-painel-fundo" role="dialog" aria-modal="true" aria-label="Documento de escolaridade">
          <div className="doc-painel">
            <div className="doc-painel-topo">
              <div>
                <h2>Documento de escolaridade</h2>
                <p>{revisando.nomeCompleto}</p>
              </div>
              <button type="button" className="admin-btn admin-btn-secundario" onClick={() => setRevisando(null)}>
                Fechar
              </button>
            </div>
            <DocumentosDoAluno idAluno={revisando.idAluno} onAlterado={documentoRevisado} />
          </div>
        </div>
      )}
    </div>
  );
}

// Selo do documento na tabela; clicar abre a janela de revisão
function BotaoDocumento({ situacao, disabled, onClick }) {
  const status = STATUS_DOCUMENTO[situacao];
  const texto = status ? `${status.icone} ${status.texto}` : '— Sem documento';
  return (
    <button
      type="button"
      className={`doc-status doc-status-botao ${status ? status.classe : 'doc-status-sem'}`}
      onClick={onClick}
      disabled={disabled}
      title="Ver documento de escolaridade"
    >
      {texto}
    </button>
  );
}

export default AdminInscricoes;