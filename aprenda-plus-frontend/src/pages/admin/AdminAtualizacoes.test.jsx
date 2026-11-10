import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import AdminAtualizacoes from './AdminAtualizacoes';
import {
  criarAtualizacao,
  editarAtualizacao,
  excluirAtualizacao,
  listarAtualizacoes,
} from '../../services/atualizacaoService';

jest.mock('../../services/atualizacaoService', () => ({
  listarAtualizacoes: jest.fn(),
  criarAtualizacao: jest.fn(),
  editarAtualizacao: jest.fn(),
  excluirAtualizacao: jest.fn(),
}));

const daquiA = (minutos) => {
  const d = new Date(Date.now() + minutos * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

const LISTA = [
  { idAtualizacao: 15, tipo: 'manutencao', titulo: 'Troca do servidor', descricao: 'Fora do ar por 30 minutos.',
    versao: null, publicadoEm: '2026-11-09T22:00:00', inicioManutencao: daquiA(120), fimManutencao: daquiA(150) },
  { idAtualizacao: 13, tipo: 'novidade', titulo: 'Atualizações do sistema', descricao: 'Nova área no painel.',
    versao: 'v2.0', publicadoEm: '2026-11-09T21:00:00' },
  { idAtualizacao: 12, tipo: 'melhoria', titulo: 'Tema claro, escuro e alto contraste', descricao: 'Três temas.',
    versao: 'v1.9', publicadoEm: '2026-11-07T09:30:00' },
  { idAtualizacao: 1, tipo: 'correcao', titulo: 'Correções no carrinho e no login', descricao: 'Ajustes.',
    versao: 'v0.9', publicadoEm: '2026-10-11T10:00:00' },
];

const recarregarAtualizacoes = jest.fn();

const montar = (acesso = { nivel: 'Master', master: true, modulos: [] }) =>
  render(
    <MemoryRouter initialEntries={['/admin/atualizacoes']}>
      <Routes>
        <Route path="/admin" element={<Outlet context={{ acesso, recarregarAtualizacoes }} />}>
          <Route path="atualizacoes" element={<AdminAtualizacoes />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('idFuncionario', '3');
  jest.clearAllMocks();
  listarAtualizacoes.mockResolvedValue(LISTA);
  criarAtualizacao.mockResolvedValue({ idAtualizacao: 16 });
  editarAtualizacao.mockResolvedValue({ idAtualizacao: 13 });
  excluirAtualizacao.mockResolvedValue({});
  window.confirm = jest.fn(() => true);
});

test('mostra a linha do tempo por mês, as manutenções e marca tudo como visto', async () => {
  localStorage.setItem('atualizacoesVistas:3', '12');
  montar({ nivel: 'Financeiro', master: false, modulos: [] });

  expect(screen.getByText('Carregando atualizações...')).toBeInTheDocument();
  expect(await screen.findByText('Correções no carrinho e no login')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument();
  expect(screen.getByText('v2.0')).toBeInTheDocument();
  expect(screen.getAllByText('09/11/2026')).toHaveLength(2);

  const programadas = screen.getByRole('region', { name: 'Manutenções programadas' });
  expect(within(programadas).getByText('Troca do servidor')).toBeInTheDocument();
  expect(within(programadas).getByText('Programada')).toBeInTheDocument();

  // O que chegou depois da última visita continua destacado como "Nova"
  expect(screen.getAllByText('Nova')).toHaveLength(2);
  expect(localStorage.getItem('atualizacoesVistas:3')).toBe('15');

  // Quem não é Master só consulta
  expect(screen.queryByRole('button', { name: '+ Publicar atualização' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
});

test('filtra por tipo com a contagem de cada um', async () => {
  montar();
  await screen.findByText('Correções no carrinho e no login');

  expect(screen.getByRole('button', { name: /Todas 4/ })).toHaveClass('ativo');
  fireEvent.click(screen.getByRole('button', { name: /Correções 1/ }));
  expect(screen.queryByText('Nova área no painel.')).not.toBeInTheDocument();
  expect(screen.getByText('Correções no carrinho e no login')).toBeInTheDocument();
  // Primeiro acesso: nada aparece como "Nova"
  expect(screen.queryByText('Nova')).not.toBeInTheDocument();
});

test('o Master publica uma manutenção com início e fim', async () => {
  montar();
  await screen.findByText('Correções no carrinho e no login');

  fireEvent.click(screen.getByRole('button', { name: '+ Publicar atualização' }));
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Troca do banco' } });
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'manutencao' } });
  fireEvent.change(screen.getByLabelText('Início da manutenção'), { target: { value: '2026-11-20T22:00' } });
  fireEvent.change(screen.getByLabelText('Fim da manutenção'), { target: { value: '2026-11-20T22:30' } });
  fireEvent.change(screen.getByLabelText('O que mudou'), { target: { value: 'Fora do ar por meia hora.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

  await waitFor(() => expect(criarAtualizacao).toHaveBeenCalledWith({
    titulo: 'Troca do banco', tipo: 'manutencao', versao: '', descricao: 'Fora do ar por meia hora.',
    inicioManutencao: '2026-11-20T22:00', fimManutencao: '2026-11-20T22:30',
  }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument());
  expect(recarregarAtualizacoes).toHaveBeenCalled();
  expect(listarAtualizacoes).toHaveBeenCalledTimes(2);
});

test('mostra o erro do servidor e permite cancelar', async () => {
  criarAtualizacao.mockRejectedValue({ response: { data: { mensagem: 'Descreva o que mudou.' } } });
  montar();
  await screen.findByText('Correções no carrinho e no login');

  fireEvent.click(screen.getByRole('button', { name: '+ Publicar atualização' }));
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Algo' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Publicar' }).closest('form'));
  expect(await screen.findByText('Descreva o que mudou.')).toBeInTheDocument();

  criarAtualizacao.mockRejectedValue(new Error('offline'));
  fireEvent.submit(screen.getByRole('button', { name: 'Publicar' }).closest('form'));
  expect(await screen.findByText('Não foi possível salvar a atualização.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByLabelText('Título')).not.toBeInTheDocument();
});

test('o Master edita (e a manutenção vem com as datas) e exclui', async () => {
  montar();
  await screen.findByText('Correções no carrinho e no login');

  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
  expect(screen.getByLabelText('Título')).toHaveValue('Troca do servidor');
  expect(screen.getByLabelText('Início da manutenção').value).toBe(LISTA[0].inicioManutencao.slice(0, 16));
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'melhoria' } });
  expect(screen.queryByLabelText('Início da manutenção')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(editarAtualizacao).toHaveBeenCalledWith(15, expect.objectContaining({
    tipo: 'melhoria', inicioManutencao: null, fimManutencao: null,
  })));

  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
  expect(screen.getByLabelText('Versão (opcional)')).toHaveValue('v2.0');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[3]);
  expect(window.confirm).toHaveBeenCalledWith('Excluir a atualização "Correções no carrinho e no login"?');
  await waitFor(() => expect(excluirAtualizacao).toHaveBeenCalledWith(1));

  window.confirm = jest.fn(() => false);
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
  expect(excluirAtualizacao).toHaveBeenCalledTimes(1);

  window.confirm = jest.fn(() => true);
  excluirAtualizacao.mockRejectedValue({ response: { data: { mensagem: 'Atualização não encontrada.' } } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
  expect(await screen.findByText('Atualização não encontrada.')).toBeInTheDocument();
  excluirAtualizacao.mockRejectedValue(new Error('offline'));
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
  expect(await screen.findByText('Não foi possível excluir a atualização.')).toBeInTheDocument();
});

test('lista vazia, filtro vazio e erro ao carregar', async () => {
  listarAtualizacoes.mockResolvedValue([]);
  const { unmount } = montar();
  expect(await screen.findByText('Nenhuma atualização publicada ainda.')).toBeInTheDocument();
  unmount();

  listarAtualizacoes.mockResolvedValue([LISTA[1]]);
  const segundo = montar();
  await screen.findByText('Nova área no painel.');
  fireEvent.click(screen.getByRole('button', { name: /Manutenções 0/ }));
  expect(screen.getByText('Nenhuma atualização deste tipo.')).toBeInTheDocument();
  segundo.unmount();

  listarAtualizacoes.mockRejectedValue(new Error('offline'));
  montar();
  expect(await screen.findByText('Não foi possível carregar as atualizações.')).toBeInTheDocument();
});

test('manutenção já concluída aparece na linha do tempo como concluída', async () => {
  listarAtualizacoes.mockResolvedValue([
    { ...LISTA[0], inicioManutencao: '2026-10-01T22:00:00', fimManutencao: '2026-10-01T22:30:00' },
  ]);
  montar();
  expect(await screen.findByText(/01\/10 das 22:00 às 22:30 · concluída/)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Manutenções programadas' })).not.toBeInTheDocument();
});
