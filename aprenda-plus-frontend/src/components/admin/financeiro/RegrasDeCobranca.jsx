import { useEffect, useState } from 'react';
import { buscarRegrasDeCobranca, salvarRegrasDeCobranca } from '../../../services/financeiroService';
import { formatarValor } from '../../../utils/precoCurso';

const CAMPOS = ['multaPercentual', 'jurosMesPercentual', 'descontoPontualidadePercentual', 'diasCarencia'];

// "2.00" -> "2"; 1.5 -> "1,5"
const paraTela = (valor) => (valor == null ? '' : String(Number(valor)).replace('.', ','));
const paraNumero = (texto) => Number(String(texto ?? '').replace(',', '.'));

// Financeiro > Regras de cobrança: multa, juros e desconto aplicados na baixa das parcelas
function RegrasDeCobranca() {
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.resolve(buscarRegrasDeCobranca())
      .then((regras) => setForm(Object.fromEntries(CAMPOS.map((c) => [c, paraTela(regras?.[c] ?? 0)]))))
      .catch(() => setErro('Não foi possível carregar as regras de cobrança.'));
  }, []);

  if (!form) return erro ? <div className="form-erro">{erro}</div> : <p>Carregando regras de cobrança...</p>;

  const mudar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const salvar = (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setEnviando(true);
    const regras = Object.fromEntries(CAMPOS.map((c) => [c, paraNumero(form[c])]));
    salvarRegrasDeCobranca(regras)
      .then(() => setSucesso('Regras de cobrança salvas. Valem para as próximas baixas.'))
      .catch((error) => setErro(error?.response?.data?.mensagem || 'Não foi possível salvar as regras.'))
      .finally(() => setEnviando(false));
  };

  // Exemplo com uma parcela de R$ 500,00
  const valor = 500;
  const multa = (valor * (paraNumero(form.multaPercentual) || 0)) / 100;
  const juros15 = (valor * (paraNumero(form.jurosMesPercentual) || 0) * 15) / 3000;
  const desconto = (valor * (paraNumero(form.descontoPontualidadePercentual) || 0)) / 100;
  const carencia = paraNumero(form.diasCarencia) || 0;

  return (
    <section aria-label="Regras de cobrança" className="financeiro-cartao financeiro-regras">
      <h2>Regras de cobrança das parcelas</h2>
      <p className="financeiro-nota">
        Valem quando o pagamento de um boleto é registrado. Pix e cartão caem sozinhos no vencimento, sem multa nem desconto.
        Na hora da baixa, dá para isentar a multa e os juros ou digitar outro desconto.
      </p>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

      <form onSubmit={salvar}>
        <div className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="regra-multa">Multa por atraso (%)</label>
              <input id="regra-multa" name="multaPercentual" inputMode="decimal" value={form.multaPercentual} onChange={mudar} required />
              <span className="form-dica">Cobrada uma vez. Máximo de 2% (Código de Defesa do Consumidor).</span>
            </div>
            <div className="form-field">
              <label htmlFor="regra-juros">Juros ao mês (%)</label>
              <input id="regra-juros" name="jurosMesPercentual" inputMode="decimal" value={form.jurosMesPercentual} onChange={mudar} required />
              <span className="form-dica">Cobrados por dia de atraso (o do mês dividido por 30).</span>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="regra-desconto">Desconto para quem paga em dia (%)</label>
              <input
                id="regra-desconto"
                name="descontoPontualidadePercentual"
                inputMode="decimal"
                value={form.descontoPontualidadePercentual}
                onChange={mudar}
                required
              />
              <span className="form-dica">Até o dia do vencimento. Use 0 para não dar desconto.</span>
            </div>
            <div className="form-field">
              <label htmlFor="regra-carencia">Dias de carência</label>
              <input id="regra-carencia" name="diasCarencia" inputMode="numeric" value={form.diasCarencia} onChange={mudar} required />
              <span className="form-dica">Dias depois do vencimento sem multa nem juros.</span>
            </div>
          </div>
        </div>

        <div className="financeiro-exemplo" aria-label="Exemplo">
          <strong>Exemplo com uma parcela de {formatarValor(valor)}:</strong>
          <span>
            Paga até o vencimento: {formatarValor(valor - desconto)}
            {desconto > 0 ? ` (desconto de ${formatarValor(desconto)})` : ''}
          </span>
          <span>
            Paga com 15 dias de atraso:{' '}
            {15 > carencia
              ? `${formatarValor(valor + multa + juros15)} (multa ${formatarValor(multa)} + juros ${formatarValor(juros15)})`
              : `${formatarValor(valor)} (ainda na carência)`}
          </span>
        </div>

        <div className="form-acoes">
          <button type="submit" className="form-btn" disabled={enviando}>
            {enviando ? 'SALVANDO...' : 'SALVAR REGRAS'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default RegrasDeCobranca;
