import { useEffect, useState } from 'react';
import { calcularParcela } from '../../../services/financeiroService';
import { formatarValor } from '../../../utils/precoCurso';

// Mostra quanto a parcela vai custar na data escolhida: valor + multa + juros - desconto.
// O cálculo é feito no servidor, com as regras de cobrança salvas.
function PreviaDaBaixa({ idPagamento, data, isentarEncargos, desconto }) {
  const [calculo, setCalculo] = useState(null);

  useEffect(() => {
    let ativo = true;
    // Espera a pessoa parar de digitar o desconto
    const espera = setTimeout(() => {
      Promise.resolve(calcularParcela(idPagamento, { data, isentarEncargos, desconto }))
        .then((resultado) => ativo && setCalculo(resultado || null))
        .catch(() => ativo && setCalculo(null));
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [idPagamento, data, isentarEncargos, desconto]);

  if (!calculo) return null;

  const partes = [];
  if (Number(calculo.multa) > 0) partes.push(`multa ${formatarValor(calculo.multa)}`);
  if (Number(calculo.juros) > 0) partes.push(`juros ${formatarValor(calculo.juros)}`);
  if (Number(calculo.desconto) > 0) partes.push(`desconto ${formatarValor(calculo.desconto)}`);

  return (
    <p className="financeiro-previa" role="status">
      Total a receber: <strong>{formatarValor(calculo.total)}</strong>
      {calculo.diasAtraso > 0 && (
        <small>
          {calculo.diasAtraso} {calculo.diasAtraso === 1 ? 'dia' : 'dias'} de atraso
        </small>
      )}
      {partes.length > 0 && <small>{partes.join(' · ')}</small>}
    </p>
  );
}

export default PreviaDaBaixa;
