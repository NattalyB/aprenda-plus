import { useState, useEffect } from 'react';
import { listarCursos } from '../services/cursoService';
import { useSearch } from '../context/SearchContext';
import CursoModal from '../components/CursoModal';
import { getImagemCurso } from '../utils/imagensCursos';

function Home() {
  const [cursos, setCursos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const { termoBusca } = useSearch();

  useEffect(() => {
    listarCursos()
      .then((response) => {
        setCursos(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar os cursos.');
        setCarregando(false);
      });
  }, []);

  if (carregando) return <p style={{ textAlign: 'center', padding: '2rem' }}>Carregando cursos...</p>;
  if (erro) return <p style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{erro}</p>;

  const cursosFiltrados = cursos.filter((curso) =>
    curso.nome.toLowerCase().includes(termoBusca.toLowerCase())
  );

  return (
    <>
      <section className="hero-banner">
        <div className="hero-text">
          <h2>APRENDA NOVAS HABILIDADES.<br />INVISTA NO SEU FUTURO.</h2>
        </div>
      </section>

      <main className="main-content">
        <h3 className="section-title">CURSOS MAIS VENDIDOS</h3>

        {cursosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center' }}>Nenhum curso encontrado.</p>
        ) : (
          <div className="courses-grid">
            {cursosFiltrados.map((curso) => {
              const imagem = getImagemCurso(curso.nome);

              return (
                <div className="course-card" key={curso.idCurso}>
                  {imagem ? (
                    <img
                      src={imagem}
                      alt={`Banner do curso ${curso.nome}`}
                      className="course-img"
                      loading="lazy"
                      onClick={() => setCursoSelecionado(curso)}
                    />
                  ) : (
                    <div className="course-img-placeholder">Aprenda+</div>
                  )}
                  <h4>{curso.nome}</h4>
                  <div className="course-price">R$ {curso.valor}</div>
                  <div className="course-buttons">
                    <button className="btn-details" onClick={() => setCursoSelecionado(curso)}>
                      MAIS DETALHES
                    </button>
                    <button className="btn-buy" onClick={() => setCursoSelecionado(curso)}>
                      ADICIONAR AO CARRINHO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CursoModal curso={cursoSelecionado} onClose={() => setCursoSelecionado(null)} />
    </>
  );
}

export default Home;