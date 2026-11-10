import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import RotaModulo from './RotaModulo';
import { logarAdmin } from '../../testUtils';
import { listarInscricoes } from '../../services/inscricaoService';
import { buscarMeuAcesso } from '../../services/authAdminService';
import { buscarAlertasFinanceiros } from '../../services/financeiroService';
import { situacaoDosDocumentos } from '../../services/documentoService';
import { listarChamados, listarMeusChamados } from '../../services/chamadoService';
import { listarAtualizacoes } from '../../services/atualizacaoService';

jest.mock('../../services/inscricaoService');
jest.mock('../../services/financeiroService');
jest.mock('../../services/chamadoService', () => ({
  listarChamados: jest.fn(() => Promise.resolve([])),
  listarMeusChamados: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../services/atualizacaoService', () => ({
  listarAtualizacoes: jest.fn(() => Promise.resolve([])),
  listarManutencoes: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../services/documentoService', () => ({
  ...jest.requireActual('../../services/documentoService'),
  situacaoDosDocumentos: jest.fn(),
}));
jest.mock('../../services/authAdminService', () => ({
  ...jest.requireActual('../../services/authAdminService'),
  buscarMeuAcesso: jest.fn(),
}));

const FINANCEIRO = { nivel: 'Financeiro', master: false, modulos: ['inscricoes', 'matriculas'] };

const montar = (rota = '/admin/cursos') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin/login" element={<p>Tela de login do admin</p>} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>Início do painel</p>} />
          <Route path="cursos" element={<RotaModulo modulo="cursos"><p>Conteúdo de cursos</p></RotaModulo>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

const menu = () => screen.getByRole('navigation', { name: 'Menu do painel' });

beforeEach(() => {
  localStorage.clear();
  listarInscricoes.mockResolvedValue({ data: [] });
  buscarAlertasFinanceiros.mockResolvedValue({ vencendoEmBreve: 0, atrasadas: 0 });
  situacaoDosDocumentos.mockResolvedValue({ data: {} });
  buscarMeuAcesso.mockReturnValue(new Promise(() => {})); // por padrão o servidor não responde
  listarAtualizacoes.mockResolvedValue([]);
});

test('Master vê o menu completo, o nome, o nível e a página atual', () => {
  logarAdmin('Admin Teste');
  montar();

  expect(screen.getByText('Olá, Admin Teste')).toBeInTheDocument();
  expect(screen.getByText('Master')).toBeInTheDocument();
  // Início + 18 itens (incluindo Sala de aula, Financeiro, Comercial, Chamados, Treinamentos, Atualizações, Suporte,
  // Histórico e Sistema)
  expect(within(menu()).getAllByRole('link')).toHaveLength(19);
  expect(screen.getByText('Chamados')).toBeInTheDocument();
  expect(screen.getByText('Histórico de alterações')).toBeInTheDocument();
  expect(screen.getByText('Funcionários do painel')).toBeInTheDocument();
  expect(screen.getByText('Sistema')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Notificações/ })).toBeInTheDocument();
  expect(screen.getByText('Conteúdo de cursos')).toBeInTheDocument();
  expect(screen.getByText('Cadastro de cursos').closest('a')).toHaveClass('ativo');
  expect(screen.getByText('Cadastro de alunos').closest('a')).not.toHaveClass('ativo');
});

test('outro nível só vê os módulos liberados', () => {
  logarAdmin('Carla', FINANCEIRO);
  montar('/admin');

  const textos = within(menu()).getAllByRole('link').map((link) => link.textContent);
  // Treinamentos, Atualizações e Suporte aparecem para toda a equipe
  expect(textos).toEqual(['🏠Início', '🧾Inscrições', '✅Matrículas', '📚Treinamentos', '📢Atualizações', '🆘Suporte']);
  expect(screen.getByText('Início do painel')).toBeInTheDocument();
});

test('só com o financeiro, o sininho aparece para os avisos de parcelas', () => {
  logarAdmin('Fabi', { nivel: 'Contabilidade', master: false, modulos: ['financeiro'] });
  montar('/admin');

  expect(screen.getByRole('button', { name: /Notificações/ })).toBeInTheDocument();
  expect(screen.getByText('Financeiro')).toBeInTheDocument();
});

