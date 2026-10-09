import { screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { renderizar } from '../testUtils';
import { login, salvarSessao } from '../services/authService';

jest.mock('../services/authService');

const preencherEEnviar = (email = 'maria@teste.com', senha = 'senha123') => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
  fireEvent.click(screen.getByRole('button', { name: 'ENTRAR' }));
};

beforeEach(() => jest.clearAllMocks());

test('login certo salva a sessão e vai pra Home', async () => {
  login.mockResolvedValue({ data: { token: 't', idAluno: 7, nome: 'Maria' } });
  renderizar(<Login />, { rota: '/login' });

  preencherEEnviar();

  await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/$/));
  expect(login).toHaveBeenCalledWith('maria@teste.com', 'senha123');
  expect(salvarSessao).toHaveBeenCalledWith({ token: 't', idAluno: 7, nome: 'Maria' });
});

test('senha errada mostra mensagem e continua na tela de login', async () => {
  login.mockRejectedValue({ response: { status: 401 } });
  renderizar(<Login />, { rota: '/login' });

  preencherEEnviar();

  expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();
  expect(screen.getByTestId('endereco')).toHaveTextContent('/login');
  expect(salvarSessao).not.toHaveBeenCalled();
});

test('servidor fora do ar mostra mensagem genérica', async () => {
  login.mockRejectedValue(new Error('Network Error'));
  renderizar(<Login />, { rota: '/login' });

  preencherEEnviar();

  expect(await screen.findByText('Não foi possível fazer login. Tente novamente.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ENTRAR' })).toBeEnabled();
});

test('tem link para criar conta', () => {
  renderizar(<Login />, { rota: '/login' });
  expect(screen.getByRole('link', { name: 'Cadastre-se' })).toHaveAttribute('href', '/cadastro');
});
