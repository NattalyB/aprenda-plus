// Dispara um aviso na tela. tipo: 'sucesso' | 'erro' | 'aviso'
export const mostrarAviso = (mensagem, tipo = 'sucesso') => {
  window.dispatchEvent(
    new CustomEvent('mostrar-aviso', { detail: { mensagem, tipo } })
  );
};