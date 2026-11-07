import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminChamados from './AdminChamados';
import {
  atualizarChamado,
  buscarChamado,
  listarChamados,
  responderChamado,
} from '../../services/chamadoService';

jest.mock('../../services/chamadoService', () => ({
  listarChamados: jest.fn(),
  buscarChamado: jest.fn(),
  responderChamado: jest.fn(),
  atualizarChamado: jest.fn(),
  baixarAnexoDoChamado: jest.fn(),
}));

const item = (id, status, prioridade, dados = {}) => ({
  idChamado: id, assunto: `Assunto ${id}`, categoria: 'erro', prioridade, status, tela: 'Financeiro',
  tipoSolicitante: 'funcionario', nomeSolicitante: `Pessoa ${id}`, ultimaMensagemDe: 'solicitante',
  atualizadoEm: `2026-11-0${id}T10:00:00`, responsavelId: null, responsavelNome: null, mensagens: [], ...dados,
});

const lista = [
  item(1, 'aberto', 'baixa'),
  item(2, 'aberto', 'urgente', { tipoSolicitante: 'professor' }),
  item(3, 'em_atendimento', 'media', { ultimaMensagemDe: 'suporte', responsavelNome: 'Suporte' }),
  item(4, 'resolvido', 'alta'),
  item(5, 'fechado', 'media'),
  item(6, 'em_atendimento', 'alta', { ultimaMensagemDe: 'solicitante' }),
];

const montar = (rota = '/admin/chamados') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin/chamados" element={<AdminChamados />} />
        <Route path="/admin/chamados/:idChamado" element={<AdminChamados />} />
      </Routes>
    </MemoryRouter>
  );

const linhas = () => screen.getAllByRole('row').slice(1);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('idFuncionario', '1');
  listarChamados.mockResolvedValue(lista);
});

test('começa pelos que esperam o suporte, do mais urgente ao menos', async () => {
  montar();
  await screen.findByText('Assunto 2');
  expect(linhas().map((l) => within(l).getAllByRole('cell')[0].textContent)).toEqual(['#2', '#6', '#1']);
  expect(screen.getByRole('button', { name: /Aguardando o suporte 3/ })).toHaveClass('ativo');
  expect(screen.getByText('Nova mensagem')).toBeInTheDocument();       // #6: o solicitante escreveu de novo
  expect(within(linhas()[0]).getByText('Professor')).toBeInTheDocument();
});

test('filtra por situação, prioridade e busca', async () => {
  montar();
  await screen.findByText('Assunto 2');

  fireEvent.click(screen.getByRole('button', { name: /Em aberto/ }));
  expect(linhas()).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: /Resolvidos/ }));
  expect(linhas()).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /Fechados/ }));
  expect(screen.getByText('Assunto 5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Todos/ }));
  expect(linhas()).toHaveLength(6);

  fireEvent.change(screen.getByLabelText('Filtrar por prioridade'), { target: { value: 'alta' } });
  expect(linhas()).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Buscar chamado'), { target: { value: 'pessoa 6' } });
  expect(linhas()).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Buscar chamado'), { target: { value: 'nada' } });
  expect(screen.getByText('Nenhum chamado encontrado.')).toBeInTheDocument();
});

test('sem pendências mostra que está tudo em dia; erro ao listar aparece', async () => {
  listarChamados.mockResolvedValueOnce([item(5, 'fechado', 'media')]);
  montar();
  expect(await screen.findByText(/Tudo em dia/)).toBeInTheDocument();

  listarChamados.mockRejectedValueOnce({ response: { data: { mensagem: 'Seu nível de acesso não permite usar este módulo.' } } });
  montar();
  expect(await screen.findByText('Seu nível de acesso não permite usar este módulo.')).toBeInTheDocument();
});

test('clicar na linha abre o chamado; responder e atualizar recarregam a lista', async () => {
  buscarChamado.mockResolvedValue(item(2, 'aberto', 'urgente'));
  responderChamado.mockResolvedValue(item(2, 'em_atendimento', 'urgente'));
  atualizarChamado.mockResolvedValue(item(2, 'em_atendimento', 'urgente', { responsavelId: 1 }));
  montar();
  await screen.findByText('Assunto 2');

  fireEvent.click(screen.getByText('Pessoa 2'));
  expect(await screen.findByRole('heading', { name: /#2 Assunto 2/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Responder'), { target: { value: 'Vou ver' } });
  fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
  await waitFor(() => expect(responderChamado).toHaveBeenCalledWith(2, 'Vou ver', null, undefined));
  fireEvent.click(screen.getByRole('button', { name: 'Assumir o chamado' }));
  await waitFor(() => expect(atualizarChamado).toHaveBeenCalledWith(2, { responsavelId: 1 }));
  expect(listarChamados).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('link', { name: '← Todos os chamados' })).toHaveAttribute('href', '/admin/chamados');
});

test('chamado inexistente mostra o erro', async () => {
  buscarChamado.mockRejectedValueOnce({ response: { data: { mensagem: 'Chamado não encontrado.' } } });
  montar('/admin/chamados/99');
  expect(await screen.findByText('Chamado não encontrado.')).toBeInTheDocument();
  buscarChamado.mockRejectedValueOnce(new Error('offline'));
  montar('/admin/chamados/98');
  expect(await screen.findByText('Não foi possível abrir o chamado.')).toBeInTheDocument();
});
