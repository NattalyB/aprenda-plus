import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-aprenda-plus-branco.png';
import {
  buscarMeuAcesso,
  getAcessoAdmin,
  getNomeFuncionario,
  logoutAdmin,
  salvarAcessoAdmin,
} from '../../services/authAdminService';
import { modulosLiberados, podeUsar } from '../../utils/modulosAdmin';
import NotificacoesInscricoes from './NotificacoesInscricoes';

const CHAVE_RECOLHIDO = 'menuAdminRecolhido';

const lerRecolhido = () => {
  try {
    return localStorage.getItem(CHAVE_RECOLHIDO) === 'sim';
  } catch {
    return false;
  }
};

function AdminLayout() {
  const navigate = useNavigate();
  const [acesso, setAcesso] = useState(getAcessoAdmin);
  const [recolhido, setRecolhido] = useState(lerRecolhido);
  // Nome do item quando o menu está recolhido e o mouse passa por cima
  const [dica, setDica] = useState(null);

  // Confere no servidor o nível atual (o Master pode ter mudado as permissões)
  useEffect(() => {
    buscarMeuAcesso()
      .then((atual) => {
        salvarAcessoAdmin(atual);
        setAcesso(getAcessoAdmin());
      })
      .catch(() => {
        // Sem conexão agora: continua com o que foi salvo no login
      });
  }, []);

  const alternarMenu = () => {
    setRecolhido((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem(CHAVE_RECOLHIDO, novo ? 'sim' : 'nao');
      } catch {
        // navegador sem armazenamento: só não lembra da escolha
      }
      return novo;
    });
    setDica(null);
  };

  const mostrarDica = (evento, texto) => {
    if (!recolhido) return;
    const caixa = evento.currentTarget.getBoundingClientRect();
    setDica({ texto, top: caixa.top + caixa.height / 2, left: caixa.right + 10 });
  };

  const esconderDica = () => setDica(null);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const itens = [
    { chave: 'inicio', rota: '/admin', menu: 'Início', icone: '🏠', fim: true },
    ...modulosLiberados(acesso),
  ];

  // Propriedades comuns dos itens do menu (nome escondido + dica quando recolhido)
  const propsDoItem = (texto) => ({
    'aria-label': recolhido ? texto : undefined,
    onMouseEnter: (e) => mostrarDica(e, texto),
    onMouseLeave: esconderDica,
    onFocus: (e) => mostrarDica(e, texto),
    onBlur: esconderDica,
  });

  return (
    <div className={recolhido ? 'admin-layout menu-recolhido' : 'admin-layout'}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-topo">
          <Link to="/admin" className="admin-sidebar-logo" {...propsDoItem('Início')}>
            <img src={logo} alt="Aprenda Plus" />
            <span className="admin-badge">PAINEL ADMIN</span>
          </Link>
          <button
            type="button"
            className="admin-recolher"
            onClick={alternarMenu}
            aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!recolhido}
          >
            {recolhido ? '»' : '«'}
          </button>
        </div>

        {(podeUsar(acesso, 'inscricoes') || podeUsar(acesso, 'financeiro')) && (
          <NotificacoesInscricoes
            inscricoes={podeUsar(acesso, 'inscricoes')}
            financeiro={podeUsar(acesso, 'financeiro')}
          />
        )}

        <nav className="admin-nav" aria-label="Menu do painel">
          {itens.map((item) => (
            <NavLink
              key={item.chave}
              to={item.rota}
              end={item.fim}
              className={({ isActive }) => (isActive ? 'admin-nav-link ativo' : 'admin-nav-link')}
              {...propsDoItem(item.menu)}
            >
              <span className="admin-nav-icone" aria-hidden="true">{item.icone}</span>
              <span className="admin-nav-texto">{item.menu}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-usuario">
            <span aria-hidden="true">👤</span>
            <span className="admin-usuario-texto">
              Olá, {getNomeFuncionario()}
              {acesso?.nivel && <small className="admin-nivel">{acesso.nivel}</small>}
            </span>
          </span>
          <button className="admin-btn-sair" onClick={handleLogout} {...propsDoItem('Sair')}>
            <span aria-hidden="true" className="admin-sair-icone">🚪</span>
            <span className="admin-sair-texto">Sair</span>
          </button>
        </div>
      </aside>

      {dica && (
        <div className="admin-dica" role="tooltip" style={{ top: dica.top, left: dica.left }}>
          {dica.texto}
        </div>
      )}

      <main className="admin-main">
        <Outlet context={{ acesso }} />
      </main>
    </div>
  );
}

export default AdminLayout;
