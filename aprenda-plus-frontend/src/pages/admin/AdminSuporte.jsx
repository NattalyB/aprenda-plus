import MeusChamados from '../../components/chamados/MeusChamados';

// Suporte do painel: qualquer funcionário abre e acompanha os próprios chamados.
function AdminSuporte() {
  return <MeusChamados perfil="funcionario" rota="/admin/suporte" />;
}

export default AdminSuporte;
