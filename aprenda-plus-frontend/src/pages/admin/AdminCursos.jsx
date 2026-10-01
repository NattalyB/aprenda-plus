import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarCursos, deletarCurso } from '../../services/cursoService';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const formatarValor = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORIAS = [
  { valor: '', label: 'Todos' },
  { valor: 'superior', label: 'Superior' },
  { valor: 'profissionalizante', label: 'Profissionalizante' },
];

function AdminCursos() {
  const [cursos, setCursos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');

  const carregar = () => {
    listarCursos()
      .then((response) => {
        setCursos(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar os cursos.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este curso?')) {
      deletarCurso(id).then(() => carregar());
    }
  };

  const termo = normalizar(busca.trim());

  const cursosFiltrados = cursos.filter((curso) => {
    const nomeConfere = !termo || normalizar(curso.nome).includes(termo);
    const categoriaConfere = !categoria || curso.categoria === categoria;
    return nomeConfere && categoriaConfere;
  });

  if (carregando) return <p>Carregando cursos...</p>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Cursos cadastrados</h1>
          <p className="admin-subtitulo">
            {cursosFiltrados.length} de {cursos.length} curso(s)
          </p>
        </div>
        <Link to="/admin/cursos/novo" className="admin-btn admin-btn-primary">
          + Novo curso
        </Link>
      </div>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="admin-filtros">
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaCurso"
            placeholder="Buscar curso pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="admin-chips">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.valor}
              type="button"
              className={categoria === cat.valor ? 'admin-chip ativo' : 'admin-chip'}
              onClick={() => setCategoria(cat.valor)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Modalidade</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cursosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-vazio">
                    {busca || categoria ? 'Nenhum curso encontrado com esses filtros.' : 'Nenhum curso cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                cursosFiltrados.map((curso) => (
                  <tr key={curso.idCurso}>
                    <td>{curso.idCurso}</td>
                    <td>{curso.nome}</td>
                    <td>
                      <span className={`categoria-badge categoria-${curso.categoria}`}>{curso.categoria}</span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{curso.modalidade}</td>
                    <td>{formatarValor(curso.valor)}</td>
                    <td>
                      <div className="admin-acoes">
                        <Link
                          to={`/admin/cursos/${curso.idCurso}/editar`}
                          className="admin-btn admin-btn-sm admin-btn-editar"
                        >
                          Editar
                        </Link>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-excluir"
                          onClick={() => handleExcluir(curso.idCurso)}
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

export default AdminCursos;