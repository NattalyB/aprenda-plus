import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { usePaginacao } from '../../utils/paginacao';
import Paginacao from '../../components/admin/Paginacao';
import { Link } from 'react-router-dom';
import { listarDisciplinas, deletarDisciplina } from '../../services/disciplinaService';
import ImportarPlanilha from '../../components/admin/ImportarPlanilha';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Nomes dos cursos da disciplina, em ordem alfabética: "ADS, Engenharia de Software"
const nomesDosCursos = (disciplina) =>
  (disciplina.cursos || [])
    .map((c) => c.nome)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .join(', ');

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (d) => d.idDisciplina,
  nome: (d) => d.nome,
  curso: (d) => nomesDosCursos(d),
  cargaHoraria: (d) => d.cargaHoraria,
  status: (d) => d.status || 'ativa',
};

function AdminDisciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [cursoFiltro, setCursoFiltro] = useState('');

  const carregar = () => {
    listarDisciplinas()
      .then((response) => {
        setDisciplinas(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar as disciplinas.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta disciplina?')) {
      deletarDisciplina(id)
        .then(() => {
          setErro(null);
          carregar();
        })
        // Se o servidor recusar (ex.: registro ligado a outros cadastros), mostra o motivo
        .catch((error) =>
          setErro(error.response?.data?.mensagem || 'Não foi possível excluir esta disciplina.')
        );
    }
  };

  // Lista de cursos (sem repetir) que aparecem nas disciplinas
  const cursosDisponiveis = [];
  disciplinas.forEach((d) => {
    (d.cursos || []).forEach((curso) => {
      if (!cursosDisponiveis.some((c) => c.idCurso === curso.idCurso)) {
        cursosDisponiveis.push(curso);
      }
    });
  });

  const termo = normalizar(busca.trim());

  const disciplinasFiltradas = disciplinas.filter((disciplina) => {
    const nomeConfere = !termo || normalizar(disciplina.nome).includes(termo);
    const cursoConfere = !cursoFiltro || (disciplina.cursos || []).some((c) => String(c.idCurso) === cursoFiltro);
    return nomeConfere && cursoConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(disciplinasFiltradas, CAMPOS_ORDENACAO);
  const pagina = usePaginacao(ordenados);

  if (carregando) return <p>Carregando disciplinas...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Disciplinas cadastradas</h1>
          <p className="admin-subtitulo">
            {disciplinasFiltradas.length} de {disciplinas.length} disciplina(s)
          </p>
        </div>
        <div className="admin-header-acoes">
          <ImportarPlanilha tipo="disciplinas" onConcluido={carregar} />
          <Link to="/admin/disciplinas/novo" className="admin-btn admin-btn-primary">
            + Nova disciplina
          </Link>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaDisciplina"
            placeholder="Buscar disciplina pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <select
          name="filtroCurso"
          className="admin-filtro-select"
          value={cursoFiltro}
          onChange={(e) => setCursoFiltro(e.target.value)}
        >
          <option value="">Todos os cursos</option>
          {cursosDisponiveis.map((curso) => (
            <option key={curso.idCurso} value={String(curso.idCurso)}>{curso.nome}</option>
          ))}
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <ColunaOrdenavel coluna="id" ordem={ordem} onOrdenar={alternar}>ID</ColunaOrdenavel>
                <ColunaOrdenavel coluna="nome" ordem={ordem} onOrdenar={alternar}>Nome</ColunaOrdenavel>
                <ColunaOrdenavel coluna="curso" ordem={ordem} onOrdenar={alternar}>Cursos</ColunaOrdenavel>
                <ColunaOrdenavel coluna="cargaHoraria" ordem={ordem} onOrdenar={alternar}>Carga horária</ColunaOrdenavel>
                <ColunaOrdenavel coluna="status" ordem={ordem} onOrdenar={alternar}>Status</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {disciplinasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-vazio">
                    {busca || cursoFiltro ? 'Nenhuma disciplina encontrada com esses filtros.' : 'Nenhuma disciplina cadastrada ainda.'}
                  </td>
                </tr>
              ) : (
                pagina.itens.map((disciplina) => (
                  <tr key={disciplina.idDisciplina}>
                    <td>{disciplina.idDisciplina}</td>
                    <td>{disciplina.nome}</td>
                    <td>{nomesDosCursos(disciplina) || '-'}</td>
                    <td>{disciplina.cargaHoraria}h</td>
                    <td>
                      <span className={`status-badge status-${disciplina.status || 'ativa'}`}>
                        {disciplina.status === 'inativa' ? 'Inativa' : 'Ativa'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/disciplinas/${disciplina.idDisciplina}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(disciplina.idDisciplina)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacao {...pagina} nome="disciplinas" />
      </div>
    </div>
  );
}

export default AdminDisciplinas;