import { Navigate } from 'react-router-dom';
import { estaLogadoAdmin } from '../../services/authAdminService';

function RotaProtegidaAdmin({ children }) {
  if (!estaLogadoAdmin()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default RotaProtegidaAdmin;