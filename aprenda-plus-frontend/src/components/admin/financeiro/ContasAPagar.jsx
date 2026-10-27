import { useEffect, useState } from 'react';
import {
  listarContas,
  listarCategoriasDeContas,
  criarConta,
  atualizarConta,
  excluirConta,
  pagarConta,
  estornarConta,
} from '../../../services/financeiroService';
import { formatarValor } from '../../../utils/precoCurso';
import { formatarData, hojeISO } from '../../../utils/financeiro';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const SITUACOES = {
  pendente: 'A vencer',
  atrasado: 'Atrasada',
  pago: 'Paga',
  cancelado: 'Cancelada',
};

const FILTROS = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'pendente', rotulo: 'A vencer' },
  { valor: 'atrasado', rotulo: 'Atrasadas' },
  { valor: 'pago', rotulo: 'Pagas' },
  { valor: 'cancelado', rotulo: 'Canceladas' },
];

const FORMAS = ['Pix', 'Boleto bancário', 'Transferência', 'Cartão de crédito', 'Dinheiro', 'Débito automático'];

const CATEGORIAS_PADRAO = [
  'Aluguel', 'Professores', 'Salários', 'Energia', 'Água', 'Internet e telefone', 'Marketing',
  'Impostos', 'Material', 'Manutenção', 'Sistemas e softwares', 'Outros',
];

const mensagemDoErro = (error, padrao) => error?.response?.data?.mensagem || padrao;

