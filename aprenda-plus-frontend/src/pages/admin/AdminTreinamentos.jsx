import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  listarTreinamentos,
  criarTreinamento,
  atualizarTreinamento,
  excluirTreinamento,
  baixarPdfDoTreinamento,
} from '../../services/treinamentoService';
import { urlDoPlayer } from '../../utils/salaDeAula';
import FormTreinamento from '../../components/admin/treinamentos/FormTreinamento';
import VisualizarDocumento from '../../components/VisualizarDocumento';
import UltimaAlteracao from '../../components/admin/UltimaAlteracao';

const normalizar = (texto) =>
  (texto || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

// Treinamentos do painel: vídeos e manuais em PDF de como usar o sistema.
// Toda a equipe assiste; só o Master cadastra, edita e exclui.
function AdminTreinamentos() {
  const { acesso } = useOutletContext() || {};
  const ehMaster = Boolean(acesso?.master);
  const [treinamentos, setTreinamentos] = useState(null);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null); // null = fechado; {} = novo; treinamento = editar
  const [pdfAberto, setPdfAberto] = useState(null);

  const carregar = () =>
    listarTreinamentos()
      .then((lista) => setTreinamentos(lista || []))
      .catch(() => {
        setTreinamentos([]);
        setErro('Não foi possível carregar os treinamentos.');
      });

  useEffect(() => {
    carregar();
  }, []);

  const salvar = (campos, arquivo, removerPdf) => {
    const novo = !editando?.idTreinamento;
    const promessa = novo
      ? criarTreinamento(campos, arquivo)
      : atualizarTreinamento(editando.idTreinamento, campos, arquivo, removerPdf);
    return promessa.then(() => {
      setEditando(null);
      setErro(null);
      setSucesso(novo ? 'Treinamento cadastrado.' : 'Treinamento atualizado.');
      return carregar();
    });
  };

  const excluir = (t) => {
    if (!window.confirm(`Excluir o treinamento "${t.titulo}"?`)) return;
    excluirTreinamento(t.idTreinamento)
      .then(() => {
        setErro(null);
        setSucesso('Treinamento excluído.');
        return carregar();
      })
      .catch((error) => {
        setSucesso(null);
        setErro(error.response?.data?.mensagem || 'Não foi possível excluir o treinamento.');
      });
  };

  const termo = normalizar(busca.trim());
  const visiveis = (treinamentos || []).filter(
    (t) => !termo || normalizar(`${t.titulo} ${t.descricao || ''}`).includes(termo)
  );

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Treinamentos</h1>
          <p className="admin-subtitulo">Vídeos e manuais para aprender a usar o sistema.</p>
        </div>
        {ehMaster && (
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setEditando({})}>
            + Novo treinamento
          </button>
        )}
      </div>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && <div className="form-sucesso">{sucesso}</div>}

      {treinamentos === null ? (
        <p>Carregando treinamentos...</p>
      ) : treinamentos.length === 0 ? (
        <div className="admin-card ead-vazio">
          <span aria-hidden="true">📚</span>
          <p>
            {ehMaster
              ? 'Nenhum treinamento ainda. Clique em "+ Novo treinamento" para colocar o primeiro vídeo ou manual.'
              : 'Nenhum treinamento disponível ainda.'}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-filtros">
            <div className="admin-busca">
              <span className="admin-busca-icone">🔍</span>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar treinamento..."
                aria-label="Buscar treinamento"
              />
            </div>
            <span className="treino-contagem">
              {visiveis.length} de {treinamentos.length} {treinamentos.length === 1 ? 'treinamento' : 'treinamentos'}
            </span>
          </div>

          {visiveis.length === 0 ? (
            <p>Nenhum treinamento encontrado para "{busca}".</p>
          ) : (
            <div className="treino-grade">
              {visiveis.map((t) => {
                const player = urlDoPlayer(t.videoUrl);
                return (
                  <article key={t.idTreinamento} className="treino-card">
                    {player ? (
                      <div className="treino-video">
                        <iframe
                          src={player}
                          title={`Vídeo: ${t.titulo}`}
                          loading="lazy"
                          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="treino-sem-video" aria-hidden="true">📄</div>
                    )}
                    <div className="treino-corpo">
                      <h2>{t.titulo}</h2>
                      {t.descricao && <p className="treino-descricao">{t.descricao}</p>}
                      <div className="treino-acoes">
                        {t.temPdf && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-secundario"
                            onClick={() => setPdfAberto(t)}
                          >
                            📄 Abrir manual em PDF
                          </button>
                        )}
                        {ehMaster && (
                          <>
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-editar" onClick={() => setEditando(t)}>
                              Editar
                            </button>
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-excluir" onClick={() => excluir(t)}>
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                      {ehMaster && <UltimaAlteracao alvo="treinamentos" id={t.idTreinamento} />}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {editando && (
        <FormTreinamento
          treinamento={editando.idTreinamento ? editando : null}
          onSalvar={salvar}
          onFechar={() => setEditando(null)}
        />
      )}

      {pdfAberto && (
        <VisualizarDocumento
          documento={{ idDocumento: pdfAberto.idTreinamento, contentType: 'application/pdf', nomeArquivo: pdfAberto.pdfNome }}
          carregar={baixarPdfDoTreinamento}
          onFechar={() => setPdfAberto(null)}
        />
      )}
    </div>
  );
}

export default AdminTreinamentos;
