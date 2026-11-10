import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MeusChamados from './MeusChamados';
import SuporteProfessor from '../../pages/professor/SuporteProfessor';
import AdminSuporte from '../../pages/admin/AdminSuporte';
import {
  abrirChamado,
  buscarMeuChamado,
  escreverNoChamado,
  fecharChamado,
  listarMeusChamados,
} from '../../services/chamadoService';

jest.mock('../../services/atualizacaoService', () => ({
  listarManutencoes: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../services/chamadoService', () => ({
  listarMeusChamados: jest.fn(),
  buscarMeuChamado: jest.fn(),
  abrirChamado: jest.fn(),
  escreverNoChamado: jest.fn(),
  fecharChamado: jest.fn(),
  baixarAnexoDoMeuChamado: jest.fn(),
}));

const item = (id, status, dados = {}) => ({
  idChamado: id, assunto: `Chamado ${id}`, categoria: 'erro', prioridade: 'media', status,
  ultimaMensagemDe: 'solicitante', atualizadoEm: '2026-11-07T10:00:00', mensagens: [], ...dados,
});

const montar = (rota, state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: rota.split('?')[0], search: rota.includes('?') ? `?${rota.split('?')[1]}` : '', state }]}>
      <Routes>
        <Route path="/admin/suporte" element={<MeusChamados perfil="funcionario" rota="/admin/suporte" />} />
        <Route path="/admin/suporte/:idChamado" element={<MeusChamados perfil="funcionario" rota="/admin/suporte" />} />
        <Route path="/professor/suporte" element={<SuporteProfessor />} />
        <Route path="/professor/suporte/:idChamado" element={<SuporteProfessor />} />
        <Route path="/login" element={<p>Tela de login</p>} />
        <Route path="/painel" element={<AdminSuporte />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('lista os chamados abertos, esconde os fechados e marca resposta do suporte', async () => {
  listarMeusChamados.mockResolvedValue([
    item(3, 'resolvido', { ultimaMensagemDe: 'suporte' }),
    item(2, 'aberto'),
    item(1, 'fechado'),
  ]);
  montar('/admin/suporte');

  expect(await screen.findByText('Chamado 3')).toBeInTheDocument();
  expect(listarMeusChamados).toHaveBeenCalledWith('funcionario');
  expect(screen.getByText('Resposta do suporte')).toBeInTheDocument();
  expect(screen.queryByText('Chamado 1')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Mostrar os fechados (1)'));
  expect(screen.getByText('Chamado 1')).toBeInTheDocument();
  expect(screen.getByText('Chamado 3').closest('a')).toHaveAttribute('href', '/admin/suporte/3');
});

test('sem chamados mostra o convite; abrir um novo leva para a conversa', async () => {
  listarMeusChamados.mockResolvedValue([]);
  abrirChamado.mockResolvedValue({ idChamado: 9 });
  buscarMeuChamado.mockResolvedValue(item(9, 'aberto'));
  montar('/admin/suporte', { de: '/admin/financeiro' });

  expect(await screen.findByText(/Você ainda não abriu nenhum chamado/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+ Abrir chamado' }));
  expect(screen.getByLabelText('Onde aconteceu? (tela)')).toHaveValue('Financeiro');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(screen.getByRole('button', { name: '+ Abrir chamado' }));
  fireEvent.change(screen.getByLabelText('Assunto *'), { target: { value: 'A' } });
  fireEvent.change(screen.getByLabelText('Descrição do problema *'), { target: { value: 'B' } });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));

  expect(await screen.findByRole('heading', { name: /#9 Chamado 9/ })).toBeInTheDocument();
  expect(buscarMeuChamado).toHaveBeenCalledWith('funcionario', '9');
});

test('com ?novo=1 o formulário já vem aberto; erro ao listar aparece', async () => {
  listarMeusChamados.mockRejectedValue(new Error('offline'));
  montar('/admin/suporte?novo=1');
  expect(screen.getByLabelText('Assunto *')).toBeInTheDocument();
  expect(await screen.findByText('Não foi possível carregar os seus chamados.')).toBeInTheDocument();
});

test('conversa: escreve, fecha e volta para a lista', async () => {
  listarMeusChamados.mockResolvedValue([item(4, 'aberto')]);
  buscarMeuChamado.mockResolvedValue(item(4, 'aberto'));
  escreverNoChamado.mockResolvedValue(item(4, 'aberto'));
  fecharChamado.mockResolvedValue(item(4, 'fechado'));
  montar('/admin/suporte/4');

  expect(await screen.findByRole('heading', { name: /#4 Chamado 4/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Escrever no chamado'), { target: { value: 'Oi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  await waitFor(() => expect(escreverNoChamado).toHaveBeenCalledWith('funcionario', 4, 'Oi', null));
  fireEvent.click(screen.getByRole('button', { name: /fechar chamado/ }));
  expect(await screen.findByText(/Este chamado foi fechado/)).toBeInTheDocument();
  expect(fecharChamado).toHaveBeenCalledWith('funcionario', 4);
  expect(screen.getByRole('link', { name: '← Meus chamados' })).toHaveAttribute('href', '/admin/suporte');
});

test('chamado de outra pessoa mostra o erro do servidor', async () => {
  listarMeusChamados.mockResolvedValue([]);
  buscarMeuChamado.mockRejectedValueOnce({ response: { data: { mensagem: 'Chamado não encontrado.' } } });
  montar('/admin/suporte/5');
  expect(await screen.findByText('Chamado não encontrado.')).toBeInTheDocument();
});

test('erro genérico ao abrir a conversa', async () => {
  listarMeusChamados.mockResolvedValue([]);
  buscarMeuChamado.mockRejectedValueOnce(new Error('offline'));
  montar('/admin/suporte/5');
  expect(await screen.findByText('Não foi possível abrir o chamado.')).toBeInTheDocument();
});

test('Portal do Professor: usa as rotas do professor e pede login', async () => {
  montar('/professor/suporte');
  expect(screen.getByText('Tela de login')).toBeInTheDocument();

  localStorage.setItem('tokenProfessor', 't');
  listarMeusChamados.mockResolvedValue([]);
  buscarMeuChamado.mockResolvedValue(item(6, 'aberto'));
  montar('/professor/suporte');
  expect(await screen.findAllByText(/Você ainda não abriu nenhum chamado/)).not.toHaveLength(0);
  expect(listarMeusChamados).toHaveBeenCalledWith('professor');
  expect(screen.getByRole('link', { name: '← Minhas turmas' })).toHaveAttribute('href', '/professor');
});

test('Portal do Professor: dentro de um chamado não repete o link das turmas', async () => {
  localStorage.setItem('tokenProfessor', 't');
  listarMeusChamados.mockResolvedValue([]);
  buscarMeuChamado.mockResolvedValue(item(6, 'aberto'));
  montar('/professor/suporte/6');
  expect(await screen.findByRole('heading', { name: /#6 Chamado 6/ })).toBeInTheDocument();
  expect(buscarMeuChamado).toHaveBeenCalledWith('professor', '6');
  expect(screen.queryByRole('link', { name: '← Minhas turmas' })).not.toBeInTheDocument();
});

test('a página do painel usa o perfil de funcionário', async () => {
  listarMeusChamados.mockResolvedValue([]);
  montar('/painel');
  await waitFor(() => expect(listarMeusChamados).toHaveBeenCalledWith('funcionario'));
});
