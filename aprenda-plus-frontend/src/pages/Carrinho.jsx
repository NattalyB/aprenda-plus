import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listarItensDoCarrinho, removerItemDoCarrinho } from '../services/carrinhoService';
import { listarTurmasDisponiveis } from '../services/turmaService';
import { criarInscricao } from '../services/inscricaoService';
import { estaLogado } from '../services/authService';
import { mostrarAviso } from '../services/avisoService';
import { getImagemCurso } from '../utils/imagensCursos';
import { formatarValor, arredondar, DESCONTO_PIX } from '../utils/precoCurso';
import PrecoCurso from '../components/PrecoCurso';
import MeuDocumento from '../components/MeuDocumento';
import DivisaoPagamento from '../components/DivisaoPagamento';
import {
  calcularDivisao,
  descreverDivisao,
  divisaoInicial,
  FORMAS,
  partesParaEnvio,
} from '../utils/pagamentoDividido';

const PERCENTUAL_PIX = Math.round(DESCONTO_PIX * 100);

// Mensagem da tela de sucesso, de acordo com a forma de pagamento
const PROXIMOS_PASSOS = {
  pix: 'Em breve você receberá o código Pix para pagamento.',
  cartao: 'A cobrança no cartão será processada após a confirmação da sua inscrição.',
  boleto: 'Os boletos serão enviados para o seu e-mail.',
};

// Pagamento dividido: as mensagens de cada forma usada, sem repetir
const proximosPassosDivididos = (partes) =>
  [...new Set(partes.map((parte) => parte.forma))].map((forma) => PROXIMOS_PASSOS[forma]).join(' ');

// "Cartão · 10x de R$ 150,00" / "Pix · à vista"
const resumoDaParte = (parte) =>
  parte.parcelas > 1
    ? `${FORMAS[parte.forma].rotulo} · ${parte.parcelas}x de ${formatarValor(parte.valorParcela)}`
    : `${FORMAS[parte.forma].rotulo} · à vista`;