test('sem inscrições, alunos nem financeiro, o sininho só confere as respostas dos próprios chamados', async () => {
  jest.clearAllMocks();
  logarAdmin('Davi', { nivel: 'Cursos', master: false, modulos: ['cursos', 'turmas'] });
  montar('/admin');

  expect(screen.getByRole('button', { name: /Notificações/ })).toBeInTheDocument();
  await waitFor(() => expect(listarMeusChamados).toHaveBeenCalledWith('funcionario'));
  expect(listarChamados).not.toHaveBeenCalled();
  expect(listarInscricoes).not.toHaveBeenCalled();
});

test('cada nível só é avisado do que é dele: documentos para quem cuida de alunos', async () => {
  jest.clearAllMocks();
  logarAdmin('Sil', { nivel: 'Secretaria', master: false, modulos: ['alunos'] });
  montar('/admin');

  expect(screen.getByRole('button', { name: /Notificações/ })).toBeInTheDocument();
  await waitFor(() => expect(situacaoDosDocumentos).toHaveBeenCalled());
  expect(listarInscricoes).not.toHaveBeenCalled();
  expect(buscarAlertasFinanceiros).not.toHaveBeenCalled();
});

test('o Financeiro (inscrições + financeiro) não recebe aviso de documentos', async () => {
  jest.clearAllMocks();
  logarAdmin('Fabi', { nivel: 'Financeiro', master: false, modulos: ['inscricoes', 'financeiro'] });
  montar('/admin');

  await waitFor(() => expect(buscarAlertasFinanceiros).toHaveBeenCalled());
  expect(listarInscricoes).toHaveBeenCalled();
  expect(situacaoDosDocumentos).not.toHaveBeenCalled();
});

test('a etiqueta do nível no menu usa a cor escolhida pelo Master', () => {
  logarAdmin('Fabi', { nivel: 'Financeiro', master: false, modulos: ['financeiro'], cor: '#16a34a' });
  montar('/admin');

  const etiqueta = within(screen.getByText('Olá, Fabi').closest('.admin-usuario')).getByText('Financeiro');
  expect(etiqueta).toHaveStyle({ background: '#16a34a', color: '#ffffff' });
});

test('abrir uma tela sem permissão mostra acesso restrito', () => {
  logarAdmin('Carla', FINANCEIRO);
  montar('/admin/cursos');

  expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  expect(screen.queryByText('Conteúdo de cursos')).not.toBeInTheDocument();
});

test('atualiza o menu com o nível que está no servidor agora', async () => {
  logarAdmin('Carla', FINANCEIRO);
  buscarMeuAcesso.mockResolvedValue({ nivel: 'Financeiro', master: false, modulos: ['matriculas', 'alunos'] });
  montar('/admin');

  expect(await screen.findByText('Cadastro de alunos')).toBeInTheDocument();
  expect(screen.queryByText('Inscrições')).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('acessoAdmin')).modulos).toEqual(['matriculas', 'alunos']);
});

test('sem conexão, continua com o acesso salvo no login', async () => {
  logarAdmin('Carla', FINANCEIRO);
  buscarMeuAcesso.mockRejectedValue(new Error('offline'));
  montar('/admin');

  await waitFor(() => expect(buscarMeuAcesso).toHaveBeenCalled());
  expect(screen.getByText('Inscrições')).toBeInTheDocument();
});

test('acesso salvo inválido é tratado como sem módulos', () => {
  logarAdmin();
  localStorage.setItem('acessoAdmin', '{quebrado');
  montar('/admin');

  expect(within(menu()).getAllByRole('link')).toHaveLength(1);
});

test('recolhe o menu, lembra a escolha e mostra o nome ao passar o mouse', () => {
  logarAdmin();
  const { container, unmount } = montar('/admin');

  fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));

  expect(container.querySelector('.admin-layout')).toHaveClass('menu-recolhido');
  expect(localStorage.getItem('menuAdminRecolhido')).toBe('sim');

  const link = screen.getByRole('link', { name: 'Cadastro de alunos' });
  fireEvent.mouseEnter(link);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Cadastro de alunos');
  fireEvent.mouseLeave(link);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.focus(screen.getByRole('button', { name: 'Sair' }));
  expect(screen.getByRole('tooltip')).toHaveTextContent('Sair');
  fireEvent.blur(screen.getByRole('button', { name: 'Sair' }));

  // Ao voltar para o painel, continua recolhido
  unmount();
  const novo = montar('/admin');
  expect(novo.container.querySelector('.admin-layout')).toHaveClass('menu-recolhido');

  fireEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
  expect(localStorage.getItem('menuAdminRecolhido')).toBe('nao');
});

