import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AcessoPortalProfessor from './AcessoPortalProfessor';
import { enviarAcessoProfessor } from '../../services/professorService';

jest.mock('../../services/professorService');

beforeEach(() => jest.clearAllMocks());

test('envia o acesso por e-mail e permite copiar o link', async () => {
  const escrever = jest.fn(() => Promise.resolve());
  Object.assign(navigator, { clipboard: { writeText: escrever } });
  enviarAcessoProfessor.mockResolvedValue({ link: 'https://site/#/redefinir-senha?token=abc', emailEnviado: true, email: 'r@x.com' });
  render(<AcessoPortalProfessor idProfessor="3" acessoCriado={false} />);

  expect(screen.getByText('O professor ainda não criou a senha')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enviar acesso por e-mail' }));
  expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  expect(await screen.findByText(/Enviamos para r@x.com/)).toBeInTheDocument();
  expect(enviarAcessoProfessor).toHaveBeenCalledWith('3');
  expect(screen.getByLabelText('Link de acesso')).toHaveValue('https://site/#/redefinir-senha?token=abc');

  fireEvent.focus(screen.getByLabelText('Link de acesso'));
  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
  expect(await screen.findByRole('button', { name: 'Copiado ✓' })).toBeInTheDocument();
  expect(escrever).toHaveBeenCalledWith('https://site/#/redefinir-senha?token=abc');
});

test('sem e-mail configurado, avisa para copiar; e mostra erros', async () => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.reject(new Error('negado'))) } });
  enviarAcessoProfessor
    .mockResolvedValueOnce({ link: 'https://l', emailEnviado: false, email: 'r@x.com' })
    .mockRejectedValueOnce({ response: { data: { mensagem: 'Ative o cadastro do professor antes de enviar o acesso.' } } })
    .mockRejectedValueOnce(new Error('rede'));
  render(<AcessoPortalProfessor idProfessor="3" acessoCriado />);

  expect(screen.getByText(/Senha criada/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar link de acesso' }));
  expect(await screen.findByText(/não está configurado/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Reenviar link de acesso' }));
  expect(await screen.findByText('Ative o cadastro do professor antes de enviar o acesso.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reenviar link de acesso' }));
  expect(await screen.findByText('Não foi possível enviar o acesso.')).toBeInTheDocument();
});

test('navegador sem área de transferência não quebra', async () => {
  Object.assign(navigator, { clipboard: undefined });
  enviarAcessoProfessor.mockResolvedValue({ link: 'https://l', emailEnviado: true, email: 'r@x.com' });
  render(<AcessoPortalProfessor idProfessor="3" acessoCriado={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Enviar acesso por e-mail' }));
  await screen.findByLabelText('Link de acesso');
  fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
  expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
});
