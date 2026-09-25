import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarCursos } from '../services/cursoService';

function Home() {
  const [cursos, setCursos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

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

  if (carregando) return <p>Carregando cursos...</p>;
  if (erro) return <p style={{ color: 'red' }}>{erro}</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Cursos mais vendidos</h1>
      {cursos.length === 0 ? (
        <p>Nenhum curso cadastrado ainda.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {cursos.map((curso) => (
            <div key={curso.idCurso} style={{ border: '1px solid #444', borderRadius: '8px', padding: '1rem' }}>
              <h3>{curso.nome}</h3>
              <p>R$ {curso.valor}</p>
              <Link to={`/curso/${curso.idCurso}`}>Mais detalhes</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;