test('com o menu aberto, passar o mouse não mostra dica', () => {
  logarAdmin();
  montar('/admin');

  fireEvent.mouseEnter(screen.getByText('Cadastro de alunos').closest('a'));

  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('navegador sem armazenamento: o menu ainda recolhe', () => {
  logarAdmin();
  const original = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  montar('/admin');
  Storage.prototype.setItem = () => {
    throw new Error('bloqueado');
  };
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
  } finally {
    Storage.prototype.setItem = original;
    Storage.prototype.getItem = originalGet;
  }
});

test('lendo a escolha com o armazenamento bloqueado, começa aberto', () => {
  logarAdmin();
  const originalGet = Storage.prototype.getItem;
  Storage.prototype.getItem = function getItem(chave) {
    if (chave === 'menuAdminRecolhido') throw new Error('bloqueado');
    return originalGet.call(this, chave);
  };
  try {
    montar('/admin');
    expect(screen.getByRole('button', { name: 'Recolher menu' })).toBeInTheDocument();
  } finally {
    Storage.prototype.getItem = originalGet;
  }
});

test('Sair desloga o funcionário e volta pro login do admin', () => {
  logarAdmin();
  montar();

  fireEvent.click(screen.getByText('Sair'));

  expect(localStorage.getItem('tokenAdmin')).toBeNull();
  expect(localStorage.getItem('acessoAdmin')).toBeNull();
  expect(screen.getByText('Tela de login do admin')).toBeInTheDocument();
});

test('RotaModulo fora do layout (sem contexto) bloqueia a tela', () => {
  render(
    <MemoryRouter>
      <RotaModulo modulo="alunos">
        <p>Tela de alunos</p>
      </RotaModulo>
    </MemoryRouter>
  );

  expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
});

describe('atualizações do sistema', () => {
  const daquiA = (minutos) => {
    const d = new Date(Date.now() + minutos * 60000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  };
  const LISTA = [
    { idAtualizacao: 9, tipo: 'manutencao', titulo: 'Troca do servidor', descricao: '',
      inicioManutencao: daquiA(60), fimManutencao: daquiA(90) },
    { idAtualizacao: 8, tipo: 'novidade', titulo: 'Relatório novo', descricao: '' },
  ];

  test('no primeiro acesso começa em dia, mas mostra a faixa de manutenção', async () => {
    listarAtualizacoes.mockResolvedValue(LISTA);
    logarAdmin();
    localStorage.setItem('idFuncionario', '4');
    montar('/admin');

    expect(await screen.findByText('Manutenção programada:')).toBeInTheDocument();
    expect(localStorage.getItem('atualizacoesVistas:4')).toBe('9');
    expect(document.querySelector('.admin-nav-bolinha')).toBeNull();
  });

  test('o que chegou depois ganha bolinha no menu e aviso no sininho; abrir marca como visto', async () => {
    listarAtualizacoes.mockResolvedValue(LISTA);
    logarAdmin('Carla', FINANCEIRO);
    localStorage.setItem('idFuncionario', '4');
    localStorage.setItem('atualizacoesVistas:4', '7');
    montar('/admin');

    expect(await screen.findByLabelText('2 nova(s)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /2 atualizações do sistema/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver atualizações' }));

    expect(localStorage.getItem('atualizacoesVistas:4')).toBe('9');
    await waitFor(() => expect(screen.queryByLabelText('2 nova(s)')).not.toBeInTheDocument());
  });

  test('sem conexão não mostra nada nem quebra', async () => {
    listarAtualizacoes.mockRejectedValue(new Error('offline'));
    logarAdmin();
    montar('/admin');

    await waitFor(() => expect(listarAtualizacoes).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