function Carrinho() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState(null); // 'pix' | 'cartao' | 'boleto'
  const [parcelasEscolhidas, setParcelasEscolhidas] = useState(1);
  const [pedidoConcluido, setPedidoConcluido] = useState(null);
  // Pagamento dividido em duas formas (ex.: dois cartões)
  const [dividido, setDividido] = useState(false);
  const [divisao, setDivisao] = useState(() => divisaoInicial(1));
  const logado = estaLogado();

  // Máximo de parcelas: o MAIOR limite entre os cursos do carrinho
  // (ex.: um curso de 12x e outro de 36x juntos podem ser pagos em até 36x)
  const getMaxParcelas = (lista) => {
    if (lista.length === 0) return 1;
    return Math.max(1, ...lista.map((item) => Number(item.curso.numeroParcelas) || 1));
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
        setDivisao((atual) =>
          atual.map((parte) => ({ ...parte, parcelas: Math.min(parte.parcelas, getMaxParcelas(dados)) }))
        );
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

  // Liga a divisão: as duas formas começam no cartão, no máximo de parcelas
  const dividirPagamento = () => {
    setDivisao(divisaoInicial(getMaxParcelas(itens)));
    setDividido(true);
  };

  // ===== Cálculos do pedido =====
  const maxParcelas = getMaxParcelas(itens);
  const valorTotal = itens.reduce((soma, item) => soma + Number(item.curso.valor), 0);
  const calculoDivisao = dividido ? calcularDivisao(valorTotal, divisao) : null;
  const descontoPix = dividido ? calculoDivisao.desconto : arredondar(valorTotal * DESCONTO_PIX);
  const temDescontoPix = dividido ? descontoPix > 0 : formaPagamento === 'pix';
  const totalFinal = dividido
    ? calculoDivisao.totalAPagar
    : formaPagamento === 'pix'
      ? valorTotal - descontoPix
      : valorTotal;
  const parcelas = formaPagamento === 'pix' ? 1 : parcelasEscolhidas;
  const valorParcela = totalFinal / parcelas;
  const podeConcluir = dividido ? !calculoDivisao.erro : Boolean(formaPagamento);

  const descreverPagamento = () => {
    if (formaPagamento === 'pix') return `Pix à vista (${PERCENTUAL_PIX}% de desconto)`;
    if (formaPagamento === 'cartao') return `Cartão de crédito · ${parcelas}x`;
    if (formaPagamento === 'boleto') return `Boleto bancário · ${parcelas}x`;
    return 'A definir';
  };

  const handleConcluirInscricao = () => {
    if (dividido && calculoDivisao.erro) {
      mostrarAviso(calculoDivisao.erro, 'aviso');
      return;
    }
    if (!dividido && !formaPagamento) {
      mostrarAviso('Escolha a forma de pagamento para concluir.', 'aviso');
      return;
    }

    setFinalizando(true);
    setErro(null);
    const idAluno = localStorage.getItem('idAluno');
    const descricao = dividido ? descreverDivisao(calculoDivisao.partes) : descreverPagamento();
    const partesDivididas = dividido ? partesParaEnvio(calculoDivisao.partes) : null;

    // Pra cada item do carrinho, coloca o aluno na primeira turma aberta COM VAGA do curso.
    // Se todas as turmas abertas estiverem cheias, ele entra na LISTA DE ESPERA da primeira
    // (o servidor marca a inscrição como "aguardando vaga").
    // Depois ele pode escolher outra turma em "Minhas inscrições".
    const promessas = itens.map((item) => {
      // No pagamento dividido, cada curso paga a sua parte proporcional (o servidor refaz a conta)
      let valorItem = Number(item.curso.valor);
      if (dividido) valorItem = arredondar((valorItem * totalFinal) / valorTotal);
      else if (formaPagamento === 'pix') valorItem = arredondar(valorItem * (1 - DESCONTO_PIX));

      return listarTurmasDisponiveis(item.curso.idCurso).then((turmas) => {
        const turma = turmas.find((t) => t.vagasRestantes > 0) || turmas[0];
        if (!turma) {
          throw new Error(`O curso "${item.curso.nome}" não tem turmas com inscrições abertas no momento.`);
        }
        const envio = partesDivididas
          ? criarInscricao(idAluno, turma.idTurma, valorItem, descricao, partesDivididas)
          : criarInscricao(idAluno, turma.idTurma, valorItem, descricao);
        return envio.then((response) => ({
          curso: item.curso.nome,
          naFila: response?.data?.status === 'aguardando_vaga',
        }));
      });
    });

    let listaDeEspera = [];
    Promise.all(promessas)
      .then((resultados) => {
        listaDeEspera = resultados.filter((r) => r.naFila).map((r) => r.curso);
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
          partes: dividido ? calculoDivisao.partes : null,
          listaDeEspera,
          todosNaFila: listaDeEspera.length === itens.length,
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
          <span className="carrinho-estado-icone">{pedidoConcluido.todosNaFila ? '⏳' : '🎉'}</span>
          <h2>{pedidoConcluido.todosNaFila ? 'Você está na lista de espera!' : 'Inscrição concluída!'}</h2>

          {pedidoConcluido.partes ? (
            <div className="carrinho-sucesso-pagamento">
              <strong>Pagamento dividido em duas formas</strong>
              <ul className="carrinho-sucesso-partes">
                {pedidoConcluido.partes.map((parte, indice) => (
                  <li key={indice}>
                    {resumoDaParte(parte)} <span>({formatarValor(parte.aPagar)})</span>
                  </li>
                ))}
              </ul>
              Total: {formatarValor(pedidoConcluido.total)}
            </div>
          ) : (
            <div className="carrinho-sucesso-pagamento">
              <strong>{pedidoConcluido.descricao}</strong>
              <br />
              {pedidoConcluido.parcelas > 1
                ? `${pedidoConcluido.parcelas}x de ${formatarValor(pedidoConcluido.valorParcela)} · total de ${formatarValor(pedidoConcluido.total)}`
                : `Total: ${formatarValor(pedidoConcluido.total)}`}
            </div>
          )}

          {!pedidoConcluido.todosNaFila && (
            <>
              <p>
                Sua inscrição foi registrada com status <strong>pendente de pagamento</strong>.{' '}
                {pedidoConcluido.partes
                  ? proximosPassosDivididos(pedidoConcluido.partes)
                  : PROXIMOS_PASSOS[pedidoConcluido.forma]}
              </p>
              <p>
                Reservamos uma vaga para você na primeira turma disponível. Se preferir outro turno ou horário, é só
                trocar em <strong>Minhas inscrições</strong>.
              </p>
            </>
          )}

          {pedidoConcluido.listaDeEspera.length > 0 && (
            <div className="carrinho-lista-espera" role="status">
              <p>
                <strong>Lista de espera:</strong> as turmas de{' '}
                {pedidoConcluido.listaDeEspera.map((nome) => `"${nome}"`).join(', ')} estão cheias no momento.
              </p>
              <p>
                Você entrou na fila com status <strong>aguardando vaga</strong> e ainda não precisa pagar. Quando abrir
                uma vaga, sua inscrição passa para pendente de pagamento — ou troque para outra turma com vaga em{' '}
                <strong>Minhas inscrições</strong>.
              </p>
            </div>
          )}
          <div className="carrinho-estado-botoes">
            <Link to="/minhas-inscricoes" className="admin-btn admin-btn-primary">Ver minhas inscrições</Link>
            <Link to="/" className="admin-btn admin-btn-secundario">Continuar navegando</Link>
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

      <MeuDocumento lembrete />

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

            {dividido ? (
              <>
                <DivisaoPagamento
                  partes={divisao}
                  calculo={calculoDivisao}
                  maxParcelas={maxParcelas}
                  onChange={setDivisao}
                  desabilitado={finalizando}
                />
                <button
                  type="button"
                  className="pagamento-dividir"
                  onClick={() => setDividido(false)}
                  disabled={finalizando}
                >
                  Voltar para uma forma só
                </button>
              </>
            ) : (
              <>
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

                <button type="button" className="pagamento-dividir" onClick={dividirPagamento} disabled={finalizando}>
                  Pagar com duas formas (ex.: dois cartões)
                </button>
              </>
            )}
          </div>

          {temDescontoPix && (
            <div className="carrinho-resumo-desconto">
              <span>Desconto Pix ({PERCENTUAL_PIX}%)</span>
              <span>- {formatarValor(descontoPix)}</span>
            </div>
          )}

          {dividido && !calculoDivisao.erro && (
            <ul className="carrinho-resumo-partes" aria-label="Como fica o pagamento">
              {calculoDivisao.partes.map((parte, indice) => (
                <li key={indice}>
                  <span>{resumoDaParte(parte)}</span>
                  <span>{formatarValor(parte.aPagar)}</span>
                </li>
              ))}
            </ul>
          )}

          {!dividido && formaPagamento && parcelas > 1 && (
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
            disabled={finalizando || !podeConcluir}
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