// Formata número no padrão brasileiro: 48000 -> R$ 48.000,00
export const formatarValor = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Retorna o valor da mensalidade, ou null se o curso não tiver parcelas cadastradas
export const calcularMensalidade = (curso) => {
  const parcelas = Number(curso?.numeroParcelas);
  if (!parcelas || parcelas < 1) return null;
  return Number(curso.valor) / parcelas;
};