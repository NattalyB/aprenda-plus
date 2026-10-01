import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarItensDoCarrinho, removerItemDoCarrinho } from '../services/carrinhoService';
import { buscarTurmasPorCurso } from '../services/cursoService';
import { criarInscricao } from '../services/inscricaoService';
import { estaLogado } from '../services/authService';
import { mostrarAviso } from '../services/avisoService';
import { getImagemCurso } from '../utils/imagensCursos';

const formatarValor = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Carrinho() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const logado = estaLogado();

  const carregarCarrinho = () => {
    if (!estaLogado()) {
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

  const handleRemover = (item) => {
    setRemovendoId(item.idItem);
    removerItemDoCarrinho(item.idItem)
      .then(() => {
        mostrarAviso(`"${item.curso.nome}" foi removido do carrinho.`, 'sucesso');
        carregarCarrinho();
      })
      .catch(() => {
        mostrarAviso('Não foi possível remover o curso. Tente novamente.', 'erro');
      })
      .finally(() => setRemovendoId(null));
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
        // Inscrições criadas: esvazia o carrinho
        return Promise.all(itens.map((item) => removerItemDoCarrinho(item.idItem)));
      })
      .then(() => {
        setItens([]);
        setSucesso(true);
        setFinalizando(false);
      })
      .catch((error) => {
        setErro(error.message || 'Não foi possível concluir a inscrição.');
        setFinalizando(false);
      });
  };

  // ===== Carregando =====
  if (carregando) {
    return (
      <div className="carrinho-page">
        <p className="carrinho-carregando">Carregando carrinho...</p>
      </div>
    );
  }

  // ===== Sem login =====
  if (!logado) {
    return (
      <div className="carrinho-page">
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🔒</span>
          <h2>Faça login para ver seu carrinho</h2>
          <p>Entre na sua conta para adicionar cursos e concluir sua inscrição.</p>
          <div className="carrinho-estado-botoes">
            <Link to="/login" className="admin-btn admin-btn-primary">Entrar</Link>
            <Link to="/cadastro" className="admin-btn admin-btn-secundario">Criar conta</Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== Inscrição concluída =====
  if (sucesso) {
    return (
      <div className="carrinho-page">
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🎉</span>
          <h2>Inscrição concluída!</h2>
          <p>
            Sua inscrição foi registrada com status <strong>pendente de pagamento</strong>.
            Em breve você receberá as próximas instruções.
          </p>
          <div className="carrinho-estado-botoes">
            <Link to="/" className="admin-btn admin-btn-primary">Continuar navegando</Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== Carrinho vazio =====
  if (itens.length === 0) {
    return (
      <div className="carrinho-page">
        {erro && <div className="form-erro">{erro}</div>}
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🛒</span>
          <h2>Seu carrinho está vazio</h2>
          <p>Explore nossos cursos e encontre o próximo passo da sua carreira.</p>
          <div className="carrinho-estado-botoes">
            <Link to="/" className="admin-btn admin-btn-primary">Ver cursos</Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== Carrinho com itens =====
  const valorTotal = itens.reduce((soma, item) => soma + Number(item.curso.valor), 0);

  return (
    <div className="carrinho-page">
      <h1 className="carrinho-titulo">Meu carrinho</h1>
      <p className="carrinho-subtitulo">
        {itens.length} {itens.length === 1 ? 'curso selecionado' : 'cursos selecionados'}
      </p>

      {erro && <div className="form-erro">{erro}</div>}

      <div className="carrinho-layout">
        {/* ===== Lista de itens ===== */}
        <div className="carrinho-itens">
          {itens.map((item) => {
            const imagem = getImagemCurso(item.curso.nome);

            return (
              <div className="carrinho-item" key={item.idItem}>
                <div className="carrinho-item-img">
                  {imagem ? (
                    <img src={imagem} alt={`Banner do curso ${item.curso.nome}`} />
                  ) : (
                    <div className="carrinho-item-placeholder">Aprenda+</div>
                  )}
                </div>

                <div className="carrinho-item-info">
                  <h3>{item.curso.nome}</h3>
                  <div className="carrinho-item-tags">
                    {item.curso.categoria && (
                      <span className={`categoria-badge categoria-${item.curso.categoria}`}>
                        {item.curso.categoria}
                      </span>
                    )}
                    {item.curso.modalidade && (
                      <span className="carrinho-item-modalidade">📚 {item.curso.modalidade}</span>
                    )}
                    {item.curso.cargaHoraria && (
                      <span className="carrinho-item-modalidade">⏱️ {item.curso.cargaHoraria}h</span>
                    )}
                  </div>
                </div>

                <div className="carrinho-item-lado">
                  <span className="carrinho-item-preco">{formatarValor(item.curso.valor)}</span>
                  <button
                    className="carrinho-item-remover"
                    onClick={() => handleRemover(item)}
                    disabled={removendoId === item.idItem || finalizando}
                  >
                    {removendoId === item.idItem ? 'Removendo...' : 'Remover'}
                  </button>
                </div>
              </div>
            );
          })}

          <Link to="/" className="carrinho-continuar">← Continuar navegando</Link>
        </div>

        {/* ===== Resumo ===== */}
        <aside className="carrinho-resumo">
          <h2>Resumo do pedido</h2>

          <div className="carrinho-resumo-linha">
            <span>Subtotal ({itens.length} {itens.length === 1 ? 'curso' : 'cursos'})</span>
            <span>{formatarValor(valorTotal)}</span>
          </div>

          <div className="carrinho-resumo-total">
            <span>Total</span>
            <span>{formatarValor(valorTotal)}</span>
          </div>

          <button
            className="carrinho-btn-concluir"
            onClick={handleConcluirInscricao}
            disabled={finalizando}
          >
            {finalizando ? 'PROCESSANDO...' : 'CONCLUIR INSCRIÇÃO'}
          </button>

          <p className="carrinho-resumo-nota">
            🔒 Sua inscrição fica com status "pendente de pagamento" até a confirmação.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default Carrinho;