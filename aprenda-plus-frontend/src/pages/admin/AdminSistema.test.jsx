import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminSistema from './AdminSistema';
import { renderizar } from '../../testUtils';
import { listarNiveis, criarNivel, atualizarNivel, deletarNivel } from '../../services/funcionarioService';

jest.mock('../../services/funcionarioService');

const niveis = () => [
  { idNivel: 1, nome: 'Master', master: true, modulos: [] },
  { idNivel: 3, nome: 'Financeiro', master: false, modulos: ['inscricoes', 'matriculas'] },
];

const linha = (nome) => screen.getByDisplayValue(nome).closest('tr');
const linhaMaster = () => screen.getByText('Acesso total').closest('tr');

beforeEach(() => {
  jest.clearAllMocks();
  listarNiveis.mockResolvedValue({ data: niveis() });
  window.confirm = jest.fn(() => true);
});

test('mostra os níveis e os módulos de cada um; o Master fica travado com tudo marcado', async () => {
  renderizar(<AdminSistema />);

  expect(screen.getByText('Carregando níveis...')).toBeInTheDocument();
  await screen.findByDisplayValue('Financeiro');

  const caixasMaster = within(linhaMaster()).getAllByRole('checkbox');
  expect(caixasMaster).toHaveLength(9);
  caixasMaster.forEach((caixa) => {
    expect(caixa).toBeChecked();
    expect(caixa).toBeDisabled();
  });

  expect(screen.getByLabelText('Matrículas para Financeiro')).toBeChecked();
  expect(screen.getByLabelText('Alunos para Financeiro')).not.toBeChecked();
  expect(within(linha('Financeiro')).getByRole('button', { name: 'Salvar' })).toBeDisabled();
});

test('marca um módulo, renomeia e salva', async () => {
  atualizarNivel.mockResolvedValue({});
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.click(screen.getByLabelText('Alunos para Financeiro'));
  fireEvent.click(screen.getByLabelText('Inscrições para Financeiro'));
  fireEvent.change(screen.getByLabelText('Nome do nível Financeiro'), { target: { value: 'Contabilidade' } });
  fireEvent.click(within(linha('Contabilidade')).getByRole('button', { name: 'Salvar' }));

  await waitFor(() =>
    expect(atualizarNivel).toHaveBeenCalledWith(3, { nome: 'Contabilidade', modulos: ['matriculas', 'alunos'] })
  );
  expect(await screen.findByText('Permissões do nível "Contabilidade" salvas.')).toBeInTheDocument();
  expect(listarNiveis).toHaveBeenCalledTimes(2);
});

test('desfazer volta ao que estava salvo', async () => {
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.click(screen.getByLabelText('Alunos para Financeiro'));
  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Desfazer' }));

  expect(screen.getByLabelText('Alunos para Financeiro')).not.toBeChecked();
  expect(within(linha('Financeiro')).getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
});

test('erro ao salvar mostra a mensagem do servidor', async () => {
  atualizarNivel.mockRejectedValue({ response: { data: { mensagem: 'Já existe um nível com o nome "Master".' } } });
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.click(screen.getByLabelText('Alunos para Financeiro'));
  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Salvar' }));

  expect(await screen.findByText('Já existe um nível com o nome "Master".')).toBeInTheDocument();
  expect(within(linha('Financeiro')).getByRole('button', { name: 'Salvar' })).toBeEnabled();
});

test('erro ao salvar sem mensagem usa o texto padrão', async () => {
  atualizarNivel.mockRejectedValue(new Error('offline'));
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.click(screen.getByLabelText('Alunos para Financeiro'));
  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Salvar' }));

  expect(await screen.findByText('Não foi possível salvar o nível.')).toBeInTheDocument();
});

test('cria um nível novo', async () => {
  criarNivel.mockResolvedValue({});
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  expect(screen.getByRole('button', { name: '+ Criar nível' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Novo nível'), { target: { value: ' Secretaria ' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Criar nível' }));

  await waitFor(() => expect(criarNivel).toHaveBeenCalledWith({ nome: ' Secretaria ', modulos: [] }));
  expect(await screen.findByText(/Nível "Secretaria" criado/)).toBeInTheDocument();
  expect(screen.getByLabelText('Novo nível')).toHaveValue('');
});

test('erro ao criar', async () => {
  criarNivel.mockRejectedValueOnce({ response: { data: { mensagem: 'Já existe um nível com o nome "Financeiro".' } } });
  criarNivel.mockRejectedValueOnce(new Error('offline'));
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.change(screen.getByLabelText('Novo nível'), { target: { value: 'financeiro' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Criar nível' }));
  expect(await screen.findByText('Já existe um nível com o nome "Financeiro".')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '+ Criar nível' }));
  expect(await screen.findByText('Não foi possível criar o nível.')).toBeInTheDocument();
});

test('exclui um nível depois de confirmar', async () => {
  deletarNivel.mockResolvedValue({});
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Excluir' }));

  await waitFor(() => expect(deletarNivel).toHaveBeenCalledWith(3));
  expect(await screen.findByText('Nível "Financeiro" excluído.')).toBeInTheDocument();
});

test('não exclui sem confirmar e mostra o motivo quando o servidor recusa', async () => {
  window.confirm = jest.fn(() => false);
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Financeiro');

  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Excluir' }));
  expect(deletarNivel).not.toHaveBeenCalled();

  window.confirm = jest.fn(() => true);
  deletarNivel.mockRejectedValueOnce({ response: { data: { mensagem: 'O nível "Financeiro" está sendo usado por 2 funcionários.' } } });
  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Excluir' }));
  expect(await screen.findByText('O nível "Financeiro" está sendo usado por 2 funcionários.')).toBeInTheDocument();

  deletarNivel.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(within(linha('Financeiro')).getByRole('button', { name: 'Excluir' }));
  expect(await screen.findByText('Não foi possível excluir o nível.')).toBeInTheDocument();
});

test('nível sem lista de módulos começa sem nada marcado', async () => {
  listarNiveis.mockResolvedValue({ data: [{ idNivel: 4, nome: 'Estágio', master: false }] });
  renderizar(<AdminSistema />);
  await screen.findByDisplayValue('Estágio');

  expect(screen.getByLabelText('Alunos para Estágio')).not.toBeChecked();
});

test('erro ao carregar', async () => {
  listarNiveis.mockRejectedValue(new Error('offline'));
  renderizar(<AdminSistema />);

  expect(await screen.findByText('Não foi possível carregar os níveis de acesso.')).toBeInTheDocument();
  expect(screen.queryByText('Carregando níveis...')).not.toBeInTheDocument();
});
