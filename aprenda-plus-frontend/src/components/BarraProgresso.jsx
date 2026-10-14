// Barra de progresso da sala de aula (ex.: 67% das aulas concluídas)
function BarraProgresso({ percentual = 0, rotulo }) {
  const valor = Math.max(0, Math.min(100, Math.round(percentual || 0)));
  return (
    <div
      className={valor === 100 ? 'barra-progresso completa' : 'barra-progresso'}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      aria-label={rotulo || 'Progresso nas aulas'}
    >
      <span className="barra-progresso-preenchida" style={{ width: `${valor}%` }} />
    </div>
  );
}

export default BarraProgresso;
