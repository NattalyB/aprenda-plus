import { useState } from 'react';
import { formatarDataHora } from '../../../utils/salaDeAula';

// Edição de um aviso já publicado (no lugar do cartão)
function EditarAviso({ aviso, onSalvar, onCancelar }) {
  const [form, setForm] = useState({ titulo: aviso.titulo, mensagem: aviso.mensagem, fixado: aviso.fixado });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const mudar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((atual) => ({ ...atual, [name]: type === 'checkbox' ? checked : value }));
  };

  const salvar = (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      setErro('Preencha o título e a mensagem do aviso.');
      return;
    }
    setErro(null);
    setSalvando(true);
    onSalvar(form).catch((error) => {
      setErro(error.response?.data?.mensagem || 'Não foi possível salvar o aviso.');
      setSalvando(false);
    });
  };

  const id = `editar-aviso-${aviso.idAviso}`;
  return (
    <form className="sala-aviso editando" onSubmit={salvar} noValidate aria-label={`Editar aviso ${aviso.titulo}`}>
      {erro && <div className="form-erro">{erro}</div>}
      <div className="form-field">
        <label htmlFor={`${id}-titulo`}>Título do aviso</label>
        <input id={`${id}-titulo`} name="titulo" maxLength={120} value={form.titulo} onChange={mudar} />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-mensagem`}>Mensagem do aviso</label>
        <textarea id={`${id}-mensagem`} name="mensagem" rows={5} maxLength={4000} value={form.mensagem} onChange={mudar} />
      </div>
      <label className="ead-form-check">
        <input type="checkbox" name="fixado" checked={form.fixado} onChange={mudar} />
        📌 Fixar no topo do mural
      </label>
      <div className="ead-mural-rodape">
        <span className="form-dica">Editar não envia e-mail de novo.</span>
        <div className="admin-acoes">
          <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="admin-btn admin-btn-sm admin-btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </form>
  );
}

// Mural de avisos da turma no painel: publicar (com opção de e-mail), editar e excluir
function MuralDaTurma({ avisos, onPublicar, onEditar, onExcluir }) {
  const [form, setForm] = useState({ titulo: '', mensagem: '', fixado: false, enviarEmail: false });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null); // id do aviso em edição

  const mudar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((atual) => ({ ...atual, [name]: type === 'checkbox' ? checked : value }));
  };

  const publicar = (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      setErro('Preencha o título e a mensagem do aviso.');
      return;
    }
    setErro(null);
    setSalvando(true);
    onPublicar(form)
      .then(() => setForm({ titulo: '', mensagem: '', fixado: false, enviarEmail: false }))
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível publicar o aviso.'))
      .finally(() => setSalvando(false));
  };

  return (
    <div className="ead-mural">
      <form className="admin-card ead-mural-form" onSubmit={publicar} noValidate>
        <h3>Novo aviso</h3>
        {erro && <div className="form-erro">{erro}</div>}
        <div className="form-field">
          <label htmlFor="aviso-titulo">Título</label>
          <input id="aviso-titulo" name="titulo" maxLength={120} value={form.titulo} onChange={mudar} placeholder="Ex.: Prova no dia 10" />
        </div>
        <div className="form-field">
          <label htmlFor="aviso-mensagem">Mensagem</label>
          <textarea id="aviso-mensagem" name="mensagem" rows={4} maxLength={4000} value={form.mensagem} onChange={mudar} />
        </div>
        <label className="ead-form-check">
          <input type="checkbox" name="fixado" checked={form.fixado} onChange={mudar} />
          📌 Fixar no topo do mural
        </label>
        <label className="ead-form-check">
          <input type="checkbox" name="enviarEmail" checked={form.enviarEmail} onChange={mudar} />
          ✉️ Avisar os alunos da turma por e-mail
        </label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
          {salvando ? 'Publicando...' : 'Publicar aviso'}
        </button>
      </form>

      <div className="ead-mural-lista">
        {avisos.length === 0 ? (
          <p className="form-dica">Nenhum aviso publicado nesta turma.</p>
        ) : (
          avisos.map((aviso) =>
            editando === aviso.idAviso ? (
              <EditarAviso
                key={aviso.idAviso}
                aviso={aviso}
                onSalvar={(dados) => onEditar(aviso, dados).then(() => setEditando(null))}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <article key={aviso.idAviso} className={aviso.fixado ? 'sala-aviso fixado' : 'sala-aviso'}>
                <h3>
                  {aviso.fixado && <span aria-label="Aviso fixado">📌 </span>}
                  {aviso.titulo}
                </h3>
                <p className="sala-aviso-texto">{aviso.mensagem}</p>
                <div className="ead-mural-rodape">
                  <span className="sala-aviso-autor">
                    {[aviso.autor, formatarDataHora(aviso.criadoEm)].filter(Boolean).join(' · ')}
                  </span>
                  <div className="admin-acoes">
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-editar"
                      onClick={() => setEditando(aviso.idAviso)}
                      aria-label={`Editar aviso ${aviso.titulo}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-excluir"
                      onClick={() => onExcluir(aviso)}
                      aria-label={`Excluir aviso ${aviso.titulo}`}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            )
          )
        )}
      </div>
    </div>
  );
}

export default MuralDaTurma;
