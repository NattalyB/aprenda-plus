import axios from 'axios';
import { buscarEnderecoPorCep, formatarCep, somenteDigitosCep } from './cepService';

jest.mock('axios');

beforeEach(() => jest.clearAllMocks());

describe('formatação do CEP', () => {
  test('deixa só números, no máximo 8', () => {
    expect(somenteDigitosCep('92.035-540xx99')).toBe('92035540');
    expect(somenteDigitosCep(null)).toBe('');
  });

  test('coloca o hífen depois do quinto número', () => {
    expect(formatarCep('92035540')).toBe('92035-540');
    expect(formatarCep('920')).toBe('920');
    expect(formatarCep('92035')).toBe('92035');
    expect(formatarCep('920355')).toBe('92035-5');
  });
});

describe('buscarEnderecoPorCep', () => {
  test('consulta o ViaCEP e devolve o endereço com os nomes dos nossos campos', async () => {
    axios.get.mockResolvedValue({
      data: { logradouro: 'Rua Araçá', bairro: 'Igara', localidade: 'Canoas', uf: 'RS' },
    });

    const endereco = await buscarEnderecoPorCep('92035-540');

    expect(axios.get).toHaveBeenCalledWith('https://viacep.com.br/ws/92035540/json/');
    expect(endereco).toEqual({ rua: 'Rua Araçá', bairro: 'Igara', cidade: 'Canoas', estado: 'RS' });
  });

  test('campos que não vieram ficam vazios', async () => {
    axios.get.mockResolvedValue({ data: { localidade: 'Cidade Pequena', uf: 'RS' } });

    expect(await buscarEnderecoPorCep('95000000')).toEqual({
      rua: '', bairro: '', cidade: 'Cidade Pequena', estado: 'RS',
    });
  });

  test('CEP inexistente devolve null', async () => {
    axios.get.mockResolvedValue({ data: { erro: 'true' } });

    expect(await buscarEnderecoPorCep('00000000')).toBeNull();
  });

  test('resposta vazia devolve null', async () => {
    axios.get.mockResolvedValue({});

    expect(await buscarEnderecoPorCep('00000000')).toBeNull();
  });

  test('CEP incompleto nem chega a consultar', async () => {
    expect(await buscarEnderecoPorCep('9203')).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
