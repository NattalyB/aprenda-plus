import { screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLogin from './AdminLogin';
import { renderizar } from '../../testUtils';
import { loginFuncionario, salvarSessaoAdmin } from '../../services/authAdminService';

jest.mock('../../services/authAdminService');

const preencherEEnviar = () => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@teste.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'admin123' } });
  fireEvent.click(screen.getByRole('button', { name: 'ENTRAR' }));
};

beforeEach(() => jest.clearAllMocks());

test('login certo salva a sessão e abre o cadastro de alunos', async () => {
  const resposta = { token: 't', idFuncionario: 1, nome: 'Admin', cargo: 'administrativo' };
  loginFuncionario.mockResolvedValue({ data: resposta });
  renderizar(<AdminLogin />, { rota: '/admin/login' });

  preencherEEnviar();

  await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/admin/alunos'));
  expect(loginFuncionario).toHaveBeenCalledWith('admin@teste.com', 'admin123');
  expect(salvarSessaoAdmin).toHaveBeenCalledWith(resposta);
});

test('senha errada mostra mensagem', async () => {
  loginFuncionario.mockRejectedValue({ response: { status: 401 } });
  renderizar(<AdminLogin />, { rota: '/admin/login' });

  preencherEEnviar();

  expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();
  expect(salvarSessaoAdmin).not.toHaveBeenCalled();
});

test('outros erros mostram mensagem genérica', async () => {
  loginFuncionario.mockRejectedValue(new Error('offline'));
  renderizar(<AdminLogin />, { rota: '/admin/login' });

  preencherEEnviar();

  expect(await screen.findByText('Não foi possível fazer login. Tente novamente.')).toBeInTheDocument();
});
