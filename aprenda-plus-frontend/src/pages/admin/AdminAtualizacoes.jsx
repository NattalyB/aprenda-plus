import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  criarAtualizacao,
  editarAtualizacao,
  excluirAtualizacao,
  listarAtualizacoes,
} from '../../services/atualizacaoService';
import {
  TIPOS,
  agruparPorMes,
  dataPublicacao,
  iconeTipo,
  lerVistas,
  manutencoesPendentes,
  marcarVistas,
  periodoManutencao,
  rotuloTipo,
  situacaoManutencao,
} from '../../utils/atualizacoes';

const VAZIO = { titulo: '', tipo: 'novidade', versao: '', descricao: '', inicioManutencao: '', fimManutencao: '' };

// "2026-11-20T22:00:00" -> "2026-11-20T22:00" (formato do campo de data e hora)
const paraCampo = (valor) => (valor ? String(valor).slice(0, 16) : '');

// Atualizações do sistema: o que mudou e as manutenções programadas.
// Toda a equipe consulta; só o Master publica, edita e exclui.
function AdminAtualizacoes() {
  const { acesso, recarregarAtualizacoes } = useOutletContext() || {};
  const master = Boolean(acesso?.master);
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [form, setForm] = useState(null); // null = fechado; { ...campos, id? }
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [erroForm, setErroForm] = useState(null);
  // O que era "novo" quando a pessoa abriu a tela (continua destacado enquanto ela está aqui)
  const [vistasAoAbrir] = useState(lerVistas);

  const carregar = () =>
    listarAtualizacoes()
      .then((dados) => {
        setLista(dados || []);
        marcarVistas(dados || []);
      })
      .catch(() => setErro('Não foi possível carregar as atualizações.'));

  useEffect(() => {
    carregar();
  }, []);

  const mudar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }));

  const salvar = (e) => {
    e.preventDefault();
    setSalvando(true);
    setErroForm(null);
    const manutencao = form.tipo === 'manutencao';
    const dados = {
      titulo: form.titulo,
      tipo: form.tipo,
      versao: form.versao,
      descricao: form.descricao,
      inicioManutencao: manutencao && form.inicioManutencao ? form.inicioManutencao : null,
      fimManutencao: manutencao && form.fimManutencao ? form.fimManutencao : null,
    };
    (form.id ? editarAtualizacao(form.id, dados) : criarAtualizacao(dados))
      .then(() => {
        setForm(null);
        carregar();
        recarregarAtualizacoes?.();
      })
      .catch((error) => setErroForm(error.response?.data?.mensagem || 'Não foi possível salvar a atualização.'))
      .finally(() => setSalvando(false));
  };

  const editar = (a) => {
    setErroForm(null);
    setForm({
      id: a.idAtualizacao,
      titulo: a.titulo || '',
      tipo: a.tipo,
      versao: a.versao || '',
      descricao: a.descricao || '',
      inicioManutencao: paraCampo(a.inicioManutencao),
      fimManutencao: paraCampo(a.fimManutencao),
    });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const excluir = (a) => {
    if (!window.confirm(`Excluir a atualização "${a.titulo}"?`)) return;
    excluirAtualizacao(a.idAtualizacao)
      .then(() => {
        carregar();
        recarregarAtualizacoes?.();
      })
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível excluir a atualização.'));
  };

  const todas = lista || [];
  const pendentes = manutencoesPendentes(todas);
  const contagem = (tipo) => todas.filter((a) => a.tipo === tipo).length;
  const visiveis = todas.filter((a) => filtro === 'todos' || a.tipo === filtro);
  const ehNova = (a) => vistasAoAbrir !== null && (a.idAtualizacao || 0) > vistasAoAbrir;

  return (
    <div className="atualizacoes">
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Atualizações do sistema</h1>
          <p className="admin-subtitulo">
            O que mudou no AprendaPlus e as manutenções programadas. Toda novidade também aparece no sininho.
          </p>
        </div>
        {master && !form && (
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => setForm({ ...VAZIO })}>
            + Publicar atualização
          </button>
        )}
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      {master && form && (
        <form className="admin-card atualizacoes-form" onSubmit={salvar}>
          <h2>{form.id ? 'Editar atualização' : 'Nova atualização'}</h2>
          {erroForm && <div className="form-erro">{erroForm}</div>}
          <div className="atualizacoes-form-linha">
            <label className="atualizacoes-campo atualizacoes-campo-titulo">
              Título
              <input type="text" value={form.titulo} onChange={mudar('titulo')} maxLength={150} required
                placeholder="Ex.: Novo relatório de matrículas" />
            </label>
            <label className="atualizacoes-campo">
              Tipo
              <select value={form.tipo} onChange={mudar('tipo')}>
                {TIPOS.map((t) => <option key={t.chave} value={t.chave}>{t.icone} {t.rotulo}</option>)}
              </select>
            </label>
            <label className="atualizacoes-campo atualizacoes-campo-versao">
              Versão <small>(opcional)</small>
              <input type="text" value={form.versao} onChange={mudar('versao')} maxLength={20} placeholder="v2.1" />
            </label>
          </div>
          {form.tipo === 'manutencao' && (
            <div className="atualizacoes-form-linha">
              <label className="atualizacoes-campo">
                Início da manutenção
                <input type="datetime-local" value={form.inicioManutencao} onChange={mudar('inicioManutencao')} required />
              </label>
              <label className="atualizacoes-campo">
                Fim da manutenção
                <input type="datetime-local" value={form.fimManutencao} onChange={mudar('fimManutencao')} required />
              </label>
              <p className="atualizacoes-dica">
                Até o fim da manutenção, um aviso aparece no topo do painel e do Portal do Professor.
              </p>
            </div>
          )}
          <label className="atualizacoes-campo">
            O que mudou
            <textarea value={form.descricao} onChange={mudar('descricao')} rows={4} maxLength={5000} required
              placeholder={form.tipo === 'manutencao'
                ? 'Ex.: O sistema ficará fora do ar por cerca de 30 minutos para a troca do servidor.'
                : 'Explique a mudança com palavras simples: o que dá para fazer agora e onde fica.'} />
          </label>
          <div className="atualizacoes-form-acoes">
            <button type="button" className="admin-btn admin-btn-secundario" onClick={() => setForm(null)} disabled={salvando}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Publicar'}
            </button>
          </div>
        </form>
      )}

      {pendentes.length > 0 && (
        <section className="atualizacoes-programadas" aria-label="Manutenções programadas">
          <h2>🔧 Manutenções programadas</h2>
          <ul>
            {pendentes.map((m) => (
              <li key={m.idAtualizacao} className={situacaoManutencao(m) === 'andamento' ? 'em-andamento' : ''}>
                <strong>{periodoManutencao(m)}</strong>
                <span>{situacaoManutencao(m) === 'andamento' ? 'Em andamento' : 'Programada'}</span>
                <p>{m.titulo}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lista !== null && todas.length > 0 && (
        <div className="admin-chips atualizacoes-chips">
          <button type="button" className={filtro === 'todos' ? 'admin-chip ativo' : 'admin-chip'} onClick={() => setFiltro('todos')}>
            Todas <span className="admin-chip-num">{todas.length}</span>
          </button>
          {TIPOS.map((t) => (
            <button key={t.chave} type="button" className={filtro === t.chave ? 'admin-chip ativo' : 'admin-chip'}
              onClick={() => setFiltro(t.chave)}>
              {t.icone} {t.plural} <span className="admin-chip-num">{contagem(t.chave)}</span>
            </button>
          ))}
        </div>
      )}

      {lista === null ? (
        !erro && <p>Carregando atualizações...</p>
      ) : visiveis.length === 0 ? (
        <div className="admin-card ead-vazio">
          <span aria-hidden="true">📢</span>
          <p>{todas.length === 0 ? 'Nenhuma atualização publicada ainda.' : 'Nenhuma atualização deste tipo.'}</p>
        </div>
      ) : (
        agruparPorMes(visiveis).map((grupo) => (
          <section key={grupo.mes} className="atualizacoes-mes">
            <h2 className="atualizacoes-mes-titulo">{grupo.mes}</h2>
            <ol className="atualizacoes-linha-do-tempo">
              {grupo.itens.map((a) => (
                <li key={a.idAtualizacao} className={`atualizacao atualizacao-${a.tipo}`}>
                  <span className="atualizacao-marcador" aria-hidden="true">{iconeTipo(a.tipo)}</span>
                  <article className="atualizacao-cartao">
                    <header>
                      <span className={`atualizacao-tipo atualizacao-tipo-${a.tipo}`}>{rotuloTipo(a.tipo)}</span>
                      {a.versao && <span className="atualizacao-versao">{a.versao}</span>}
                      <time dateTime={a.publicadoEm}>{dataPublicacao(a.publicadoEm)}</time>
                      {ehNova(a) && <span className="atualizacao-nova">Nova</span>}
                    </header>
                    <h3>{a.titulo}</h3>
                    {a.tipo === 'manutencao' && a.inicioManutencao && (
                      <p className="atualizacao-periodo">
                        🗓 {periodoManutencao(a)}
                        {situacaoManutencao(a) === 'concluida' && ' · concluída'}
                      </p>
                    )}
                    <p className="atualizacao-descricao">{a.descricao}</p>
                    {master && (
                      <div className="atualizacao-acoes">
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-editar" onClick={() => editar(a)}>Editar</button>
                        <button type="button" className="admin-btn admin-btn-sm admin-btn-excluir" onClick={() => excluir(a)}>
                          Excluir
                        </button>
                      </div>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

export default AdminAtualizacoes;
