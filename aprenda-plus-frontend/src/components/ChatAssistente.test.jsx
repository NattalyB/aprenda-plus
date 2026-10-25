import { screen, fireEvent, waitFor, within, render } from '@testing-library/react';
import ChatAssistente, { TextoFormatado } from './ChatAssistente';
import { renderizar } from '../testUtils';
import { enviarPergunta } from '../services/chatService';
import { listarCursos } from '../services/cursoService';

jest.mock('../services/chatService');
jest.mock('../services/cursoService');

const cursos = [
  { idCurso: 1, nome: 'Engenharia de Software', categoria: 'superior', valor: 48000, numeroParcelas: 71 },
  { idCurso: 2, nome: 'Ciência de Dados', categoria: 'superior', valor: 12000, numeroParcelas: 28 },
];

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir o assistente virtual' }));
const escrever = (texto) => {
  fireEvent.change(screen.getByLabelText('Sua mensagem'), { target: { value: texto } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  listarCursos.mockResolvedValue({ data: cursos });
});

test('abre, mostra as boas-vindas e as sugestões, e fecha', async () => {
  renderizar(<ChatAssistente />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Dúvidas? Fale comigo')).toBeInTheDocument();

  abrir();
  const painel = screen.getByRole('dialog', { name: 'Assistente virtual' });
  expect(within(painel).getByText(/Sou o assistente virtual do AprendaPlus/)).toBeInTheDocument();
  expect(within(painel).getByRole('button', { name: 'Quais cursos são EAD?' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nova conversa' })).not.toBeInTheDocument();
  await waitFor(() => expect(listarCursos).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole('button', { name: 'Fechar o assistente' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  abrir();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Minimizar o assistente' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(listarCursos).toHaveBeenCalledTimes(1);
});

test('envia a pergunta, mostra a resposta com botões dos cursos e abre o curso', async () => {
  let responder;
  enviarPergunta.mockReturnValueOnce(new Promise((r) => (responder = r)));
  renderizar(<ChatAssistente />);
  abrir();
  await waitFor(() => expect(listarCursos).toHaveBeenCalled());

  escrever('  gosto de dados  ');
  expect(screen.getByText('gosto de dados')).toBeInTheDocument();
  expect(screen.getByLabelText('O assistente está digitando')).toBeInTheDocument();
  expect(screen.getByLabelText('Sua mensagem')).toBeDisabled();
  expect(enviarPergunta).toHaveBeenCalledWith('gosto de dados', []);

  responder({ resposta: 'Recomendo **Ciência de Dados**:\n- 100% EAD\n- 28 parcelas', cursos: [2, 99], origem: 'ia' });
  expect(await screen.findByText('Ciência de Dados', { selector: 'strong' })).toBeInTheDocument();
  expect(screen.getByText('100% EAD').tagName).toBe('LI');
  expect(screen.queryByLabelText('O assistente está digitando')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Quais cursos são EAD?' })).not.toBeInTheDocument();

  // curso 99 não existe: não vira botão
  fireEvent.click(screen.getByRole('button', { name: '📘 Ver Ciência de Dados' }));
  expect(await screen.findByRole('button', { name: '×' })).toBeInTheDocument();
  expect(screen.getAllByText('Ciência de Dados').length).toBeGreaterThan(1);
});

test('manda o histórico (sem boas-vindas e sem erros) e usa as sugestões', async () => {
  enviarPergunta
    .mockResolvedValueOnce({ resposta: 'Temos Ciência de Dados.', cursos: [2] })
    .mockRejectedValueOnce(new Error('rede'))
    .mockResolvedValueOnce({ resposta: 'Custa R$ 12.000,00.' });
  renderizar(<ChatAssistente />);
  abrir();

  fireEvent.click(screen.getByRole('button', { name: 'Quais cursos são EAD?' }));
  expect(await screen.findByText('Temos Ciência de Dados.')).toBeInTheDocument();
  expect(enviarPergunta).toHaveBeenLastCalledWith('Quais cursos são EAD?', []);

  escrever('e o preço?');
  expect(await screen.findByText(/Não consegui responder agora/)).toBeInTheDocument();

  escrever('quanto custa?');
  expect(await screen.findByText('Custa R$ 12.000,00.')).toBeInTheDocument();
  expect(enviarPergunta).toHaveBeenLastCalledWith('quanto custa?', [
    { autor: 'aluno', texto: 'Quais cursos são EAD?' },
    { autor: 'assistente', texto: 'Temos Ciência de Dados.' },
    { autor: 'aluno', texto: 'e o preço?' },
  ]);
});

test('mostra a mensagem do servidor quando passa do limite e não envia texto vazio', async () => {
  enviarPergunta.mockRejectedValueOnce({ response: { data: { mensagem: 'Espere um minutinho.' } } });
  renderizar(<ChatAssistente />);
  abrir();

  expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText('Sua mensagem').closest('form'));
  expect(enviarPergunta).not.toHaveBeenCalled();

  escrever('oi');
  expect(await screen.findByText('Espere um minutinho.')).toBeInTheDocument();
});

test('a conversa continua ao trocar de página e pode recomeçar', async () => {
  enviarPergunta.mockResolvedValueOnce({ resposta: 'Olá! Como posso ajudar?', cursos: [] });
  const { unmount } = renderizar(<ChatAssistente />);
  abrir();
  escrever('oi');
  expect(await screen.findByText('Olá! Como posso ajudar?')).toBeInTheDocument();
  unmount();

  renderizar(<ChatAssistente />);
  abrir();
  expect(screen.getByText('Olá! Como posso ajudar?')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Nova conversa' }));
  expect(screen.queryByText('Olá! Como posso ajudar?')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Me ajuda a escolher um curso' })).toBeInTheDocument();
});

test('funciona sem armazenamento, com conversa salva estragada e sem a lista de cursos', async () => {
  sessionStorage.setItem('conversaAssistente', '{quebrado');
  listarCursos.mockRejectedValueOnce(new Error('x'));
  enviarPergunta.mockResolvedValueOnce({ resposta: 'Veja este curso.', cursos: [1] });
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('cheio');
  });

  renderizar(<ChatAssistente />);
  abrir();
  expect(screen.getByText(/Sou o assistente virtual/)).toBeInTheDocument();
  escrever('oi');
  expect(await screen.findByText('Veja este curso.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /📘 Ver/ })).not.toBeInTheDocument();
  setItem.mockRestore();
});

test('conversa salva vazia volta para as boas-vindas', () => {
  sessionStorage.setItem('conversaAssistente', '[]');
  renderizar(<ChatAssistente />);
  abrir();
  expect(screen.getByText(/Sou o assistente virtual/)).toBeInTheDocument();
});

test('não aparece na sala de aula', () => {
  renderizar(<ChatAssistente />, { rota: '/sala/3' });
  expect(screen.queryByRole('button', { name: 'Abrir o assistente virtual' })).not.toBeInTheDocument();
});

test('TextoFormatado: parágrafos, listas e negrito sem HTML', () => {
  const { container } = render(
    <div>
      <TextoFormatado texto={'Linha **forte** e <b>não html</b>\n\n* um\n• dois\nfim ****'} />
      <TextoFormatado texto={null} />
    </div>
  );
  expect(container.querySelectorAll('p')).toHaveLength(2);
  expect(container.querySelectorAll('li')).toHaveLength(2);
  expect(screen.getByText('forte').tagName).toBe('STRONG');
  expect(container.querySelector('b')).toBeNull();
  expect(screen.getByText(/<b>não html<\/b>/)).toBeInTheDocument();
});
