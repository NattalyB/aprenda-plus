import { useEffect, useState } from 'react';
import { baixarArquivoDoDocumento } from '../services/documentoService';

// Janela que mostra o documento (PDF ou foto) sem sair da tela.
// O arquivo vem da API com o token de quem está logado, por isso não dá pra usar um link direto.
function VisualizarDocumento({ documento, onFechar, children }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let endereco = null;
    let ativo = true;
    baixarArquivoDoDocumento(documento.idDocumento)
      .then((resposta) => {
        if (!ativo) return;
        const blob = new Blob([resposta.data], { type: documento.contentType });
        endereco = URL.createObjectURL(blob);
        setUrl(endereco);
      })
      .catch(() => ativo && setErro('Não foi possível abrir o documento.'));
    return () => {
      ativo = false;
      if (endereco) URL.revokeObjectURL(endereco);
    };
  }, [documento.idDocumento, documento.contentType]);

  useEffect(() => {
    const fecharComEsc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [onFechar]);

  const ehPdf = documento.contentType === 'application/pdf';

  return (
    <div className="doc-visualizar-fundo" role="dialog" aria-modal="true" aria-label={`Documento ${documento.nomeArquivo}`}>
      <div className="doc-visualizar">
        <div className="doc-visualizar-topo">
          <strong title={documento.nomeArquivo}>{documento.nomeArquivo}</strong>
          <div className="doc-visualizar-acoes">
            {url && (
              <a className="admin-btn admin-btn-secundario" href={url} download={documento.nomeArquivo}>
                Baixar
              </a>
            )}
            <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar}>
              Fechar
            </button>
          </div>
        </div>

        <div className="doc-visualizar-conteudo">
          {erro && <div className="form-erro">{erro}</div>}
          {!erro && !url && <p className="minhas-dica">Abrindo documento...</p>}
          {url &&
            (ehPdf ? (
              <iframe src={url} title={documento.nomeArquivo} />
            ) : (
              <img src={url} alt={`Documento enviado: ${documento.nomeArquivo}`} />
            ))}
        </div>

        {children && <div className="doc-visualizar-rodape">{children}</div>}
      </div>
    </div>
  );
}

export default VisualizarDocumento;
