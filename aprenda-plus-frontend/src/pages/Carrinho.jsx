import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listarItensDoCarrinho, removerItemDoCarrinho } from '../services/carrinhoService';
import { buscarTurmasPorCurso } from '../services/cursoService';
import { criarInscricao } from '../services/inscricaoService';
import { estaLogado } from '../services/authService';

function Carrinho() {
  const navigate = useNavigate();
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const carregarCarrinho = () => {
    if (!estaLogado()) {
      setErro('Você precisa fazer login para ver o carrinho.');
      setCarregando(false);
      return;
    }

    listarItensDoCarrinho()
      .then((dados) => {
        setItens(dados);
        setCarregando(false);
      })
      .catch(() => {
        setErro('Não foi possível carregar o carrinho.');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarCarrinho();
  }, []);

  const handleRemover = (idItem) => {
    removerItemDoCarrinho(idItem).then(() => {
      carregarCarrinho();
    });
  };

  const handleConcluirInscricao = () => {
    setFinalizando(true);
    setErro(null);
    const idAluno = localStorage.getItem('idAluno');

    // Pra cada item do carrinho, busca a primeira turma disponível do curso e cria a inscrição
    const promessas = itens.map((item) => {
      return buscarTurmasPorCurso(item.curso.idCurso).then((turmas) => {
        if (turmas.length === 0) {
          throw new Error(`O curso "${item.curso.nome}" ainda não tem turma disponível.`);
        }
        const turma = turmas[0];
        return criarInscricao(idAluno, turma.idTurma, item.curso.valor);
      });
    });

    Promise.all(promessas)
      .then(() => {
        setSucesso(true);
        setFinalizando(false);
      })
      .catch((error) => {
        setErro(error.message || 'Não foi possível concluir a inscrição.');
        setFinalizando(false);
      });
  };

  if (carregando) return <p>Carregando carrinho...</p>;

  if (sucesso) {
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
        <h1>Inscrição concluída!</h1>
        <p>Sua inscrição foi registrada com status "pendente de pagamento".</p>
        <Link to="/">← Voltar para a Home</Link>
      </div>
    );
  }

  if (erro && itens.length === 0) return <p style={{ color: 'red' }}>{erro}</p>;

  const valorTotal = itens.reduce((soma, item) => soma + Number(item.curso.valor), 0);

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
      <h1>Carrinho</h1>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      {itens.length === 0 ? (
        <p>Carrinho vazio</p>
      ) : (
        <>
          {itens.map((item) => (
            <div key={item.idItem} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', padding: '0.5rem 0' }}>
              <span>{item.curso.nome}</span>
              <span>R$ {item.curso.valor}</span>
              <button onClick={() => handleRemover(item.idItem)}>Remover</button>
            </div>
          ))}

          <p style={{ marginTop: '1rem' }}><strong>Total: R$ {valorTotal.toFixed(2)}</strong></p>

          <button onClick={handleConcluirInscricao} disabled={itens.length === 0 || finalizando}>
            {finalizando ? 'Processando...' : 'Concluir a inscrição'}
          </button>
        </>
      )}

      <p style={{ marginTop: '2rem' }}>
        <Link to="/">← Continuar navegando</Link>
      </p>
    </div>
  );
}

export default Carrinho;