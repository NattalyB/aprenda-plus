// Desconto para pagamento à vista no Pix (0.05 = 5%)
export const DESCONTO_PIX = 0.05;

// Formata número no padrão brasileiro: 48000 -> R$ 48.000,00
export const formatarValor = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Arredonda para 2 casas decimais (centavos)
export const arredondar = (valor) => Math.round(Number(valor) * 100) / 100;

// Retorna o valor da mensalidade, ou null se o curso não tiver parcelas cadastradas
export const calcularMensalidade = (curso) => {
  const parcelas = Number(curso?.numeroParcelas);
  if (!parcelas || parcelas < 1) return null;
  return Number(curso.valor) / parcelas;
};