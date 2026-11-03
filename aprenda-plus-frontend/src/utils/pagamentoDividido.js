// Pagamento dividido em duas formas no carrinho (ex.: R$ 1.500 em um cartão e o restante em outro).
// O aluno digita o valor da 1ª forma; a 2ª recebe o restante sozinha.
// O desconto do Pix vale só para a parte paga no Pix.
// O servidor confere tudo de novo (InscricaoService.calcularPagamentoDividido): aqui é só a prévia da tela.
import { arredondar, DESCONTO_PIX, formatarValor } from './precoCurso';

export const FORMAS = {
  pix: { rotulo: 'Pix', nome: 'Pix à vista' },
  cartao: { rotulo: 'Cartão', nome: 'Cartão de crédito' },
  boleto: { rotulo: 'Boleto', nome: 'Boleto bancário' },
};

// Como a divisão começa quando o aluno escolhe "Pagar com duas formas"
export const divisaoInicial = (maxParcelas) => [
  { forma: 'cartao', parcelas: maxParcelas, valor: null },
  { forma: 'cartao', parcelas: maxParcelas },
];

// Calcula as duas partes a partir do total do pedido (sem desconto) e do valor digitado na 1ª.
// Devolve as partes prontas para mostrar e enviar, o total a pagar e um erro (ou null).
export const calcularDivisao = (total, partes) => {
  const totalPedido = arredondar(total);
  const primeiro = partes[0]?.valor;
  const valorPrimeira = primeiro === null || primeiro === undefined || primeiro === '' ? null : arredondar(primeiro);
  let erro = null;
  if (valorPrimeira === null) {
    erro = 'Digite quanto vai na 1ª forma de pagamento.';
  } else if (valorPrimeira <= 0) {
    erro = 'O valor da 1ª forma precisa ser maior que zero.';
  } else if (valorPrimeira >= totalPedido) {
    erro = `O valor da 1ª forma precisa ser menor que o total do pedido (${formatarValor(totalPedido)}).`;
  }

  const valores = erro ? [valorPrimeira || 0, 0] : [valorPrimeira, arredondar(totalPedido - valorPrimeira)];
  const calculadas = partes.map((parte, indice) => {
    const pix = parte.forma === 'pix';
    const valor = valores[indice];
    const desconto = pix ? arredondar(valor * DESCONTO_PIX) : 0;
    const aPagar = arredondar(valor - desconto);
    const parcelas = pix ? 1 : Math.max(1, Number(parte.parcelas) || 1);
    return { ...parte, parcelas, valor, desconto, aPagar, valorParcela: aPagar / parcelas };
  });

  return {
    partes: calculadas,
    desconto: arredondar(calculadas.reduce((soma, p) => soma + p.desconto, 0)),
    totalAPagar: arredondar(calculadas.reduce((soma, p) => soma + p.aPagar, 0)),
    erro,
  };
};

// "Cartão de crédito · 10x (R$ 1.500,00)" / "Pix à vista (R$ 950,00)"
export const descreverParte = (parte) => {
  const forma = parte.forma === 'pix' ? FORMAS.pix.nome : `${FORMAS[parte.forma].nome} · ${parte.parcelas}x`;
  return `${forma} (${formatarValor(parte.aPagar)})`;
};

export const descreverDivisao = (partes) => partes.map(descreverParte).join(' + ');

// O que vai para o servidor: quanto do PEDIDO (sem desconto) vai em cada forma
export const partesParaEnvio = (partes) =>
  partes.map((parte) => ({
    forma: parte.forma,
    parcelas: parte.forma === 'pix' ? 1 : parte.parcelas,
    valor: parte.valor,
  }));
