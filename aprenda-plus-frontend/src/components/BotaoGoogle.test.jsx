import { act, render, screen, waitFor } from '@testing-library/react';
import BotaoGoogle from './BotaoGoogle';
import { buscarConfigGoogle, carregarScriptGoogle } from '../services/googleService';
import { _reiniciarTema, setTema } from '../utils/tema';

jest.mock('../services/googleService', () => ({
  buscarConfigGoogle: jest.fn(),
  carregarScriptGoogle: jest.fn(),
}));

const googleFalso = () => {
  const id = { initialize: jest.fn(), renderButton: jest.fn() };
  return { accounts: { id } };
};

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  localStorage.clear();
  _reiniciarTema();
});

test('sem o Google configurado no servidor, não mostra nada', async () => {
  buscarConfigGoogle.mockResolvedValue({ ativo: false });
  const { container } = render(<BotaoGoogle onCredencial={jest.fn()} />);
  await waitFor(() => expect(buscarConfigGoogle).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
  expect(carregarScriptGoogle).not.toHaveBeenCalled();
});

test('desenha o botão oficial e entrega a credencial', async () => {
  const google = googleFalso();
  buscarConfigGoogle.mockResolvedValue({ ativo: true, idCliente: 'cli-123' });
  carregarScriptGoogle.mockResolvedValue(google);
  const onCredencial = jest.fn();
  render(<BotaoGoogle onCredencial={onCredencial} texto="signup_with" />);

  await waitFor(() => expect(google.accounts.id.renderButton).toHaveBeenCalled());
  expect(screen.getByText('ou')).toBeInTheDocument();
  const [opcoesIniciais] = google.accounts.id.initialize.mock.calls[0];
  expect(opcoesIniciais.client_id).toBe('cli-123');
  const [, opcoesBotao] = google.accounts.id.renderButton.mock.calls[0];
  expect(opcoesBotao).toMatchObject({ theme: 'outline', text: 'signup_with', locale: 'pt-BR' });

  opcoesIniciais.callback({ credential: 'cred-google' });
  expect(onCredencial).toHaveBeenCalledWith('cred-google');
});

test('no tema escuro usa o botão escuro', async () => {
  const google = googleFalso();
  buscarConfigGoogle.mockResolvedValue({ ativo: true, idCliente: 'cli-123' });
  carregarScriptGoogle.mockResolvedValue(google);
  render(<BotaoGoogle onCredencial={jest.fn()} />);
  await waitFor(() => expect(google.accounts.id.renderButton).toHaveBeenCalled());

  act(() => setTema('escuro'));
  await waitFor(() => expect(google.accounts.id.renderButton).toHaveBeenCalledTimes(2));
  expect(google.accounts.id.renderButton.mock.calls[1][1].theme).toBe('filled_black');
});

test('se o Google não carregar, some e fica só o login normal', async () => {
  buscarConfigGoogle.mockResolvedValue({ ativo: true, idCliente: 'cli-123' });
  carregarScriptGoogle.mockRejectedValue(new Error('offline'));
  const { container } = render(<BotaoGoogle onCredencial={jest.fn()} />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test('biblioteca sem a parte de login não quebra', async () => {
  buscarConfigGoogle.mockResolvedValue({ ativo: true, idCliente: 'cli-123' });
  carregarScriptGoogle.mockResolvedValue({});
  render(<BotaoGoogle onCredencial={jest.fn()} />);
  await waitFor(() => expect(carregarScriptGoogle).toHaveBeenCalled());
  expect(screen.getByTestId('botao-google')).toBeInTheDocument();
});

test('sair da tela antes de a configuração chegar não dá erro', async () => {
  let responder;
  buscarConfigGoogle.mockReturnValue(new Promise((r) => { responder = r; }));
  const { unmount } = render(<BotaoGoogle onCredencial={jest.fn()} />);
  unmount();
  await act(async () => responder({ ativo: true, idCliente: 'x' }));
  expect(carregarScriptGoogle).not.toHaveBeenCalled();
});
