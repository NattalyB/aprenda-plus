// Primeiro item da página para quem navega pelo teclado: pula o menu e vai direto ao conteúdo.
// (O site usa HashRouter, então o link não pode mudar o # do endereço: ele só leva o foco.)
function PularConteudo({ alvo }) {
  const pular = (evento) => {
    evento.preventDefault();
    const destino = document.getElementById(alvo);
    if (destino) {
      destino.focus();
      destino.scrollIntoView?.({ block: 'start' });
    }
  };
  return (
    <a href={`#${alvo}`} className="pular-conteudo" onClick={pular}>
      Pular para o conteúdo
    </a>
  );
}

export default PularConteudo;
