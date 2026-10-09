import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarItensDoCarrinho, removerItemDoCarrinho } from '../services/carrinhoService';
import { buscarTurmasPorCurso } from '../services/cursoService';
import { criarInscricao } from '../services/inscricaoService';
import { estaLogado } from '../services/authService';
import { mostrarAviso } from '../services/avisoService';
import { getImagemCurso } from '../utils/imagensCursos';
import { formatarValor, arredondar, DESCONTO_PIX } from '../utils/precoCurso';
import PrecoCurso from '../components/PrecoCurso';

const PERCENTUAL_PIX = Math.round(DESCONTO_PIX * 100);

// Mensagem da tela de sucesso, de acordo com a forma de pagamento
const PROXIMOS_PASSOS = {
  pix: 'Em breve você receberá o código Pix para pagamento.',
  cartao: 'A cobrança no cartão será processada após a confirmação da sua inscrição.',
  boleto: 'Os boletos serão enviados para o seu e-mail.',
};

function Carrinho() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState(null); // 'pix' | 'cartao' | 'boleto'
  const [parcelasEscolhidas, setParcelasEscolhidas] = useState(1);
  const [pedidoConcluido, setPedidoConcluido] = useState(null);
  const logado = estaLogado();

  // Máximo de parcelas: o menor limite entre os cursos do carrinho
  const getMaxParcelas = (lista) => {
    if (lista.length === 0) return 1;
    return Math.max(1, Math.min(...lista.map((item) => Number(item.curso.numeroParcelas) || 1)));
  };

  const carregarCarrinho = () => {
    if (!estaLogado()) {
      setCarregando(false);
      return;
    }

    listarItensDoCarrinho()
      .then((dados) => {
        setItens(dados);
        // Se a quantidade de parcelas escolhida ficou acima do novo limite, ajusta
        setParcelasEscolhidas((atual) => Math.min(atual, getMaxParcelas(dados)));
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

  const selecionarForma = (forma) => {
    setFormaPagamento(forma);
    // Ao escolher cartão ou boleto, já sugere o máximo de parcelas (menor valor por mês)
    if (forma !== 'pix') {
      setParcelasEscolhidas(getMaxParcelas(itens));
    }
  };

  // ===== Cálculos do pedido =====
  const maxParcelas = getMaxParcelas(itens);
  const valorTotal = itens.reduce((soma, item) => soma + Number(item.curso.valor), 0);
  const descontoPix = arredondar(valorTotal * DESCONTO_PIX);
  const totalFinal = formaPagamento === 'pix' ? valorTotal - descontoPix : valorTotal;
  const parcelas = formaPagamento === 'pix' ? 1 : parcelasEscolhidas;
  const valorParcela = totalFinal / parcelas;

  const descreverPagamento = () => {
    if (formaPagamento === 'pix') return `Pix à vista (${PERCENTUAL_PIX}% de desconto)`;
    if (formaPagamento === 'cartao') return `Cartão de crédito · ${parcelas}x`;
    if (formaPagamento === 'boleto') return `Boleto bancário · ${parcelas}x`;
    return 'A definir';
  };

  const handleConcluirInscricao = () => {
    if (!formaPagamento) {
      mostrarAviso('Escolha a forma de pagamento para concluir.', 'aviso');
      return;
    }

    setFinalizando(true);
    setErro(null);
    const idAluno = localStorage.getItem('idAluno');
    const descricao = descreverPagamento();

    // Pra cada item do carrinho, busca a primeira turma disponível do curso e cria a inscrição
    const promessas = itens.map((item) => {
      const valorItem =
        formaPagamento === 'pix'
          ? arredondar(Number(item.curso.valor) * (1 - DESCONTO_PIX))
          : Number(item.curso.valor);

      return buscarTurmasPorCurso(item.curso.idCurso).then((turmas) => {
        if (turmas.length === 0) {
          throw new Error(`O curso "${item.curso.nome}" ainda não tem turma disponível.`);
        }
        const turma = turmas[0];
        return criarInscricao(idAluno, turma.idTurma, valorItem, descricao);
      });
    });

    Promise.all(promessas)
      .then(() => {
        // Inscrições criadas: esvazia o carrinho
        return Promise.all(itens.map((item) => removerItemDoCarrinho(item.idItem)));
      })
      .then(() => {
        setPedidoConcluido({
          forma: formaPagamento,
          descricao,
          total: totalFinal,
          parcelas,
          valorParcela,
        });
        setItens([]);
        setFinalizando(false);
      })
      .catch((error) => {
        // Se o servidor recusou (ex.: parcelas acima do limite), mostra a mensagem dele
        setErro(error.response?.data?.mensagem || error.message || 'Não foi possível concluir a inscrição.');
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
  if (pedidoConcluido) {
    return (
      <div className="carrinho-page">
        <div className="carrinho-estado">
          <span className="carrinho-estado-icone">🎉</span>
          <h2>Inscrição concluída!</h2>

          <div className="carrinho-sucesso-pagamento">
            <strong>{pedidoConcluido.descricao}</strong>
            <br />
            {pedidoConcluido.parcelas > 1
              ? `${pedidoConcluido.parcelas}x de ${formatarValor(pedidoConcluido.valorParcela)} · total de ${formatarValor(pedidoConcluido.total)}`
              : `Total: ${formatarValor(pedidoConcluido.total)}`}
          </div>

          <p>
            Sua inscrição foi registrada com status <strong>pendente de pagamento</strong>.{' '}
            {PROXIMOS_PASSOS[pedidoConcluido.forma]}
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
  const opcoesPagamento = [
    { valor: 'pix', icone: '⚡', titulo: 'Pix', sub: `${PERCENTUAL_PIX}% de desconto` },
    { valor: 'cartao', icone: '💳', titulo: 'Cartão', sub: maxParcelas > 1 ? `até ${maxParcelas}x` : 'à vista' },
    { valor: 'boleto', icone: '📄', titulo: 'Boleto', sub: maxParcelas > 1 ? `até ${maxParcelas}x` : 'à vista' },
  ];

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
                  <PrecoCurso curso={item.curso} variante="carrinho" />
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

          {/* ===== Forma de pagamento ===== */}
          <div className="pagamento-secao">
            <h3>Forma de pagamento</h3>

            <div className="pagamento-opcoes">
              {opcoesPagamento.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  className={formaPagamento === opcao.valor ? 'pagamento-opcao ativa' : 'pagamento-opcao'}
                  onClick={() => selecionarForma(opcao.valor)}
                  disabled={finalizando}
                >
                  <span className="pagamento-opcao-icone">{opcao.icone}</span>
                  <span className="pagamento-opcao-titulo">{opcao.titulo}</span>
                  <span className="pagamento-opcao-sub">{opcao.sub}</span>
                </button>
              ))}
            </div>

            {(formaPagamento === 'cartao' || formaPagamento === 'boleto') && (
              <div className="form-field pagamento-parcelas">
                <label htmlFor="parcelas">Número de parcelas</label>
                <select
                  id="parcelas"
                  name="parcelas"
                  value={parcelasEscolhidas}
                  onChange={(e) => setParcelasEscolhidas(Number(e.target.value))}
                  disabled={finalizando}
                >
                  {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatarValor(valorTotal / n)}{n === 1 ? ' (à vista)' : ' sem juros'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!formaPagamento && (
              <p className="carrinho-pagamento-dica">Escolha uma opção para continuar.</p>
            )}
          </div>

          {formaPagamento === 'pix' && (
            <div className="carrinho-resumo-desconto">
              <span>Desconto Pix ({PERCENTUAL_PIX}%)</span>
              <span>- {formatarValor(descontoPix)}</span>
            </div>
          )}

          {formaPagamento && parcelas > 1 && (
            <div className="carrinho-resumo-mensal">
              <span>{parcelas}x de</span>
              <span className="carrinho-resumo-mensal-valor">
                {formatarValor(valorParcela)}<small>/mês</small>
              </span>
            </div>
          )}

          <div className="carrinho-resumo-total">
            <span>Total</span>
            <span>{formatarValor(totalFinal)}</span>
          </div>

          <button
            className="carrinho-btn-concluir"
            onClick={handleConcluirInscricao}
            disabled={finalizando || !formaPagamento}
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