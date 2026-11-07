import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  baixarAnexoDoMeuChamado,
  buscarMeuChamado,
  escreverNoChamado,
  fecharChamado,
  listarMeusChamados,
} from '../../services/chamadoService';
import {
  classeSituacao,
  dataHora,
  nomeDaTela,
  rotuloCategoria,
  rotuloSituacao,
  temRespostaDoSuporte,
} from '../../utils/chamados';
import ConversaChamado from './ConversaChamado';
import FormNovoChamado from './FormNovoChamado';

// Central de suporte de quem abre chamados: a lista dos seus chamados, abrir um novo e a conversa de cada um.
// perfil: "funcionario" (painel) ou "professor" (Portal do Professor). rota: endereço desta tela.
function MeusChamados({ perfil, rota }) {
  const { idChamado } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [chamados, setChamados] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState(new URLSearchParams(location.search).get('novo') === '1');
  const [mostrarFechados, setMostrarFechados] = useState(false);
  const [erro, setErro] = useState(null);

  const telaDeOrigem = nomeDaTela(location.state?.de);

  const carregarLista = () =>
    listarMeusChamados(perfil)
      .then((lista) => setChamados(lista || []))
      .catch(() => setErro('Não foi possível carregar os seus chamados.'));

  useEffect(() => {
    carregarLista();
  }, [perfil]);

  useEffect(() => {
    if (!idChamado) return;
    buscarMeuChamado(perfil, idChamado)
      .then((c) => {
        setErro(null);
        setAberto(c);
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível abrir o chamado.'));
  }, [perfil, idChamado]);

  const atualizado = (chamado) => {
    setAberto(chamado);
    carregarLista();
  };

  // Só mostra o chamado do endereço atual (ao trocar de chamado, o anterior não pisca na tela)
  const atual = aberto && String(aberto.idChamado) === String(idChamado) ? aberto : null;

  if (idChamado) {
    return (
      <div>
        <Link to={rota} className="chamado-voltar">← Meus chamados</Link>
        {erro && <div className="form-erro">{erro}</div>}
        {!atual && !erro && <p>Carregando chamado...</p>}
        {atual && (
          <ConversaChamado
            chamado={atual}
            modo="solicitante"
            onAtualizado={atualizado}
            acoes={{
              escrever: (texto, anexo) => escreverNoChamado(perfil, atual.idChamado, texto, anexo),
              fechar: () => fecharChamado(perfil, atual.idChamado),
              baixarAnexo: (idMensagem) => baixarAnexoDoMeuChamado(perfil, atual.idChamado, idMensagem),
            }}
          />
        )}
      </div>
    );
  }

  const visiveis = (chamados || []).filter((c) => mostrarFechados || c.status !== 'fechado');
  const fechados = (chamados || []).length - (chamados || []).filter((c) => c.status !== 'fechado').length;

  return (
    <div className="chamados-central">
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Suporte</h1>
          <p className="admin-subtitulo">
            Algo não funcionou? Abra um chamado e acompanhe a resposta por aqui (ela também chega por e-mail).
          </p>
        </div>
        {!novo && (
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setNovo(true)}>
            + Abrir chamado
          </button>
        )}
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      {novo && (
        <FormNovoChamado
          perfil={perfil}
          telaInicial={telaDeOrigem}
          onCancelar={() => setNovo(false)}
          onCriado={(chamado) => {
            setNovo(false);
            navigate(`${rota}/${chamado.idChamado}`);
          }}
        />
      )}

      {chamados === null ? (
        !erro && <p>Carregando seus chamados...</p>
      ) : chamados.length === 0 ? (
        !novo && (
          <div className="admin-card ead-vazio">
            <span aria-hidden="true">🎧</span>
            <p>Você ainda não abriu nenhum chamado. Se algo der errado no sistema, clique em "+ Abrir chamado".</p>
          </div>
        )
      ) : (
        <>
          <div className="chamados-lista-topo">
            <h2>Meus chamados</h2>
            {fechados > 0 && (
              <label className="chamados-check">
                <input type="checkbox" checked={mostrarFechados} onChange={(e) => setMostrarFechados(e.target.checked)} />
                Mostrar os fechados ({fechados})
              </label>
            )}
          </div>
          {visiveis.length === 0 ? (
            <p>Nenhum chamado em aberto.</p>
          ) : (
            <ul className="chamados-lista">
              {visiveis.map((c) => (
                <li key={c.idChamado}>
                  <Link to={`${rota}/${c.idChamado}`} className="chamados-item">
                    <span className="chamado-numero">#{c.idChamado}</span>
                    <span className="chamados-item-assunto">
                      {c.assunto}
                      <small>{rotuloCategoria(c.categoria)} · atualizado em {dataHora(c.atualizadoEm)}</small>
                    </span>
                    {temRespostaDoSuporte(c) && <span className="chamados-nova-resposta">Resposta do suporte</span>}
                    <span className={`chamado-situacao chamado-situacao-${classeSituacao(c.status)}`}>
                      {rotuloSituacao(c.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default MeusChamados;
