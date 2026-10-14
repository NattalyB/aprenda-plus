import { useEffect, useState } from 'react';
import { idDoYoutube, TIPOS_DE_AULA } from '../../../utils/salaDeAula';

const VAZIA = {
  titulo: '',
  idDisciplina: '',
  tipo: 'video',
  dataLiberacao: '',
  duracaoMinutos: '',
  videoUrl: '',
  materialUrl: '',
  conteudo: '',
  publicada: true,
};

// Janela para criar ou editar uma aula da sala EAD
function FormAula({ aula, disciplinas, onSalvar, onFechar }) {
  const [form, setForm] = useState(() =>
    aula
      ? {
          titulo: aula.titulo || '',
          idDisciplina: aula.idDisciplina ? String(aula.idDisciplina) : '',
          tipo: aula.tipo || 'video',
          dataLiberacao: aula.dataLiberacao || '',
          duracaoMinutos: aula.duracaoMinutos ? String(aula.duracaoMinutos) : '',
          videoUrl: aula.videoUrl || '',
          materialUrl: aula.materialUrl || '',
          conteudo: aula.conteudo || '',
          publicada: aula.publicada !== false,
        }
      : VAZIA
  );
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const fecharComEsc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [onFechar]);

  const mudar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((atual) => ({ ...atual, [name]: type === 'checkbox' ? checked : value }));
  };

  const idVideo = idDoYoutube(form.videoUrl);
  const videoInvalido = form.videoUrl.trim() !== '' && !idVideo;

  const salvar = (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      setErro('Informe o título da aula.');
      return;
    }
    if (videoInvalido) {
      setErro('Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...).');
      return;
    }
    setErro(null);
    setSalvando(true);
    onSalvar({
      titulo: form.titulo.trim(),
      idDisciplina: form.idDisciplina ? Number(form.idDisciplina) : null,
      tipo: form.tipo,
      dataLiberacao: form.dataLiberacao || null,
      duracaoMinutos: form.duracaoMinutos ? Number(form.duracaoMinutos) : null,
      videoUrl: form.videoUrl.trim() || null,
      materialUrl: form.materialUrl.trim() || null,
      conteudo: form.conteudo,
      publicada: form.publicada,
    }).catch((error) => {
      setErro(error.response?.data?.mensagem || 'Não foi possível salvar a aula.');
      setSalvando(false);
    });
  };

  return (
    <div className="doc-painel-fundo" role="dialog" aria-modal="true" aria-label={aula ? 'Editar aula' : 'Nova aula'}>
      <form className="doc-painel ead-form" onSubmit={salvar} noValidate>
        <div className="doc-painel-topo">
          <div>
            <h2>{aula ? `Editar aula ${aula.numero}` : 'Nova aula'}</h2>
            <p>O aluno vê o vídeo, o texto e o material na sala de aula.</p>
          </div>
          <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>

        {erro && <div className="form-erro">{erro}</div>}

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="titulo">Título da aula</label>
            <input id="titulo" name="titulo" maxLength={200} value={form.titulo} onChange={mudar} placeholder="Ex.: Introdução ao marketing digital" />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="idDisciplina">Disciplina</label>
              <select id="idDisciplina" name="idDisciplina" value={form.idDisciplina} onChange={mudar}>
                <option value="">Sem disciplina (aula geral)</option>
                {disciplinas.map((d) => (
                  <option key={d.idDisciplina} value={String(d.idDisciplina)}>{d.nome}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" value={form.tipo} onChange={mudar}>
                {Object.entries(TIPOS_DE_AULA).map(([valor, t]) => (
                  <option key={valor} value={valor}>{t.icone} {t.texto}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="dataLiberacao">Liberar a partir de (opcional)</label>
              <input id="dataLiberacao" name="dataLiberacao" type="date" value={form.dataLiberacao} onChange={mudar} />
            </div>
            <div className="form-field">
              <label htmlFor="duracaoMinutos">Duração em minutos (opcional)</label>
              <input id="duracaoMinutos" name="duracaoMinutos" type="number" min="1" max="600" value={form.duracaoMinutos} onChange={mudar} />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="videoUrl">Link do vídeo no YouTube (opcional)</label>
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
            <label htmlFor="materialUrl">Link do material de apoio (opcional)</label>
            <input id="materialUrl" name="materialUrl" value={form.materialUrl} onChange={mudar} placeholder="https://drive.google.com/..." />
          </div>

          <div className="form-field">
            <label htmlFor="conteudo">Texto da aula (opcional)</label>
            <textarea id="conteudo" name="conteudo" rows={6} value={form.conteudo} onChange={mudar} placeholder="Resumo, orientações ou exercícios..." />
          </div>

          <label className="ead-form-check">
            <input type="checkbox" name="publicada" checked={form.publicada} onChange={mudar} />
            Publicar para os alunos (desmarque para guardar como rascunho)
          </label>
        </div>

        <div className="doc-revisao-botoes">
          <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar aula'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormAula;
