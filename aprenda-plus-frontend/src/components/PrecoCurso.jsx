import { formatarValor, calcularMensalidade } from '../utils/precoCurso';

// variante: 'card' (Home), 'modal' (detalhes do curso) ou 'carrinho'
function PrecoCurso({ curso, variante = 'card' }) {
  const mensalidade = calcularMensalidade(curso);

  // Curso sem parcelas cadastradas: mostra só o valor total
  if (!mensalidade) {
    return (
      <div className={`preco preco-${variante}`}>
        <span className="preco-principal">{formatarValor(curso.valor)}</span>
      </div>
    );
  }

  return (
    <div className={`preco preco-${variante}`}>
      <span className="preco-principal">
        {formatarValor(mensalidade)}
        <small>/mês</small>
      </span>
      <span className="preco-detalhe">
        em {curso.numeroParcelas}x · total de {formatarValor(curso.valor)}
      </span>
    </div>
  );
}

export default PrecoCurso;