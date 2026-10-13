import { useEffect, useState } from 'react';
import {
  listarMeusDocumentos,
  enviarMeuDocumento,
  conferirArquivoDoDocumento,
  STATUS_DOCUMENTO,
} from '../services/documentoService';
import { mostrarAviso } from '../services/avisoService';
import CampoArquivo from './CampoArquivo';
import VisualizarDocumento from './VisualizarDocumento';

// "2026-10-11T14:50:59" -> "11/10/2026"
const formatarData = (data) => {
  if (!data) return '';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

const EXPLICACAO = {
  pendente: 'A secretaria está conferindo seu certificado. Quando ele for aprovado e o pagamento confirmado, você recebe um e-mail e a matrícula é liberada.',
  aprovado: 'Tudo certo com a sua escolaridade. Não é preciso enviar mais nada.',
  recusado: 'Envie um novo arquivo para continuar com a matrícula.',
};

// Cartão "Documento de escolaridade" da área do aluno
function MeuDocumento() {
  const [documentos, setDocumentos] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [trocando, setTrocando] = useState(false);
  const [vendo, setVendo] = useState(null);

  useEffect(() => {
    listarMeusDocumentos()
      .then((resposta) => setDocumentos(resposta.data || []))
      .catch(() => setDocumentos(undefined)); // sem o cartão se a consulta falhar
  }, []);

  if (documentos === null || documentos === undefined) return null;

  // O aprovado vale mais que qualquer outro; senão, o mais recente (a lista já vem do mais novo pro mais antigo)
  const atual = documentos.find((d) => d.status === 'aprovado') || documentos[0];
  const status = atual ? STATUS_DOCUMENTO[atual.status] || STATUS_DOCUMENTO.pendente : null;
  const mostrarEnvio = !atual || atual.status === 'recusado' || trocando;

  const enviar = () => {
    const problema = conferirArquivoDoDocumento(arquivo);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setEnviando(true);
    enviarMeuDocumento(arquivo)
      .then((resposta) => {
        setDocumentos((lista) => [resposta.data, ...lista]);
        setArquivo(null);
        setTrocando(false);
        mostrarAviso('Documento enviado! A secretaria vai analisar em breve.', 'sucesso');
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível enviar o documento.'))
      .finally(() => setEnviando(false));
  };

  return (
    <section className="meu-documento" aria-label="Documento de escolaridade">
      <div className="meu-documento-topo">
        <h2>📜 Documento de escolaridade</h2>
        {status && (
          <span className={`doc-status ${status.classe}`}>
            {status.icone} {status.texto}
          </span>
        )}
      </div>

      {atual ? (
        <>
          <p className="meu-documento-texto">{EXPLICACAO[atual.status] || EXPLICACAO.pendente}</p>
          {atual.status === 'recusado' && atual.observacao && (
            <p className="meu-documento-motivo">
              <strong>Motivo:</strong> {atual.observacao}
            </p>
          )}
          <div className="meu-documento-arquivo">
            <span>
              {atual.nomeArquivo}
              {atual.enviadoEm && <small> · enviado em {formatarData(atual.enviadoEm)}</small>}
            </span>
            <button type="button" className="link-botao" onClick={() => setVendo(atual)}>
              Ver arquivo
            </button>
            {atual.status === 'pendente' && !trocando && (
              <button type="button" className="link-botao" onClick={() => setTrocando(true)}>
                Enviar outro arquivo
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="meu-documento-texto">
          Para liberar sua matrícula, envie o certificado (ou histórico) de conclusão do ensino médio.
        </p>
      )}

      {mostrarEnvio && (
        <div className="meu-documento-envio">
          {erro && <div className="form-erro">{erro}</div>}
          <CampoArquivo id="novo-documento" label="Novo certificado de conclusão" arquivo={arquivo} onChange={setArquivo} />
          <div className="meu-documento-acoes">
            {trocando && (
              <button
                type="button"
                className="admin-btn admin-btn-secundario"
                onClick={() => {
                  setTrocando(false);
                  setArquivo(null);
                  setErro(null);
                }}
              >
                Cancelar
              </button>
            )}
            <button type="button" className="admin-btn admin-btn-primary" onClick={enviar} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar documento'}
            </button>
          </div>
        </div>
      )}

      {vendo && <VisualizarDocumento documento={vendo} onFechar={() => setVendo(null)} />}
    </section>
  );
}

export default MeuDocumento;
