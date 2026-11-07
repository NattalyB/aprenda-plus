import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  atualizarChamado,
  baixarAnexoDoChamado,
  buscarChamado,
  listarChamados,
  responderChamado,
} from '../../services/chamadoService';
import ConversaChamado from '../../components/chamados/ConversaChamado';
import {
  PRIORIDADES,
  aguardaSuporte,
  classeSituacao,
  dataHora,
  rotuloCategoria,
  rotuloPrioridade,
  rotuloSituacao,
} from '../../utils/chamados';

const normalizar = (texto) => (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FILTROS = [
  { chave: 'pendentes', rotulo: 'Aguardando o suporte', filtro: aguardaSuporte },
  { chave: 'abertos', rotulo: 'Em aberto', filtro: (c) => c.status === 'aberto' || c.status === 'em_atendimento' },
  { chave: 'resolvido', rotulo: 'Resolvidos', filtro: (c) => c.status === 'resolvido' },
  { chave: 'fechado', rotulo: 'Fechados', filtro: (c) => c.status === 'fechado' },
  { chave: 'todos', rotulo: 'Todos', filtro: () => true },
];

const PESO_PRIORIDADE = { urgente: 0, alta: 1, media: 2, baixa: 3 };

// Módulo Chamados: quem atende vê todos os chamados da equipe e dos professores e responde por aqui.
function AdminChamados() {
  const { idChamado } = useParams();
  const navigate = useNavigate();
  const [chamados, setChamados] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [filtro, setFiltro] = useState('pendentes');
  const [prioridade, setPrioridade] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState(null);
  const meuId = Number(localStorage.getItem('idFuncionario')) || null;

  const carregar = () =>
    listarChamados()
      .then((lista) => setChamados(lista || []))
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível carregar os chamados.'));

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!idChamado) return;
    buscarChamado(idChamado)
      .then((c) => {
        setErro(null);
        setAberto(c);
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível abrir o chamado.'));
  }, [idChamado]);

  // Só mostra o chamado do endereço atual (ao trocar de chamado, o anterior não pisca na tela)
  const atual = aberto && String(aberto.idChamado) === String(idChamado) ? aberto : null;

  if (idChamado) {
    return (
      <div>
        <Link to="/admin/chamados" className="chamado-voltar">← Todos os chamados</Link>
        {erro && <div className="form-erro">{erro}</div>}
        {!atual && !erro && <p>Carregando chamado...</p>}
        {atual && (
          <ConversaChamado
            chamado={atual}
            modo="suporte"
            meuId={meuId}
            onAtualizado={(c) => {
              setAberto(c);
              carregar();
            }}
            acoes={{
              escrever: (texto, anexo, status) => responderChamado(atual.idChamado, texto, anexo, status),
              atualizar: (mudancas) => atualizarChamado(atual.idChamado, mudancas),
              baixarAnexo: (idMensagem) => baixarAnexoDoChamado(atual.idChamado, idMensagem),
            }}
          />
        )}
      </div>
    );
  }

  const lista = chamados || [];
  const contagem = (chave) => lista.filter(FILTROS.find((f) => f.chave === chave).filtro).length;
  const termo = normalizar(busca.trim());
  const visiveis = lista
    .filter(FILTROS.find((f) => f.chave === filtro).filtro)
    .filter((c) => !prioridade || c.prioridade === prioridade)
    .filter((c) => !termo || normalizar(`#${c.idChamado} ${c.assunto} ${c.nomeSolicitante} ${c.tela || ''}`).includes(termo))
    .sort((a, b) =>
      filtro === 'pendentes'
        ? (PESO_PRIORIDADE[a.prioridade] ?? 9) - (PESO_PRIORIDADE[b.prioridade] ?? 9) ||
          String(a.atualizadoEm).localeCompare(String(b.atualizadoEm))
        : 0
    );

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Chamados</h1>
          <p className="admin-subtitulo">
            Pedidos de ajuda da equipe e dos professores. Quem abriu recebe cada resposta por e-mail.
          </p>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, assunto, pessoa ou tela..." aria-label="Buscar chamado" />
        </div>
        <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} aria-label="Filtrar por prioridade">
          <option value="">Todas as prioridades</option>
          {PRIORIDADES.map((p) => <option key={p.chave} value={p.chave}>{p.rotulo}</option>)}
        </select>
        <div className="admin-chips">
          {FILTROS.map((f) => (
            <button key={f.chave} type="button" className={filtro === f.chave ? 'admin-chip ativo' : 'admin-chip'}
              onClick={() => setFiltro(f.chave)}>
              {f.rotulo} <span className="admin-chip-num">{chamados ? contagem(f.chave) : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {chamados === null ? (
        !erro && <p>Carregando chamados...</p>
      ) : visiveis.length === 0 ? (
        <div className="admin-card ead-vazio">
          <span aria-hidden="true">🎧</span>
          <p>{filtro === 'pendentes' ? 'Nenhum chamado esperando o suporte. Tudo em dia! 🎉' : 'Nenhum chamado encontrado.'}</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table chamados-tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Assunto</th>
                <th>Aberto por</th>
                <th>Prioridade</th>
                <th>Situação</th>
                <th>Responsável</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.idChamado} className="chamados-linha" onClick={() => navigate(`/admin/chamados/${c.idChamado}`)}>
                  <td>#{c.idChamado}</td>
                  <td>
                    <Link to={`/admin/chamados/${c.idChamado}`} onClick={(e) => e.stopPropagation()}>{c.assunto}</Link>
                    <small className="chamados-sub">{rotuloCategoria(c.categoria)}{c.tela ? ` · ${c.tela}` : ''}</small>
                    {aguardaSuporte(c) && c.status !== 'aberto' && <span className="chamados-nova-resposta">Nova mensagem</span>}
                  </td>
                  <td>
                    {c.nomeSolicitante}
                    <small className="chamados-sub">{c.tipoSolicitante === 'professor' ? 'Professor' : 'Equipe'}</small>
                  </td>
                  <td><span className={`chamado-prioridade chamado-prioridade-${c.prioridade}`}>{rotuloPrioridade(c.prioridade)}</span></td>
                  <td><span className={`chamado-situacao chamado-situacao-${classeSituacao(c.status)}`}>{rotuloSituacao(c.status)}</span></td>
                  <td>{c.responsavelNome || '—'}</td>
                  <td>{dataHora(c.atualizadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminChamados;
