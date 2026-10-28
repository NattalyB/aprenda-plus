import { useState, useEffect } from 'react';
import { listarCursos } from '../services/cursoService';
import { useSearch } from '../context/SearchContext';
import CursoModal from '../components/CursoModal';
import PrecoCurso from '../components/PrecoCurso';
import { getImagemCurso } from '../utils/imagensCursos';
import { registrarBusca, TAMANHO_MINIMO_BUSCA } from '../services/eventoService';

// Remove acentos e deixa minúsculo, pra busca "analise" encontrar "Análise"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// A busca filtra enquanto a pessoa digita: só registra o termo (para o Comercial)
// depois que ela para de digitar por um instante, pra não contar "c", "ci", "cie"...
export const ESPERA_PARA_REGISTRAR_BUSCA = 1200;

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

  // Registra a busca quando a pessoa termina de digitar (com quantos cursos ela encontrou)
  useEffect(() => {
    const termoDigitado = (termoBusca || '').trim();
    if (carregando || erro || termoDigitado.length < TAMANHO_MINIMO_BUSCA) return undefined;
    const espera = setTimeout(() => {
      const chave = normalizar(termoDigitado);
      const encontrados = cursos.filter((curso) => normalizar(curso.nome).includes(chave)).length;
      registrarBusca(termoDigitado, encontrados);
    }, ESPERA_PARA_REGISTRAR_BUSCA);
    return () => clearTimeout(espera);
  }, [termoBusca, cursos, carregando, erro]);

  if (carregando) return <p style={{ textAlign: 'center', padding: '2rem' }}>Carregando cursos...</p>;
  if (erro) return <p style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{erro}</p>;

  const termo = normalizar(termoBusca);

  const cursosFiltrados = cursos.filter((curso) =>
    normalizar(curso.nome).includes(termo)
  );

  return (
    <>
      <section className="hero-banner">
        <div className="hero-text">
          <h2>APRENDA NOVAS HABILIDADES.<br />INVISTA NO SEU FUTURO.</h2>
        </div>
      </section>

      <main className="main-content">
        <h3 className="section-title">NOSSOS CURSOS</h3>

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
                  <PrecoCurso curso={curso} variante="card" />
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