import { Link, useOutletContext } from 'react-router-dom';
import { podeUsar } from '../../utils/modulosAdmin';

// Só mostra a tela se o nível do funcionário liberar o módulo.
// (O servidor também confere: aqui é só para não abrir uma tela que daria erro.)
function RotaModulo({ modulo, children }) {
  const { acesso } = useOutletContext() || {};

  if (!podeUsar(acesso, modulo)) {
    return (
      <div className="admin-sem-acesso">
        <span aria-hidden="true">🔒</span>
        <h1>Acesso restrito</h1>
        <p>O seu nível de acesso não libera este módulo. Se precisar dele, fale com um usuário Master.</p>
        <Link to="/admin" className="admin-btn admin-btn-primary">Voltar ao início</Link>
      </div>
    );
  }

  return children;
}

export default RotaModulo;
