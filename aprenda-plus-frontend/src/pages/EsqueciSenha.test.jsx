import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderizar } from '../testUtils';
import EsqueciSenha from './EsqueciSenha';
import RedefinirSenha from './RedefinirSenha';
import { pedirNovaSenha, redefinirSenha } from '../services/senhaService';
import { mostrarAviso } from '../services/avisoService';
import api from '../services/api';
import * as senhaService from '../services/senhaService';

jest.mock('../services/api', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('../services/avisoService');

beforeEach(() => jest.clearAllMocks());

describe('service', () => {
  test('rotas de esqueci e redefinir senha', async () => {
    api.post.mockResolvedValue({ data: { ok: true } });
    await expect(senhaService.pedirNovaSenha('a@b.com', 'aluno')).resolves.toEqual({ ok: true });
    expect(api.post).toHaveBeenCalledWith('/auth/esqueci-senha', { email: 'a@b.com', tipo: 'aluno' });
    await senhaService.redefinirSenha('tok', 'segura123');
    expect(api.post).toHaveBeenCalledWith('/auth/redefinir-senha', { token: 'tok', novaSenha: 'segura123' });
  });
});

describe('Esqueci minha senha', () => {
  const pedir = (email) => {
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: 'ENVIAR LINK' }));
  };

  test('aluno pede o link e vê a confirmação', async () => {
    api.post.mockResolvedValue({ data: { mensagem: 'Se este e-mail estiver cadastrado, você vai receber...' } });
    renderizar(<EsqueciSenha />);
    pedir('  lucas@aluno.com ');

    expect(await screen.findByText('📧 Confira o seu e-mail')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/esqueci-senha', { email: 'lucas@aluno.com', tipo: 'aluno' });
    expect(screen.getByText(/Se este e-mail estiver cadastrado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Voltar para o login' })).toHaveAttribute('href', '/login');
  });

  test('funcionário do painel pede como funcionário e volta para o login do painel', async () => {
    api.post.mockResolvedValue({ data: { mensagem: 'ok' } });
    renderizar(<EsqueciSenha painel />);
    expect(screen.getByText('PAINEL ADMIN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute('href', '/admin/login');
    pedir('ana@aprendaplus.com');
    expect(await screen.findByText('📧 Confira o seu e-mail')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/esqueci-senha', { email: 'ana@aprendaplus.com', tipo: 'funcionario' });
  });

  test('erro do servidor', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { mensagem: 'Informe o seu e-mail.' } } })
      .mockRejectedValueOnce(new Error('rede'));
    renderizar(<EsqueciSenha />);
    pedir('x@x.com');
    expect(await screen.findByText('Informe o seu e-mail.')).toBeInTheDocument();
    pedir('x@x.com');
    expect(await screen.findByText('Não foi possível enviar agora. Tente novamente.')).toBeInTheDocument();
  });
});

describe('Criar nova senha', () => {
  const abrir = (painel = false, token = 'abc') =>
    renderizar(<RedefinirSenha painel={painel} />, {
      rota: `/${painel ? 'admin/' : ''}redefinir-senha${token ? `?token=${token}` : ''}`,
      caminho: `/${painel ? 'admin/' : ''}redefinir-senha`,
    });

  const digitar = (senha, confirmar) => {
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: senha } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirmar } });
    fireEvent.click(screen.getByRole('button', { name: 'SALVAR NOVA SENHA' }));
  };

  test('aluno troca a senha e vai para o login', async () => {
    api.post.mockResolvedValue({ data: { mensagem: 'Senha alterada!', tipo: 'aluno' } });
    abrir();
    digitar('segura123', 'segura123');

    await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/login'));
    expect(api.post).toHaveBeenCalledWith('/auth/redefinir-senha', { token: 'abc', novaSenha: 'segura123' });
    expect(mostrarAviso).toHaveBeenCalledWith('Senha alterada!', 'sucesso');
  });

  test('funcionário vai para o login do painel', async () => {
    api.post.mockResolvedValue({ data: { tipo: 'funcionario' } });
    abrir(true);
    expect(screen.getByText('PAINEL ADMIN')).toBeInTheDocument();
    digitar('segura123', 'segura123');
    await screen.findByText('/admin/login');
    expect(mostrarAviso).toHaveBeenCalledWith('Senha alterada!', 'sucesso');
  });

  test('confere o tamanho e se as duas senhas são iguais', () => {
    abrir();
    digitar('123', '123');
    expect(screen.getByText('A nova senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
    digitar('segura123', 'segura12');
    expect(screen.getByText('As senhas digitadas não são iguais.')).toBeInTheDocument();
    expect(screen.getByText('As senhas ainda não são iguais')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'segura123' } });
    expect(screen.getByText('✓ As senhas são iguais')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('link vencido oferece pedir outro', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { mensagem: 'Este link não é mais válido. Peça um novo.' } } })
      .mockRejectedValueOnce(new Error('rede'));
    abrir();
    digitar('segura123', 'segura123');
    expect(await screen.findByText(/Este link não é mais válido/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/esqueci-senha');

    digitar('segura123', 'segura123');
    expect(await screen.findByText('Não foi possível alterar a senha. Tente novamente.')).toBeInTheDocument();
  });

  test('sem o código no endereço', () => {
    abrir(true, '');
    expect(screen.getByText('Este link está incompleto. Peça um novo link de nova senha.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir um novo link' })).toHaveAttribute('href', '/admin/esqueci-senha');
  });
});

// garante que os imports usados pelos componentes existem
test('exporta as funções do service', () => {
  expect(typeof pedirNovaSenha).toBe('function');
  expect(typeof redefinirSenha).toBe('function');
});
