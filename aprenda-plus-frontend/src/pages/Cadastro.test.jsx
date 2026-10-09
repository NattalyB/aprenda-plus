import { screen, fireEvent, waitFor } from '@testing-library/react';
import Cadastro from './Cadastro';
import { renderizar } from '../testUtils';
import { criarAluno } from '../services/alunoService';

jest.mock('../services/alunoService');

const dados = {
  'Nome completo': 'Maria Silva',
  'E-mail': 'maria@teste.com',
  Telefone: '(51) 99999-9999',
  'Data de nascimento': '2000-05-10',
  CPF: '12345678900',
  'Rua/Av': 'Av. Brasil',
  'Número': '100',
  'Complemento (opcional)': 'Apto 2',
  CEP: '92000-000',
  Bairro: 'Centro',
  Cidade: 'Canoas',
  UF: 'RS',
  Senha: 'senha123',
};

const preencherEEnviar = () => {
  Object.entries(dados).forEach(([campo, valor]) => {
    fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });
  });
  fireEvent.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));
};

beforeEach(() => jest.clearAllMocks());

test('cadastro completo envia todos os dados e vai pro login', async () => {
  criarAluno.mockResolvedValue({ data: { idAluno: 1 } });
  renderizar(<Cadastro />, { rota: '/cadastro' });

  preencherEEnviar();

  await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/login'));
  expect(criarAluno).toHaveBeenCalledWith(
    expect.objectContaining({
      nomeCompleto: 'Maria Silva',
      email: 'maria@teste.com',
      cpf: '12345678900',
      complemento: 'Apto 2',
      estado: 'RS',
      senhaHash: 'senha123',
    })
  );
});

test('todos os campos são obrigatórios, menos o complemento', () => {
  renderizar(<Cadastro />);

  Object.keys(dados).forEach((campo) => {
    const elemento = screen.getByLabelText(campo);
    if (campo === 'Complemento (opcional)') {
      expect(elemento).not.toBeRequired();
    } else {
      expect(elemento).toBeRequired();
    }
  });
});

test.each([
  [{ response: { status: 400 } }, 'Verifique os dados preenchidos.'],
  [{ response: { status: 409 } }, 'E-mail ou CPF já cadastrado.'],
  [{ response: { status: 500, data: { message: 'violates unique constraint' } } }, 'E-mail ou CPF já cadastrado.'],
  [new Error('Network Error'), 'Não foi possível concluir o cadastro. Tente novamente.'],
])('erro do servidor mostra a mensagem certa', async (erro, mensagem) => {
  criarAluno.mockRejectedValue(erro);
  renderizar(<Cadastro />, { rota: '/cadastro' });

  preencherEEnviar();

  expect(await screen.findByText(mensagem)).toBeInTheDocument();
  expect(screen.getByTestId('endereco')).toHaveTextContent('/cadastro');
});