// Financeiro > Contas a pagar: despesas da escola (aluguel, luz, professores...)
function ContasAPagar() {
  const [contas, setContas] = useState(null);
  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova; conta = editar
  const [pagando, setPagando] = useState(null);
  const [processando, setProcessando] = useState(false);

  const carregar = () =>
    Promise.resolve(listarContas())
      .then((lista) => setContas(lista || []))
      .catch(() => {
        setContas([]);
        setErro('Não foi possível carregar as contas a pagar.');
      });

  useEffect(() => {
    carregar();
    Promise.resolve(listarCategoriasDeContas())
      .then((lista) => Array.isArray(lista) && lista.length > 0 && setCategorias(lista))
      .catch(() => {});
  }, []);

  const avisar = (texto) => {
    setErro(null);
    setSucesso(texto);
  };

  const salvar = (dados, repetirMeses) => {
    const nova = !editando?.idConta;
    const promessa = nova ? criarConta(dados, repetirMeses) : atualizarConta(editando.idConta, dados);
    return promessa.then((resultado) => {
      setEditando(null);
      const quantas = Array.isArray(resultado) ? resultado.length : 1;
      avisar(nova ? (quantas > 1 ? `${quantas} contas cadastradas (uma por mês).` : 'Conta cadastrada.') : 'Conta atualizada.');
      return carregar();
    });
  };

  const confirmarPagamento = (conta) => {
    setProcessando(true);
    pagarConta(conta.idConta, { dataPagamento: pagando.data, formaPagamento: pagando.forma })
      .then(() => {
        setPagando(null);
        avisar(`Pagamento de "${conta.descricao}" registrado.`);
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível registrar o pagamento.')))
      .finally(() => setProcessando(false));
  };

  const desfazer = (conta) => {
    if (!window.confirm(`Desfazer o pagamento de "${conta.descricao}"?`)) return;
    estornarConta(conta.idConta)
      .then(() => {
        avisar('Pagamento desfeito. A conta voltou a ficar em aberto.');
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível desfazer o pagamento.')));
  };

  const excluir = (conta) => {
    if (!window.confirm(`Excluir a conta "${conta.descricao}"?`)) return;
    excluirConta(conta.idConta)
      .then(() => {
        avisar('Conta excluída.');
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível excluir a conta.')));
  };

  if (contas === null) return <p>Carregando contas a pagar...</p>;

  const termo = normalizar(busca.trim());
  const filtradas = contas.filter(
    (c) =>
      (filtro === 'todas' || c.situacao === filtro) &&
      (!termo || normalizar(`${c.descricao} ${c.fornecedor || ''} ${c.categoria}`).includes(termo))
  );
  const total = filtradas.reduce((soma, c) => soma + Number(c.valor), 0);
  const contagem = (situacao) => contas.filter((c) => c.situacao === situacao).length;

  return (
    <section aria-label="Contas a pagar">
      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

      <div className="financeiro-filtros financeiro-sem-impressao">
        <div className="financeiro-chips">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={filtro === f.valor ? 'financeiro-chip ativo' : 'financeiro-chip'}
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo}
              {f.valor !== 'todas' && <span>{contagem(f.valor)}</span>}
            </button>
          ))}
        </div>
        <div className="admin-busca">
          <span className="admin-busca-icone">🔍</span>
          <input
            type="text"
            name="buscaConta"
            placeholder="Buscar por descrição, fornecedor ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => {
            setSucesso(null);
            setEditando({});
          }}
        >
          + Nova conta
        </button>
      </div>

      <p className="financeiro-total">
        {filtradas.length} {filtradas.length === 1 ? 'conta' : 'contas'} · total de {formatarValor(total)}
      </p>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Situação</th>
                <th>Pagamento</th>
                <th className="financeiro-sem-impressao">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-vazio">
                    {contas.length === 0
                      ? 'Nenhuma conta cadastrada. Clique em "+ Nova conta" para lançar aluguel, luz, internet...'
                      : 'Nenhuma conta encontrada com esses filtros.'}
                  </td>
                </tr>
              ) : (
                filtradas.map((c) => (
                  <tr key={c.idConta}>
                    <td>
                      {c.descricao}
                      {c.fornecedor && <small className="financeiro-detalhe">{c.fornecedor}</small>}
                      {c.observacao && <small className="financeiro-detalhe">{c.observacao}</small>}
                    </td>
                    <td>{c.categoria}</td>
                    <td>{formatarData(c.dataVencimento)}</td>
                    <td>{formatarValor(c.valor)}</td>
                    <td>
                      <span className={`status-badge parcela-${c.situacao}`}>{SITUACOES[c.situacao] || c.situacao}</span>
                    </td>
                    <td>
                      {c.dataPagamento ? (
                        <>
                          {formatarData(c.dataPagamento)}
                          {c.formaPagamento && <small className="financeiro-detalhe">{c.formaPagamento}</small>}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="financeiro-sem-impressao">
                      {pagando?.id === c.idConta ? (
                        <div className="financeiro-baixa">
                          <label>
                            Pago em
                            <input
                              type="date"
                              value={pagando.data}
                              max={hojeISO()}
                              onChange={(e) => setPagando({ ...pagando, data: e.target.value })}
                            />
                          </label>
                          <label>
                            Forma
                            <select value={pagando.forma} onChange={(e) => setPagando({ ...pagando, forma: e.target.value })}>
                              {FORMAS.map((forma) => (
                                <option key={forma} value={forma}>{forma}</option>
                              ))}
                            </select>
                          </label>
                          <div className="admin-acoes">
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-primary"
                              disabled={processando}
                              onClick={() => confirmarPagamento(c)}
                            >
                              Confirmar
                            </button>
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => setPagando(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="admin-acoes">
                          {(c.situacao === 'pendente' || c.situacao === 'atrasado') && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-primary"
                              onClick={() => {
                                setSucesso(null);
                                setPagando({ id: c.idConta, data: hojeISO(), forma: 'Pix' });
                              }}
                            >
                              Pagar
                            </button>
                          )}
                          {c.status === 'pago' ? (
                            <button type="button" className="admin-btn admin-btn-sm admin-btn-secundario" onClick={() => desfazer(c)}>
                              Desfazer
                            </button>
                          ) : (
                            <>
                              <button type="button" className="admin-btn admin-btn-sm admin-btn-editar" onClick={() => setEditando(c)}>
                                Editar
                              </button>
                              <button type="button" className="admin-btn admin-btn-sm admin-btn-excluir" onClick={() => excluir(c)}>
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <FormConta
          conta={editando.idConta ? editando : null}
          categorias={categorias}
          onSalvar={salvar}
          onFechar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

// Janela para cadastrar ou editar uma conta
export function FormConta({ conta, categorias, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    descricao: conta?.descricao || '',
    categoria: conta?.categoria || '',
    fornecedor: conta?.fornecedor || '',
    valor: conta?.valor ?? '',
    dataVencimento: conta?.dataVencimento || hojeISO(),
    observacao: conta?.observacao || '',
    status: conta?.status || 'pendente',
  });
  const [repetir, setRepetir] = useState('1');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const fecharComEsc = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [onFechar]);

  const mudar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = { ...form, valor: String(form.valor).replace(',', '.') };
    onSalvar(dados, Number(repetir) || 1).catch((error) => {
      setErro(mensagemDoErro(error, 'Não foi possível salvar a conta.'));
      setEnviando(false);
    });
  };

  return (
    <div className="doc-painel-fundo" role="dialog" aria-modal="true" aria-label={conta ? 'Editar conta' : 'Nova conta'}>
      <div className="doc-painel">
        <div className="doc-painel-topo">
          <div>
            <h2>{conta ? 'Editar conta' : 'Nova conta a pagar'}</h2>
            <p>Despesas da escola: aluguel, luz, internet, impostos...</p>
          </div>
        </div>

        {erro && <div className="form-erro">{erro}</div>}

        <form onSubmit={enviar}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="conta-descricao">Descrição</label>
              <input id="conta-descricao" name="descricao" maxLength={140} placeholder="Ex: Aluguel da sede" value={form.descricao} onChange={mudar} required />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="conta-categoria">Categoria</label>
                <select id="conta-categoria" name="categoria" value={form.categoria} onChange={mudar} required>
                  <option value="">Escolha...</option>
                  {[...new Set([...categorias, form.categoria].filter(Boolean))].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="conta-fornecedor">Fornecedor (opcional)</label>
                <input id="conta-fornecedor" name="fornecedor" placeholder="Quem recebe" value={form.fornecedor} onChange={mudar} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="conta-valor">Valor (R$)</label>
                <input id="conta-valor" name="valor" inputMode="decimal" placeholder="Ex: 3500,00" value={form.valor} onChange={mudar} required />
              </div>
              <div className="form-field">
                <label htmlFor="conta-vencimento">Vencimento</label>
                <input id="conta-vencimento" name="dataVencimento" type="date" value={form.dataVencimento} onChange={mudar} required />
              </div>
            </div>
            {conta ? (
              <div className="form-field">
                <label htmlFor="conta-status">Situação</label>
                <select id="conta-status" name="status" value={form.status} onChange={mudar}>
                  <option value="pendente">Em aberto</option>
                  <option value="cancelado">Cancelada</option>
                </select>
              </div>
            ) : (
              <div className="form-field">
                <label htmlFor="conta-repetir">Repetir todo mês</label>
                <select id="conta-repetir" value={repetir} onChange={(e) => setRepetir(e.target.value)}>
                  <option value="1">Não, só esta vez</option>
                  {[3, 6, 12, 24].map((n) => (
                    <option key={n} value={String(n)}>Sim, por {n} meses</option>
                  ))}
                </select>
                <span className="form-dica">💡 Para contas fixas, como aluguel e internet: cria uma conta para cada mês.</span>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="conta-observacao">Observação (opcional)</label>
              <textarea id="conta-observacao" name="observacao" rows={2} maxLength={500} value={form.observacao} onChange={mudar} />
            </div>
          </div>

          <div className="form-acoes">
            <button type="button" className="admin-btn admin-btn-secundario" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="form-btn" disabled={enviando}>
              {enviando ? 'SALVANDO...' : 'SALVAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContasAPagar;
