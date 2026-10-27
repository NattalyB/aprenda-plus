import { screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { renderizar } from '../testUtils';
import { login, salvarSessao } from '../services/authService';

import { loginProfessor, salvarSessaoProfessor } from '../services/docenteService';

jest.mock('../services/authService');
jest.mock('../services/docenteService');

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

test('conta bloqueada mostra a mensagem do servidor e não entra', async () => {
  login.mockRejectedValue({
    response: { status: 403, data: { erro: 'Sua conta está bloqueada. Entre em contato com o suporte.' } },
  });
  renderizar(<Login />, { rota: '/login' });

  preencherEEnviar();

  expect(await screen.findByText('Sua conta está bloqueada. Entre em contato com o suporte.')).toBeInTheDocument();
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

test('tem o link de esqueci minha senha e o olho na senha', () => {
  renderizar(<Login />, { rota: '/login' });
  expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha');
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
});

describe('Sou professor', () => {
  test('troca de aba e o professor entra no portal', async () => {
    loginProfessor.mockResolvedValue({ token: 'tp', idProfessor: 3, nome: 'Roberto' });
    renderizar(<Login />, { rota: '/login' });

    expect(screen.getByRole('tab', { name: '🎓 Sou aluno' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: '👩‍🏫 Sou professor' }));
    expect(screen.getByRole('heading', { name: 'Portal do Professor' })).toBeInTheDocument();
    expect(screen.getByText(/Peça à secretaria/)).toBeInTheDocument();
    expect(screen.queryByText('Cadastre-se')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha?perfil=professor');

    preencherEEnviar('prof@x.com', 'prof123');
    await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/professor'));
    expect(loginProfessor).toHaveBeenCalledWith('prof@x.com', 'prof123');
    expect(salvarSessaoProfessor).toHaveBeenCalledWith({ token: 'tp', idProfessor: 3, nome: 'Roberto' });
    expect(login).not.toHaveBeenCalled();
  });

  test('abre direto na aba de professor e mostra o motivo do servidor', async () => {
    loginProfessor
      .mockRejectedValueOnce({ response: { status: 401, data: { erro: 'Você ainda não criou sua senha.' } } })
      .mockRejectedValueOnce({ response: { status: 401, data: { erro: 'E-mail ou senha inválidos' } } });
    renderizar(<Login />, { rota: '/login?perfil=professor', caminho: '/login' });

    expect(screen.getByRole('tab', { name: '👩‍🏫 Sou professor' })).toHaveAttribute('aria-selected', 'true');
    preencherEEnviar('prof@x.com', 'x');
    expect(await screen.findByText('Você ainda não criou sua senha.')).toBeInTheDocument();
    preencherEEnviar('prof@x.com', 'y');
    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '🎓 Sou aluno' }));
    expect(screen.queryByText('E-mail ou senha inválidos.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });
});
