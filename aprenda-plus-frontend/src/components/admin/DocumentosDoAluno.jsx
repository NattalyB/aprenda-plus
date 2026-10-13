import { useEffect, useState } from 'react';
import {
  listarDocumentosDoAluno,
  revisarDocumento,
  STATUS_DOCUMENTO,
  formatarTamanho,
} from '../../services/documentoService';
import VisualizarDocumento from '../VisualizarDocumento';

// "2026-10-11T14:50:59" -> "11/10/2026 14:50"
const formatarDataHora = (data) => {
  if (!data) return '-';
  const [dia, hora = ''] = String(data).split('T');
  const [ano, mes, d] = dia.split('-');
  return `${d}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
};

// Botões de revisão que aparecem embaixo do documento aberto
function Revisao({ documento, onRevisado }) {
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const salvar = (status) => {
    setErro(null);
    setSalvando(true);
    revisarDocumento(documento.idDocumento, status, status === 'recusado' ? motivo : null)
      .then((resposta) => onRevisado(resposta.data))
      .catch((error) => {
        setErro(error.response?.data?.mensagem || 'Não foi possível salvar a revisão.');
        setSalvando(false);
      });
  };

  if (recusando) {
    return (
      <div className="doc-revisao">
        {erro && <div className="form-erro">{erro}</div>}
        <label htmlFor="motivo-recusa">Motivo da recusa (o aluno recebe por e-mail)</label>
        <textarea
          id="motivo-recusa"
          rows={3}
          maxLength={500}
          placeholder="Ex.: a foto está cortada, envie o documento inteiro."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="doc-revisao-botoes">
          <button type="button" className="admin-btn admin-btn-secundario" onClick={() => setRecusando(false)} disabled={salvando}>
            Voltar
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-excluir"
            onClick={() => salvar('recusado')}
            disabled={salvando || !motivo.trim()}
          >
            Confirmar recusa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-revisao">
      {erro && <div className="form-erro">{erro}</div>}
      <p className="form-dica">
        Confira se é um certificado ou histórico de conclusão do ensino médio, legível e no nome do aluno.
      </p>
      <div className="doc-revisao-botoes">
        {documento.status !== 'recusado' && (
          <button type="button" className="admin-btn admin-btn-secundario" onClick={() => setRecusando(true)} disabled={salvando}>
            ❌ Recusar
          </button>
        )}
        {documento.status !== 'aprovado' && (
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => salvar('aprovado')} disabled={salvando}>
            ✅ Aprovar documento
          </button>
        )}
      </div>
    </div>
  );
}

// Lista os documentos de escolaridade de um aluno e deixa a secretaria abrir, aprovar ou recusar.
// onAlterado é chamado depois de cada revisão (pra tela de fora atualizar o status).
function DocumentosDoAluno({ idAluno, onAlterado }) {
  const [documentos, setDocumentos] = useState(null);
  const [erro, setErro] = useState(null);
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    listarDocumentosDoAluno(idAluno)
      .then((resposta) => setDocumentos(resposta.data || []))
      .catch(() => setErro('Não foi possível carregar os documentos do aluno.'));
  }, [idAluno]);

  const revisado = (atualizado) => {
    setDocumentos((lista) => lista.map((d) => (d.idDocumento === atualizado.idDocumento ? atualizado : d)));
    setAberto(null);
    if (onAlterado) onAlterado(atualizado);
  };

  if (erro) return <div className="form-erro">{erro}</div>;
  if (!documentos) return <p className="form-dica">Carregando documentos...</p>;
  if (documentos.length === 0) {
    return <p className="form-dica">Este aluno ainda não enviou o certificado de conclusão.</p>;
  }

  return (
    <>
      <ul className="doc-lista">
        {documentos.map((documento) => {
          const status = STATUS_DOCUMENTO[documento.status] || STATUS_DOCUMENTO.pendente;
          return (
            <li key={documento.idDocumento}>
              <div className="doc-lista-info">
                <strong>{documento.nomeArquivo}</strong>
                <span>
                  {formatarTamanho(documento.tamanho)} · enviado em {formatarDataHora(documento.enviadoEm)}
                </span>
                {documento.status === 'recusado' && documento.observacao && (
                  <span className="doc-lista-motivo">Motivo: {documento.observacao}</span>
                )}
              </div>
              <span className={`doc-status ${status.classe}`}>
                {status.icone} {status.texto}
              </span>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={() => setAberto(documento)}>
                {documento.status === 'pendente' ? 'Analisar' : 'Abrir'}
              </button>
            </li>
          );
        })}
      </ul>

      {aberto && (
        <VisualizarDocumento documento={aberto} onFechar={() => setAberto(null)}>
          <Revisao documento={aberto} onRevisado={revisado} />
        </VisualizarDocumento>
      )}
    </>
  );
}

export default DocumentosDoAluno;
