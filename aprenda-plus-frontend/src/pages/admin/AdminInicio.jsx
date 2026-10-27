import { Link, useOutletContext } from 'react-router-dom';
import { getNomeFuncionario } from '../../services/authAdminService';
import { modulosLiberados } from '../../utils/modulosAdmin';
import EtiquetaNivel from '../../components/admin/EtiquetaNivel';

// Tela inicial do painel: só os atalhos dos módulos que o nível do funcionário libera
function AdminInicio() {
  const { acesso } = useOutletContext() || {};
  const atalhos = modulosLiberados(acesso);
  const primeiroNome = (getNomeFuncionario() || '').split(' ')[0];

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo">Olá{primeiroNome ? `, ${primeiroNome}` : ''}!</h1>
          <p className="admin-subtitulo">
            {acesso?.nivel ? (
              <>
                Nível de acesso:{' '}
                <EtiquetaNivel nivel={{ nome: acesso.nivel, cor: acesso.cor, master: acesso.master }} />. Escolha por onde
                começar.
              </>
            ) : (
              'Escolha por onde começar.'
            )}
          </p>
        </div>
      </div>

      {atalhos.every((m) => m.todos) && (
        <div className="admin-sem-acesso">
          <span aria-hidden="true">🔒</span>
          <h2>Nenhum módulo liberado</h2>
          <p>O seu nível de acesso ainda não tem módulos liberados. Fale com um usuário Master.</p>
        </div>
      )}
      {atalhos.length > 0 && (
        <ul className="admin-atalhos">
          {atalhos.map((modulo) => (
            <li key={modulo.chave}>
              <Link to={modulo.rota} className="admin-atalho">
                <span className="admin-atalho-icone" aria-hidden="true">{modulo.icone}</span>
                <strong>{modulo.titulo}</strong>
                <span>{modulo.descricao}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminInicio;
