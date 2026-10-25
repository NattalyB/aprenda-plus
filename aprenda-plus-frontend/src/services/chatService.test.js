import api from './api';
import { enviarPergunta } from './chatService';

jest.mock('./api', () => ({ __esModule: true, default: { post: jest.fn() } }));

test('envia a pergunta com o histórico e devolve a resposta', async () => {
  api.post.mockResolvedValue({ data: { resposta: 'Oi!', cursos: [], origem: 'ia' } });

  await expect(enviarPergunta('oi', [{ autor: 'aluno', texto: 'olá' }])).resolves.toEqual({
    resposta: 'Oi!',
    cursos: [],
    origem: 'ia',
  });
  expect(api.post).toHaveBeenCalledWith('/chat', { mensagem: 'oi', historico: [{ autor: 'aluno', texto: 'olá' }] });

  await enviarPergunta('tudo bem?');
  expect(api.post).toHaveBeenLastCalledWith('/chat', { mensagem: 'tudo bem?', historico: [] });
});
