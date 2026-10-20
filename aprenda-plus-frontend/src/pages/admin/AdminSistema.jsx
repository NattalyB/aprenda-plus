import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { listarNiveis, criarNivel, atualizarNivel, deletarNivel } from '../../services/funcionarioService';
import { MODULOS_LIBERAVEIS } from '../../utils/modulosAdmin';
import EtiquetaNivel, { CORES_SUGERIDAS, corDoNivel } from '../../components/admin/EtiquetaNivel';

// Módulo "Sistema" (só o Master): níveis de acesso e o que cada um pode usar.
// Cada linha é um nível; cada coluna, um módulo do painel.
function AdminSistema() {
  // Para a etiqueta do menu lateral já mudar de cor se o Master mexer no próprio nível
  const { recarregarAcesso } = useOutletContext() || {};
  const [niveis, setNiveis] = useState(null);
  // Alterações ainda não salvas, por nível: { [idNivel]: { nome, modulos, cor } }
  const [rascunhos, setRascunhos] = useState({});
  const [novoNome, setNovoNome] = useState('');
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [salvando, setSalvando] = useState(null);

  const carregar = () =>
    listarNiveis()
      .then((response) => {
        setNiveis(response.data);
        setRascunhos({});
      })
      .catch(() => setErro('Não foi possível carregar os níveis de acesso.'));

  useEffect(() => {
    carregar();
  }, []);

  const mensagemDoErro = (error, padrao) => error.response?.data?.mensagem || padrao;

  const valorAtual = (nivel) =>
    rascunhos[nivel.idNivel] || { nome: nivel.nome, modulos: nivel.modulos || [], cor: corDoNivel(nivel) };

  const alterado = (nivel) => Boolean(rascunhos[nivel.idNivel]);

  const editar = (nivel, mudanca) => {
    setSucesso(null);
    setRascunhos((atuais) => ({ ...atuais, [nivel.idNivel]: { ...valorAtual(nivel), ...mudanca } }));
  };

  const alternarModulo = (nivel, chave) => {
    const { modulos } = valorAtual(nivel);
    editar(nivel, { modulos: modulos.includes(chave) ? modulos.filter((m) => m !== chave) : [...modulos, chave] });
  };

  const salvar = (nivel) => {
    setErro(null);
    setSalvando(nivel.idNivel);
    atualizarNivel(nivel.idNivel, valorAtual(nivel))
      .then(() => {
        setSucesso(
          nivel.master ? `Cor do nível "${nivel.nome}" salva.` : `Permissões do nível "${valorAtual(nivel).nome}" salvas.`
        );
        if (recarregarAcesso) recarregarAcesso();
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível salvar o nível.')))
      .finally(() => setSalvando(null));
  };

  const descartar = (nivel) => {
    setRascunhos((atuais) => {
      const copia = { ...atuais };
      delete copia[nivel.idNivel];
      return copia;
    });
  };

  const excluir = (nivel) => {
    if (!window.confirm(`Excluir o nível "${nivel.nome}"?`)) return;
    setErro(null);
    setSucesso(null);
    deletarNivel(nivel.idNivel)
      .then(() => {
        setSucesso(`Nível "${nivel.nome}" excluído.`);
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível excluir o nível.')));
  };

  const criar = (e) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    criarNivel({ nome: novoNome, modulos: [] })
      .then(() => {
        setSucesso(`Nível "${novoNome.trim()}" criado. Agora marque os módulos dele e clique em Salvar.`);
        setNovoNome('');
        return carregar();
      })
      .catch((error) => setErro(mensagemDoErro(error, 'Não foi possível criar o nível.')));
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Sistema</h1>
          <p className="admin-subtitulo">
            Níveis de acesso do painel: marque os módulos que cada nível pode usar e escolha a cor da etiqueta de cada um.
            O Master sempre tem acesso a tudo.
          </p>
        </div>
      </div>

      {erro && <div className="form-erro">{erro}</div>}
      {sucesso && (
        <div className="form-sucesso" role="status">
          {sucesso}
        </div>
      )}

      <form className="sistema-novo" onSubmit={criar}>
        <label htmlFor="novoNivel">Novo nível</label>
        <input
          id="novoNivel"
          name="novoNivel"
          placeholder="Ex.: Contabilidade"
          maxLength={50}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          required
        />
        <button type="submit" className="admin-btn admin-btn-primary" disabled={!novoNome.trim()}>
          + Criar nível
        </button>
      </form>

      {!niveis ? (
        !erro && <p>Carregando níveis...</p>
      ) : (
        <div className="admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table sistema-tabela">
              <thead>
                <tr>
                  <th>Nível</th>
                  {MODULOS_LIBERAVEIS.map((modulo) => (
                    <th key={modulo.chave} className="sistema-coluna-modulo">
                      <span aria-hidden="true">{modulo.icone}</span>
                      <span>{modulo.titulo}</span>
                    </th>
                  ))}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {niveis.map((nivel) => {
                  const atual = valorAtual(nivel);
                  return (
                    <tr key={nivel.idNivel} className={nivel.master ? 'sistema-master' : undefined}>
                      <td>
                        <div className="sistema-nivel">
                          <input
                            type="color"
                            className="sistema-cor"
                            list="cores-dos-niveis"
                            aria-label={`Cor do nível ${nivel.nome}`}
                            title="Escolher a cor do nível"
                            value={atual.cor}
                            onChange={(e) => editar(nivel, { cor: e.target.value })}
                          />
                          {nivel.master ? (
                            <strong>
                              <EtiquetaNivel nivel={{ nome: nivel.nome, cor: atual.cor }} />{' '}
                              <span className="status-badge status-ativo">Acesso total</span>
                            </strong>
                          ) : (
                            <input
                              className="sistema-nome"
                              aria-label={`Nome do nível ${nivel.nome}`}
                              value={atual.nome}
                              maxLength={50}
                              style={{ borderLeftColor: atual.cor }}
                              onChange={(e) => editar(nivel, { nome: e.target.value })}
                            />
                          )}
                        </div>
                      </td>
                      {MODULOS_LIBERAVEIS.map((modulo) => (
                        <td key={modulo.chave} className="sistema-celula">
                          <input
                            type="checkbox"
                            aria-label={`${modulo.titulo} para ${nivel.nome}`}
                            checked={nivel.master || atual.modulos.includes(modulo.chave)}
                            disabled={nivel.master}
                            onChange={() => alternarModulo(nivel, modulo.chave)}
                          />
                        </td>
                      ))}
                      <td>
                        {nivel.master && !alterado(nivel) ? (
                          <span className="sistema-dica">Inclui o módulo Sistema</span>
                        ) : (
                          <div className="admin-acoes">
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-primary"
                              disabled={!alterado(nivel) || salvando === nivel.idNivel}
                              onClick={() => salvar(nivel)}
                            >
                              {salvando === nivel.idNivel ? 'Salvando...' : 'Salvar'}
                            </button>
                            {alterado(nivel) || nivel.master ? (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-secundario"
                                onClick={() => descartar(nivel)}
                              >
                                Desfazer
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-excluir"
                                onClick={() => excluir(nivel)}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <datalist id="cores-dos-niveis">
        {CORES_SUGERIDAS.map((cor) => (
          <option key={cor} value={cor} />
        ))}
      </datalist>

      <p className="sistema-rodape">
        A cor escolhida aparece na etiqueta do nível na lista de funcionários e no menu de quem é daquele nível.
        <br />
        Sem um módulo liberado, ele some do menu e dos atalhos, e o servidor recusa criar, editar ou excluir nele.
        Consultas continuam liberadas para as outras telas funcionarem (exceto Funcionários e Sistema).
      </p>
    </div>
  );
}

export default AdminSistema;
