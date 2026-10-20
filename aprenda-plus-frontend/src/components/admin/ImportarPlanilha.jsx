import { useEffect, useState } from 'react';
import { importarPlanilha } from '../../services/importacaoService';
import { baixarArquivo } from '../../utils/financeiro';
import {
  MODELOS,
  LIMITE_LINHAS,
  lerPlanilha,
  colunasFaltando,
  modeloEmCsv,
  linhasComErroEmCsv,
  lerArquivo,
} from '../../utils/planilha';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Botão "Importar planilha" + a janela com os 3 passos: escolher o arquivo, conferir a prévia e importar.
// tipo: alunos | professores | cursos | disciplinas | aulas (aulas precisa do idTurma)
// onConcluido(resultado): chamado depois de importar, para a tela recarregar a lista
function ImportarPlanilha({ tipo, idTurma, onConcluido, disabled = false, title }) {
  const modelo = MODELOS[tipo];
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState('escolher'); // escolher | previa | concluido
  const [carregando, setCarregando] = useState(null); // texto do que está acontecendo
  const [erro, setErro] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [planilha, setPlanilha] = useState({ colunas: [], linhas: [] });
  const [resultado, setResultado] = useState(null);

  const recomecar = () => {
    setEtapa('escolher');
    setErro(null);
    setArquivo(null);
    setPlanilha({ colunas: [], linhas: [] });
    setResultado(null);
  };

  const abrir = () => {
    recomecar();
    setAberto(true);
  };

  const fechar = () => {
    if (carregando) return;
    setAberto(false);
  };

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  });

  const mensagemDoErro = (error, padrao) => error?.response?.data?.mensagem || padrao;

  const escolherArquivo = async (evento) => {
    const escolhido = evento.target.files?.[0];
    evento.target.value = '';
    if (!escolhido) return;
    setErro(null);
    setArquivo(escolhido);

    let lida;
    try {
      lida = lerPlanilha(await lerArquivo(escolhido));
    } catch {
      setErro('Não foi possível ler o arquivo. Salve a planilha como CSV e tente de novo.');
      return;
    }
    if (lida.linhas.length === 0) {
      setErro('A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho.');
      return;
    }
    const faltando = colunasFaltando(modelo, lida.colunas);
    if (faltando.length > 0) {
      setErro(
        `${faltando.length === 1 ? 'Falta a coluna' : 'Faltam as colunas'} ${faltando.join(', ')}. ` +
          'Baixe o modelo para ver o formato certo.'
      );
      return;
    }
    if (lida.linhas.length > LIMITE_LINHAS) {
      setErro(`Envie no máximo ${LIMITE_LINHAS} linhas por vez (a planilha tem ${lida.linhas.length}).`);
      return;
    }

    setPlanilha(lida);
    setCarregando('Conferindo a planilha...');
    try {
      setResultado(await importarPlanilha(tipo, lida.linhas, { confirmar: false, idTurma }));
      setEtapa('previa');
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível conferir a planilha.'));
    } finally {
      setCarregando(null);
    }
  };

  const confirmar = async () => {
    setErro(null);
    setCarregando('Importando...');
    try {
      const final = await importarPlanilha(tipo, planilha.linhas, { confirmar: true, idTurma });
      setResultado(final);
      setEtapa('concluido');
      if (onConcluido) onConcluido(final);
    } catch (error) {
      setErro(mensagemDoErro(error, 'Não foi possível importar a planilha.'));
    } finally {
      setCarregando(null);
    }
  };

  const baixarModelo = () => baixarArquivo(modelo.arquivo, modeloEmCsv(modelo));

  const baixarErros = () =>
    baixarArquivo(
      `${tipo}-com-erro.csv`,
      linhasComErroEmCsv(planilha.colunas, planilha.linhas, resultado)
    );

  const linhasParaMostrar =
    etapa === 'concluido' ? resultado.linhas.filter((l) => l.erros.length > 0) : resultado?.linhas || [];

  return (
    <>
      <button
        type="button"
        className="admin-btn admin-btn-secundario"
        onClick={abrir}
        disabled={disabled}
        title={title}
      >
        📥 Importar planilha
      </button>

      {aberto && (
        <div className="doc-painel-fundo" role="dialog" aria-modal="true" aria-label={`Importar ${modelo.titulo}`}>
          <div className="doc-painel importar">
            <div className="doc-painel-topo">
              <div>
                <h2>Importar {modelo.titulo} por planilha</h2>
                <p>Cadastre vários de uma vez. Cada linha passa pelas mesmas regras do cadastro normal.</p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-secundario"
                onClick={fechar}
                disabled={Boolean(carregando)}
              >
                Fechar
              </button>
            </div>

            <ol className="importar-passos" aria-label="Passos">
              <li className={etapa === 'escolher' ? 'atual' : 'feito'}>Escolher o arquivo</li>
              <li className={etapa === 'previa' ? 'atual' : etapa === 'concluido' ? 'feito' : undefined}>Conferir</li>
              <li className={etapa === 'concluido' ? 'atual' : undefined}>Pronto</li>
            </ol>

            {erro && (
              <div className="form-erro" role="alert">
                {erro}
              </div>
            )}

            {etapa === 'escolher' && (
              <>
                <div className="importar-como">
                  <p>
                    <strong>1.</strong> Baixe o modelo e preencha no Excel ou no Google Planilhas (uma linha para cada{' '}
                    {modelo.item.toLowerCase()}).
                  </p>
                  <button type="button" className="admin-btn admin-btn-sm admin-btn-primary" onClick={baixarModelo}>
                    ⬇ Baixar modelo
                  </button>
                  <p>
                    <strong>2.</strong> Salve como <strong>CSV</strong> (no Excel: <em>Arquivo › Salvar como › CSV</em>) e envie
                    aqui. Nada é gravado antes de você conferir.
                  </p>
                </div>

                <ul className="importar-colunas" aria-label="Colunas da planilha">
                  {modelo.colunas.map((coluna) => (
                    <li key={coluna.nome} className={coluna.obrigatoria ? 'obrigatoria' : undefined}>
                      <strong>
                        {coluna.nome}
                        {coluna.obrigatoria && <span aria-label="obrigatória"> *</span>}
                      </strong>
                      {coluna.dica && <small>{coluna.dica}</small>}
                    </li>
                  ))}
                </ul>
                <p className="form-dica">* obrigatória. Até {LIMITE_LINHAS} linhas por arquivo.</p>

                <label className={carregando ? 'importar-arquivo carregando' : 'importar-arquivo'}>
                  <input
                    type="file"
                    accept=".csv,text/csv,.txt"
                    onChange={escolherArquivo}
                    disabled={Boolean(carregando)}
                    aria-label="Arquivo da planilha (CSV)"
                  />
                  <span aria-hidden="true">📄</span>
                  <span>{carregando || (arquivo ? `${arquivo.name} · escolher outro` : 'Escolher arquivo CSV')}</span>
                </label>
              </>
            )}

            {etapa !== 'escolher' && resultado && (
              <>
                <div className="importar-resumo" role="status">
                  {etapa === 'previa' ? (
                    <>
                      <span>📄 {arquivo?.name}</span>
                      <span className="importar-ok">✓ {plural(resultado.validas, 'linha pronta', 'linhas prontas')}</span>
                      {resultado.comErro > 0 && (
                        <span className="importar-falha">✗ {plural(resultado.comErro, 'com erro', 'com erro')}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="importar-ok">
                        ✓ {plural(resultado.importadas, ...modelo.importados)}
                      </span>
                      {resultado.comErro > 0 && (
                        <span className="importar-falha">
                          ✗ {plural(resultado.comErro, 'linha ficou de fora', 'linhas ficaram de fora')}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {etapa === 'previa' && resultado.comErro > 0 && (
                  <p className="form-dica">
                    As linhas com erro ficam de fora. Depois você pode baixá-las, corrigir e importar de novo.
                  </p>
                )}

                {linhasParaMostrar.length > 0 && (
                  <div className="importar-tabela">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Linha</th>
                          <th>{modelo.item}</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasParaMostrar.map((linha) => (
                          <tr key={linha.linha} className={linha.erros.length > 0 ? 'importar-linha-erro' : undefined}>
                            <td>{linha.linha}</td>
                            <td>{linha.descricao}</td>
                            <td>
                              {linha.erros.length === 0 ? (
                                <span className="importar-ok">{linha.importada ? '✓ Importada' : '✓ Pronta'}</span>
                              ) : (
                                <ul className="importar-erros">
                                  {linha.erros.map((mensagem) => (
                                    <li key={mensagem}>{mensagem}</li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="importar-acoes">
                  {etapa === 'previa' ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secundario"
                        onClick={recomecar}
                        disabled={Boolean(carregando)}
                      >
                        Escolher outro arquivo
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        onClick={confirmar}
                        disabled={resultado.validas === 0 || Boolean(carregando)}
                      >
                        {carregando || `Importar ${plural(resultado.validas, 'linha', 'linhas')}`}
                      </button>
                    </>
                  ) : (
                    <>
                      {resultado.comErro > 0 && (
                        <button type="button" className="admin-btn admin-btn-secundario" onClick={baixarErros}>
                          ⬇ Baixar linhas com erro
                        </button>
                      )}
                      <button type="button" className="admin-btn admin-btn-primary" onClick={fechar}>
                        Concluir
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ImportarPlanilha;
