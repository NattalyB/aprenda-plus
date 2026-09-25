import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buscarCursoPorId } from '../services/cursoService';
import { adicionarAoCarrinho } from '../services/carrinhoService';
import { estaLogado } from '../services/authService';

function CursoDetalhe() {
  const { id } = useParams();
  const [curso, setCurso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  useEffect(() => {
    buscarCursoPorId(id)
      .then((response) => {
        setCurso(response.data);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Curso não encontrado.');
        setCarregando(false);
      });
  }, [id]);

  const handleAdicionarCarrinho = () => {
    if (!estaLogado()) {
      setMensagem('Você precisa fazer login para adicionar cursos ao carrinho.');
      return;
    }

    adicionarAoCarrinho(curso.idCurso)
      .then(() => {
        setMensagem('Curso adicionado ao carrinho!');
      })
      .catch(() => {
        setMensagem('Não foi possível adicionar ao carrinho.');
      });
  };

  if (carregando) return <p>Carregando...</p>;
  if (erro) return <p style={{ color: 'red' }}>{erro}</p>;

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
      <Link to="/">← Voltar</Link>
      <h1>{curso.nome}</h1>
      <p><strong>Categoria:</strong> {curso.categoria}</p>
      <p><strong>Descrição:</strong> {curso.descricao}</p>
      <p><strong>Conteúdo:</strong> {curso.conteudo}</p>
      <p><strong>Carga horária:</strong> {curso.cargaHoraria}h</p>
      <p><strong>Modalidade:</strong> {curso.modalidade}</p>
      <p><strong>Pré-requisitos:</strong> {curso.preRequisitos || 'Nenhum'}</p>
      <p><strong>Valor:</strong> R$ {curso.valor}</p>
      <p><strong>Formas de pagamento:</strong> {curso.formasPagamento}</p>

      {mensagem && <p>{mensagem}</p>}

      <button onClick={handleAdicionarCarrinho}>Adicionar ao carrinho</button>
    </div>
  );
}

export default CursoDetalhe;