import { NumericFormat } from 'react-number-format';
import { formatarValor, DESCONTO_PIX } from '../utils/precoCurso';
import { FORMAS } from '../utils/pagamentoDividido';

const PERCENTUAL_PIX = Math.round(DESCONTO_PIX * 100);
const NOMES_DAS_PARTES = ['1ª forma', '2ª forma'];

// Editor das duas formas de pagamento no carrinho.
// partes: o que o aluno escolheu ({ forma, parcelas, valor }); calculo: o resultado de calcularDivisao
// (com o restante da 2ª forma, o desconto do Pix e o valor de cada parcela).
function DivisaoPagamento({ partes, calculo, maxParcelas, onChange, desabilitado }) {
  const mudarParte = (indice, mudancas) =>
    onChange(partes.map((parte, i) => (i === indice ? { ...parte, ...mudancas } : parte)));

  return (
    <div className="divisao">
      <p className="divisao-dica">
        Digite quanto vai na 1ª forma. O restante vai para a 2ª automaticamente.
      </p>

      {calculo.partes.map((parte, indice) => {
        const numero = indice + 1;
        const nome = NOMES_DAS_PARTES[indice];
        const temValor = parte.valor > 0;
        return (
          <fieldset className="divisao-parte" key={nome} disabled={desabilitado}>
            <legend>{nome}</legend>

            <div className="divisao-formas" role="group" aria-label={`Forma de pagamento da ${nome}`}>
              {Object.entries(FORMAS).map(([chave, forma]) => (
                <button
                  key={chave}
                  type="button"
                  className={parte.forma === chave ? 'divisao-forma ativa' : 'divisao-forma'}
                  aria-pressed={parte.forma === chave}
                  onClick={() => mudarParte(indice, { forma: chave })}
                >
                  {forma.rotulo}
                </button>
              ))}
            </div>

            <div className="divisao-campos">
              <div className="form-field">
                {indice === 0 ? (
                  <>
                    <label htmlFor="divisao-valor-1">Valor</label>
                    <NumericFormat
                      id="divisao-valor-1"
                      value={partes[0].valor ?? ''}
                      onValueChange={(valores, origem) => {
                        if (origem.source === 'event') {
                          mudarParte(0, { valor: valores.floatValue ?? null });
                        }
                      }}
                      prefix="R$ "
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={2}
                      allowNegative={false}
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                    />
                  </>
                ) : (
                  <>
                    <span className="divisao-rotulo" id="divisao-restante-rotulo">Restante</span>
                    <output className="divisao-restante" aria-labelledby="divisao-restante-rotulo">
                      {temValor ? formatarValor(parte.valor) : '—'}
                    </output>
                  </>
                )}
              </div>

              {parte.forma !== 'pix' && (
                <div className="form-field">
                  <label htmlFor={`divisao-parcelas-${numero}`}>Parcelas</label>
                  <select
                    id={`divisao-parcelas-${numero}`}
                    value={parte.parcelas}
                    onChange={(e) => mudarParte(indice, { parcelas: Number(e.target.value) })}
                  >
                    {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {temValor ? `${n}x de ${formatarValor(parte.aPagar / n)}` : `${n}x`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {parte.forma === 'pix' && temValor && (
              <p className="divisao-pix">
                Com {PERCENTUAL_PIX}% de desconto no Pix: <strong>{formatarValor(parte.aPagar)}</strong>
              </p>
            )}
          </fieldset>
        );
      })}

      {calculo.erro && partes[0].valor !== null && partes[0].valor !== undefined && (
        <p className="divisao-erro" role="alert">{calculo.erro}</p>
      )}
    </div>
  );
}

export default DivisaoPagamento;
