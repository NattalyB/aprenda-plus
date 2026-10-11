import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CampoCep from './CampoCep';
import { buscarEnderecoPorCep } from '../services/cepService';

// Mantém a formatação de verdade e troca só a consulta ao ViaCEP
jest.mock('../services/cepService', () => ({
  ...jest.requireActual('../services/cepService'),
  buscarEnderecoPorCep: jest.fn(),
}));

// Formulário mínimo, igual ao jeito que os formulários do sistema usam o campo
function Formulario({ inicial = {} }) {
  const [form, setForm] = useState({ cep: '', rua: '', bairro: '', cidade: '', estado: '', ...inicial });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <form>
      <CampoCep
        value={form.cep}
        onChange={handleChange}
        onEnderecoEncontrado={(endereco) => setForm((atual) => ({ ...atual, ...endereco }))}
      />
      <input aria-label="Rua" name="rua" value={form.rua} onChange={handleChange} />
      <input aria-label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} />
      <input aria-label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} />
      <input aria-label="UF" name="estado" value={form.estado} onChange={handleChange} />
    </form>
  );
}

const campoCep = () => screen.getByPlaceholderText('00000-000');
const digitar = (valor) => fireEvent.change(campoCep(), { target: { value: valor } });

beforeEach(() => jest.clearAllMocks());

test('ao completar o CEP, preenche rua, bairro, cidade e UF', async () => {
  buscarEnderecoPorCep.mockResolvedValue({ rua: 'Rua Araçá', bairro: 'Igara', cidade: 'Canoas', estado: 'RS' });
  render(<Formulario />);

  digitar('92035540');

  expect(campoCep()).toHaveValue('92035-540');
  expect(screen.getByText('Buscando endereço...')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua Araçá'));
  expect(screen.getByLabelText('Bairro')).toHaveValue('Igara');
  expect(screen.getByLabelText('Cidade')).toHaveValue('Canoas');
  expect(screen.getByLabelText('UF')).toHaveValue('RS');
  expect(screen.getByText(/Endereço preenchido pelo CEP/)).toBeInTheDocument();
});

test('os dados preenchidos continuam editáveis', async () => {
  buscarEnderecoPorCep.mockResolvedValue({ rua: 'Rua Araçá', bairro: 'Igara', cidade: 'Canoas', estado: 'RS' });
  render(<Formulario />);

  digitar('92035-540');
  await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua Araçá'));

  fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua Araçá, fundos' } });
  expect(screen.getByLabelText('Rua')).toHaveValue('Rua Araçá, fundos');
});

test('não apaga o que já foi digitado quando o CEP vem sem rua e bairro', async () => {
  buscarEnderecoPorCep.mockResolvedValue({ rua: '', bairro: '', cidade: 'Cidade Pequena', estado: 'RS' });
  render(<Formulario inicial={{ rua: 'Rua Principal', bairro: 'Centro' }} />);

  digitar('95000000');

  await waitFor(() => expect(screen.getByLabelText('Cidade')).toHaveValue('Cidade Pequena'));
  expect(screen.getByLabelText('Rua')).toHaveValue('Rua Principal');
  expect(screen.getByLabelText('Bairro')).toHaveValue('Centro');
});

test('CEP não encontrado avisa para preencher manualmente', async () => {
  buscarEnderecoPorCep.mockResolvedValue(null);
  render(<Formulario />);

  digitar('00000000');

  expect(await screen.findByText('CEP não encontrado. Preencha o endereço manualmente.')).toBeInTheDocument();
});

test('se o serviço de CEP estiver fora do ar, avisa e deixa preencher manualmente', async () => {
  buscarEnderecoPorCep.mockRejectedValue(new Error('Network Error'));
  render(<Formulario />);

  digitar('92035540');

  expect(await screen.findByText(/Não foi possível buscar o CEP agora/)).toBeInTheDocument();
});

test('CEP incompleto não busca e apaga o aviso anterior', async () => {
  buscarEnderecoPorCep.mockResolvedValue(null);
  render(<Formulario />);

  digitar('00000000');
  await screen.findByText(/CEP não encontrado/);

  digitar('0000');

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(buscarEnderecoPorCep).toHaveBeenCalledTimes(1);
});

test('o mesmo CEP não é buscado duas vezes seguidas', async () => {
  buscarEnderecoPorCep.mockResolvedValue({ rua: 'Rua A', bairro: '', cidade: 'Canoas', estado: 'RS' });
  render(<Formulario />);

  digitar('92035540');
  await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua A'));
  digitar('92035-540');

  expect(buscarEnderecoPorCep).toHaveBeenCalledTimes(1);
});

test('se o usuário trocar de CEP antes da resposta, a resposta antiga é ignorada', async () => {
  let responderPrimeiro;
  buscarEnderecoPorCep
    .mockImplementationOnce(() => new Promise((resolve) => { responderPrimeiro = resolve; }))
    .mockResolvedValueOnce({ rua: 'Rua Nova', bairro: 'Bairro Novo', cidade: 'Porto Alegre', estado: 'RS' });
  render(<Formulario />);

  digitar('11111111');
  digitar('22222222');
  await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua Nova'));

  responderPrimeiro({ rua: 'Rua Velha', bairro: 'X', cidade: 'Y', estado: 'SP' });
  await new Promise((r) => setTimeout(r, 0));

  expect(screen.getByLabelText('Rua')).toHaveValue('Rua Nova');
  expect(screen.getByLabelText('UF')).toHaveValue('RS');
});

test('erro de uma busca antiga não aparece depois de trocar o CEP', async () => {
  let falharPrimeiro;
  buscarEnderecoPorCep
    .mockImplementationOnce(() => new Promise((_, reject) => { falharPrimeiro = reject; }))
    .mockResolvedValueOnce({ rua: 'Rua Nova', bairro: '', cidade: 'Canoas', estado: 'RS' });
  render(<Formulario />);

  digitar('11111111');
  digitar('22222222');
  await waitFor(() => expect(screen.getByLabelText('Rua')).toHaveValue('Rua Nova'));

  falharPrimeiro(new Error('timeout'));
  await new Promise((r) => setTimeout(r, 0));

  expect(screen.queryByText(/Não foi possível buscar o CEP/)).not.toBeInTheDocument();
});
