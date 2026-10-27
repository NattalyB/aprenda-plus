import { useEffect, useState } from 'react';
import {
  listarFolhaDosProfessores,
  definirValorDaHora,
  gerarPagamentoDoProfessor,
} from '../../../services/financeiroService';
import { formatarValor } from '../../../utils/precoCurso';
import { hojeISO } from '../../../utils/financeiro';

const SITUACOES = { pendente: 'A pagar', atrasado: 'Atrasado', pago: 'Pago', cancelado: 'Cancelado' };

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
  'outubro', 'novembro', 'dezembro'];

// "2026-10" -> "outubro de 2026"
export const mesPorExtenso = (referencia) => {
  const [ano, mes] = String(referencia).split('-');
  return `${MESES[Number(mes) - 1]} de ${ano}`;
};

// "37,5" -> 37.5 (vazio ou inválido -> NaN)
const numero = (texto) => (String(texto ?? '').trim() === '' ? NaN : Number(String(texto).replace(',', '.')));

const mensagemDoErro = (error, padrao) => error?.response?.data?.mensagem || padrao;

// Financeiro > Professores: valor da hora-aula, horas do mês e geração do pagamento
// (o pagamento vira uma conta a pagar, categoria "Professores")
function PagamentoProfessores() {
  const [referencia, setReferencia] = useState(hojeISO().slice(0, 7));
  const [folha, setFolha] = useState(null);
  const [valores, setValores] = useState({}); // valor da hora digitado { idProfessor: '50,00' }
  const [horas, setHoras] = useState({}); // horas digitadas { idProfessor: '40' }
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [processando, setProcessando] = useState(null);

  const carregar = (mes = referencia) =>
    Promise.resolve(listarFolhaDosProfessores(mes))
      .then((lista) => {
        const linhas = lista || [];
        setFolha(linhas);
        setValores(Object.fromEntries(linhas.map((p) => [p.idProfessor, p.valorHora != null ? String(p.valorHora).replace('.', ',') : ''])));
        setHoras(Object.fromEntries(linhas.map((p) => [p.idProfessor, p.horasSugeridas != null ? String(p.horasSugeridas).replace('.', ',') : ''])));
      })
      .catch((error) => {
        setFolha([]);
        setErro(mensagemDoErro(error, 'Não foi possível carregar os professores.'));
      });

  useEffect(() => {
    carregar(referencia);
  }, [referencia]);

  const avisar = (texto) => {
    setErro(null);
    setSucesso(texto);
  };

  const salvarValor = (p) => {
    setProcessando(p.idProfessor);
    const digitado = String(valores[p.idProfessor] ?? '').trim();
    definirValorDaHora(p.idProfessor, digitado === '' ? null : digitado.replace(',', '.'))
      .then(() => {
        avisar(digitado === '' ? `Valor da hora de ${p.nome} removido.` : `Valor da hora de ${p.nome} salvo.`);
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível salvar o valor da hora.')))
      .finally(() => setProcessando(null));
  };

  const gerar = (p) => {
    const h = numero(horas[p.idProfessor]);
    if (!(h > 0)) {
      setSucesso(null);
      setErro(`Informe as horas-aula de ${p.nome} em ${mesPorExtenso(referencia)}.`);
      return;
    }
    setProcessando(p.idProfessor);
    gerarPagamentoDoProfessor(p.idProfessor, { referencia, horas: String(h) })
      .then((conta) => {
        avisar(
          `Pagamento de ${p.nome} gerado${conta?.valor != null ? ` (${formatarValor(conta.valor)})` : ''}. ` +
            'Ele já aparece em Contas a pagar e no fluxo de caixa.'
        );
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível gerar o pagamento.')))
      .finally(() => setProcessando(null));
  };

  const totalGerado = (folha || []).reduce((soma, p) => soma + Number(p.valorConta || 0), 0);

  return (
    <section aria-label="Pagamento dos professores">
      <div className="financeiro-filtros">
        <label className="financeiro-mes">
          Mês de referência
          <input type="month" value={referencia} onChange={(e) => e.target.value && setReferencia(e.target.value)} />
        </label>
        <p className="financeiro-nota">
          Defina o valor da hora-aula de cada professor, informe as horas dadas no mês e gere o pagamento.
          Ele vira uma conta a pagar (vence no dia 5 do mês seguinte). As horas começam com as do último mês pago.
        </p>
      </div>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

      {folha === null ? (
        <p>Carregando professores...</p>
      ) : (
        <>
          <p className="financeiro-total">
            {folha.length} {folha.length === 1 ? 'professor' : 'professores'} · gerado em {mesPorExtenso(referencia)}:{' '}
            {formatarValor(totalGerado)}
          </p>
          <div className="admin-card">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Professor</th>
                    <th>Valor da hora</th>
                    <th>Horas no mês</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {folha.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-vazio">Nenhum professor ativo cadastrado.</td>
                    </tr>
                  ) : (
                    folha.map((p) => {
                      const valorDigitado = valores[p.idProfessor] ?? '';
                      const valorSalvo = p.valorHora != null ? String(p.valorHora).replace('.', ',') : '';
                      const mudouValor = valorDigitado !== valorSalvo;
                      const gerado = p.idConta != null;
                      const totalPrevisto = numero(horas[p.idProfessor]) * Number(p.valorHora);
                      return (
                        <tr key={p.idProfessor}>
                          <td>
                            {p.nome}
                            <small className="financeiro-detalhe">
                              {p.turmas.length > 0 ? p.turmas.join(', ') : 'Sem turmas ativas'}
                              {p.status !== 'ativo' ? ' · inativo' : ''}
                            </small>
                          </td>
                          <td>
                            <div className="financeiro-campo-linha">
                              <span aria-hidden="true">R$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`Valor da hora de ${p.nome}`}
                                placeholder="0,00"
                                value={valorDigitado}
                                onChange={(e) => setValores({ ...valores, [p.idProfessor]: e.target.value })}
                              />
                              {mudouValor && (
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-btn-primary"
                                  disabled={processando === p.idProfessor}
                                  onClick={() => salvarValor(p)}
                                >
                                  Salvar
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            {gerado ? (
                              `${String(p.horasLancadas ?? '-').replace('.', ',')} h`
                            ) : (
                              <div className="financeiro-campo-linha">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label={`Horas de ${p.nome}`}
                                  placeholder="0"
                                  value={horas[p.idProfessor] ?? ''}
                                  onChange={(e) => setHoras({ ...horas, [p.idProfessor]: e.target.value })}
                                />
                                <span aria-hidden="true">h</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {gerado
                              ? formatarValor(p.valorConta)
                              : p.valorHora != null && totalPrevisto > 0
                                ? formatarValor(totalPrevisto)
                                : '-'}
                          </td>
                          <td>
                            {gerado ? (
                              <span className={`status-badge parcela-${p.situacaoConta}`}>
                                {SITUACOES[p.situacaoConta] || p.situacaoConta}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-primary"
                                disabled={p.valorHora == null || mudouValor || processando === p.idProfessor}
                                title={p.valorHora == null ? 'Defina e salve o valor da hora primeiro' : undefined}
                                onClick={() => gerar(p)}
                              >
                                Gerar pagamento
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default PagamentoProfessores;
