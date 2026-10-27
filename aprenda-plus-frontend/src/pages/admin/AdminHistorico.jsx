import { useEffect, useState } from 'react';
import { buscarAtividades } from '../../services/atividadeService';
import { formatarDataHora } from '../../utils/salaDeAula';
import Paginacao from '../../components/admin/Paginacao';

// Os mesmos nomes de módulo que o servidor grava (AtividadeTexto.java)
export const MODULOS_HISTORICO = [
  'Alunos', 'Professores', 'Cursos', 'Disciplinas', 'Períodos letivos', 'Turmas', 'Sala de aula (EAD)',
  'Inscrições', 'Matrículas', 'Financeiro', 'Funcionários', 'Treinamentos', 'Sistema', 'Outros',
];

export const ACOES = {
  cadastrou: { texto: 'Cadastrou', classe: 'hist-acao-cadastrou' },
  alterou: { texto: 'Alterou', classe: 'hist-acao-alterou' },
  excluiu: { texto: 'Excluiu', classe: 'hist-acao-excluiu' },
  importou: { texto: 'Importou', classe: 'hist-acao-importou' },
};

export const TIPOS_USUARIO = {
  funcionario: 'Equipe',
  aluno: 'Aluno',
  visitante: 'Visitante',
};

const FILTROS_VAZIOS = { busca: '', modulo: '', acao: '', tipo: '', de: '', ate: '' };

// Histórico de alterações (só o Master): quem cadastrou, alterou ou excluiu, e quando
function AdminHistorico() {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Espera a pessoa parar de digitar antes de buscar
  useEffect(() => {
    const espera = setTimeout(() => setBuscaAplicada(filtros.busca.trim()), 400);
    return () => clearTimeout(espera);
  }, [filtros.busca]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscarAtividades({
      busca: buscaAplicada,
      modulo: filtros.modulo,
      acao: filtros.acao,
      tipo: filtros.tipo,
      de: filtros.de,
      ate: filtros.ate,
      pagina,
      tamanho: porPagina,
    })
      .then((r) => {
        if (!ativo) return;
        setDados(r);
        setErro(null);
      })
      .catch((error) => {
        if (!ativo) return;
        setErro(error.response?.data?.erro || error.response?.data?.mensagem || 'Não foi possível carregar o histórico.');
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [buscaAplicada, filtros.modulo, filtros.acao, filtros.tipo, filtros.de, filtros.ate, pagina, porPagina]);

  const mudar = (e) => {
    const { name, value } = e.target;
    setFiltros((atual) => ({ ...atual, [name]: value }));
    setPagina(1);
  };

  const limpar = () => {
    setFiltros(FILTROS_VAZIOS);
    setBuscaAplicada('');
    setPagina(1);
  };

  const temFiltro = Object.values(filtros).some((v) => v !== '');
  const itens = dados?.itens || [];

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Histórico de alterações</h1>
          <p className="admin-subtitulo">Quem cadastrou, alterou ou excluiu cada informação do sistema, e quando.</p>
        </div>
      </div>

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="busca"
            value={filtros.busca}
            onChange={mudar}
            placeholder="Buscar por pessoa ou pelo que foi feito..."
            aria-label="Buscar no histórico"
          />
        </div>
        <select name="modulo" className="admin-filtro-select" value={filtros.modulo} onChange={mudar} aria-label="Módulo">
          <option value="">Todos os módulos</option>
          {MODULOS_HISTORICO.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="admin-filtros hist-filtros-linha2">
        <select name="acao" className="admin-filtro-select" value={filtros.acao} onChange={mudar} aria-label="Ação">
          <option value="">Todas as ações</option>
          {Object.entries(ACOES).map(([valor, a]) => (
            <option key={valor} value={valor}>{a.texto}</option>
          ))}
        </select>
        <select name="tipo" className="admin-filtro-select" value={filtros.tipo} onChange={mudar} aria-label="Quem fez">
          <option value="">Equipe, alunos e visitantes</option>
          {Object.entries(TIPOS_USUARIO).map(([valor, texto]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>
        <label className="hist-data">
          De
          <input type="date" name="de" value={filtros.de} onChange={mudar} />
        </label>
        <label className="hist-data">
          Até
          <input type="date" name="ate" value={filtros.ate} onChange={mudar} />
        </label>
        {temFiltro && (
          <button type="button" className="admin-btn admin-btn-secundario" onClick={limpar}>
            Limpar filtros
          </button>
        )}
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      {!dados && carregando ? (
        <p>Carregando histórico...</p>
      ) : itens.length === 0 ? (
        <div className="admin-card ead-vazio">
          <span aria-hidden="true">🕒</span>
          <p>{temFiltro ? 'Nenhuma alteração encontrada com esses filtros.' : 'Nenhuma alteração registrada ainda.'}</p>
        </div>
      ) : (
        <div className={carregando ? 'admin-card hist-carregando' : 'admin-card'}>
          <div className="admin-table-wrapper">
            <table className="admin-table hist-tabela">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Quem</th>
                  <th>Módulo</th>
                  <th>O que fez</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((r) => {
                  const acao = ACOES[r.acao] || ACOES.alterou;
                  return (
                    <tr key={r.idRegistro}>
                      <td className="hist-quando">{formatarDataHora(r.quando)}</td>
                      <td>
                        <span className="hist-quem">{r.usuarioNome}</span>
                        <span className={`hist-tipo hist-tipo-${r.usuarioTipo}`}>{TIPOS_USUARIO[r.usuarioTipo] || r.usuarioTipo}</span>
                      </td>
                      <td>{r.modulo}</td>
                      <td>
                        <span className={`hist-acao ${acao.classe}`}>{acao.texto}</span> {r.descricao}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacao
            pagina={dados.pagina}
            totalPaginas={dados.totalPaginas}
            total={dados.total}
            porPagina={porPagina}
            inicio={(dados.pagina - 1) * porPagina}
            irPara={(p) => setPagina(Math.min(Math.max(1, p), dados.totalPaginas))}
            mudarPorPagina={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
            nome="alterações"
          />
        </div>
      )}
    </div>
  );
}

export default AdminHistorico;
