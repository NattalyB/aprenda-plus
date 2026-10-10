import { useState, useEffect } from 'react';
import ColunaOrdenavel from '../../components/admin/ColunaOrdenavel';
import { useOrdenacao } from '../../utils/ordenacao';
import { Link } from 'react-router-dom';
import { listarDisciplinas, deletarDisciplina } from '../../services/disciplinaService';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Como pegar o valor de cada coluna na hora de ordenar
const CAMPOS_ORDENACAO = {
  id: (d) => d.idDisciplina,
  nome: (d) => d.nome,
  curso: (d) => d.curso?.nome,
  cargaHoraria: (d) => d.cargaHoraria,
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
      deletarDisciplina(id).then(() => carregar());
    }
  };

  // Lista de cursos (sem repetir) que aparecem nas disciplinas
  const cursosDisponiveis = [];
  disciplinas.forEach((d) => {
    if (d.curso && !cursosDisponiveis.some((c) => c.idCurso === d.curso.idCurso)) {
      cursosDisponiveis.push(d.curso);
    }
  });

  const termo = normalizar(busca.trim());

  const disciplinasFiltradas = disciplinas.filter((disciplina) => {
    const nomeConfere = !termo || normalizar(disciplina.nome).includes(termo);
    const cursoConfere = !cursoFiltro || String(disciplina.curso?.idCurso) === cursoFiltro;
    return nomeConfere && cursoConfere;
  });

  const { ordenados, ordem, alternar } = useOrdenacao(disciplinasFiltradas, CAMPOS_ORDENACAO);

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
        <Link to="/admin/disciplinas/novo" className="admin-btn admin-btn-primary">
          + Nova disciplina
        </Link>
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
                <ColunaOrdenavel coluna="curso" ordem={ordem} onOrdenar={alternar}>Curso</ColunaOrdenavel>
                <ColunaOrdenavel coluna="cargaHoraria" ordem={ordem} onOrdenar={alternar}>Carga horária</ColunaOrdenavel>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {disciplinasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-vazio">
                    {busca || cursoFiltro ? 'Nenhuma disciplina encontrada com esses filtros.' : 'Nenhuma disciplina cadastrada ainda.'}
                  </td>
                </tr>
              ) : (
                ordenados.map((disciplina) => (
                  <tr key={disciplina.idDisciplina}>
                    <td>{disciplina.idDisciplina}</td>
                    <td>{disciplina.nome}</td>
                    <td>{disciplina.curso?.nome || '-'}</td>
                    <td>{disciplina.cargaHoraria}h</td>
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
      </div>
    </div>
  );
}

export default AdminDisciplinas;