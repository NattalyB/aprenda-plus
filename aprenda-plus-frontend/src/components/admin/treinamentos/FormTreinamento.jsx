import { useEffect, useState } from 'react';
import { idDoYoutube } from '../../../utils/salaDeAula';
import { conferirPdf } from '../../../services/treinamentoService';
import { formatarTamanho } from '../../../services/documentoService';

// Cadastro/edição de um treinamento (só o Master usa): vídeo do YouTube e/ou PDF
function FormTreinamento({ treinamento, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    titulo: treinamento?.titulo || '',
    descricao: treinamento?.descricao || '',
    videoUrl: treinamento?.videoUrl || '',
    ordem: treinamento?.ordem ?? '',
  });
  const [arquivo, setArquivo] = useState(null);
  const [removerPdf, setRemoverPdf] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const fecharComEsc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [onFechar]);

  const mudar = (e) => {
    const { name, value } = e.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  };

  const escolherArquivo = (e) => {
    const escolhido = e.target.files?.[0] || null;
    const problema = conferirPdf(escolhido);
    setErro(problema);
    setArquivo(problema ? null : escolhido);
    if (escolhido && !problema) setRemoverPdf(false);
  };

  const idVideo = idDoYoutube(form.videoUrl);
  const videoInvalido = form.videoUrl.trim() !== '' && !idVideo;
  const temPdfSalvo = Boolean(treinamento?.temPdf) && !removerPdf;

  const salvar = (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      setErro('Informe o título do treinamento.');
      return;
    }
    if (videoInvalido) {
      setErro('Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...).');
      return;
    }
    if (!idVideo && !arquivo && !temPdfSalvo) {
      setErro('Coloque o link de um vídeo do YouTube, anexe um PDF, ou os dois.');
      return;
    }
    setErro(null);
    setSalvando(true);
    onSalvar(
      {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        videoUrl: form.videoUrl.trim(),
        ordem: form.ordem === '' ? '' : Number(form.ordem),
      },
      arquivo,
      removerPdf && !arquivo
    ).catch((error) => {
      setErro(error.response?.data?.mensagem || 'Não foi possível salvar o treinamento.');
      setSalvando(false);
    });
  };

  return (
    <div className="doc-painel-fundo" role="dialog" aria-modal="true" aria-label={treinamento ? 'Editar treinamento' : 'Novo treinamento'}>
      <form className="doc-painel ead-form" onSubmit={salvar} noValidate>
        <div className="doc-painel-topo">
          <div>
            <h2>{treinamento ? 'Editar treinamento' : 'Novo treinamento'}</h2>
            <p>Toda a equipe do painel vê os treinamentos.</p>
          </div>
          <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>

        {erro && <div className="form-erro">{erro}</div>}

        <div className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="titulo">Título</label>
              <input id="titulo" name="titulo" maxLength={150} value={form.titulo} onChange={mudar} placeholder="Ex.: Como cadastrar um aluno" />
            </div>
            <div className="form-field treino-campo-ordem">
              <label htmlFor="ordem">Ordem (opcional)</label>
              <input id="ordem" name="ordem" type="number" min="0" value={form.ordem} onChange={mudar} placeholder="0" />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="descricao">Descrição (opcional)</label>
            <textarea id="descricao" name="descricao" rows={4} maxLength={5000} value={form.descricao} onChange={mudar} placeholder="O que a pessoa vai aprender, passo a passo..." />
          </div>

          <div className="form-field">
            <label htmlFor="videoUrl">Link do vídeo no YouTube</label>
            <input id="videoUrl" name="videoUrl" value={form.videoUrl} onChange={mudar} placeholder="https://www.youtube.com/watch?v=..." />
            {videoInvalido && <span className="ead-form-alerta">Esse link não é de um vídeo do YouTube.</span>}
            {idVideo && (
              <span className="ead-form-previa">
                <img src={`https://img.youtube.com/vi/${idVideo}/mqdefault.jpg`} alt="Prévia do vídeo" />
                Vídeo reconhecido ✓
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="pdf">Manual em PDF (até 5 MB)</label>
            {temPdfSalvo && !arquivo && (
              <span className="treino-pdf-atual">
                📄 {treinamento.pdfNome} ({formatarTamanho(treinamento.pdfTamanho)})
                <button type="button" className="admin-btn admin-btn-sm admin-btn-excluir" onClick={() => setRemoverPdf(true)}>
                  Remover PDF
                </button>
              </span>
            )}
            {removerPdf && !arquivo && (
              <span className="treino-pdf-atual">
                O PDF atual será removido ao salvar.
                <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => setRemoverPdf(false)}>
                  Desfazer
                </button>
              </span>
            )}
            <input id="pdf" type="file" accept=".pdf,application/pdf" onChange={escolherArquivo} />
            {arquivo && <span className="ead-form-previa">📄 {arquivo.name} ({formatarTamanho(arquivo.size)}) ✓</span>}
          </div>
        </div>

        <div className="doc-revisao-botoes">
          <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar treinamento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormTreinamento;
