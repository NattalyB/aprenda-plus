import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConversaChamado from './ConversaChamado';

jest.mock('../VisualizarDocumento', () => ({ documento, carregar, onFechar }) => (
  <div role="dialog" aria-label="anexo">
    {documento.nomeArquivo} ({documento.contentType})
    <button type="button" onClick={() => carregar(documento.idDocumento)}>carregar</button>
    <button type="button" onClick={onFechar}>fechar anexo</button>
  </div>
));

const chamado = (dados = {}) => ({
  idChamado: 11,
  assunto: 'Vídeo não carrega',
  categoria: 'erro',
  prioridade: 'alta',
  status: 'em_atendimento',
  tela: 'Portal do Professor · Turma',
  tipoSolicitante: 'professor',
  nomeSolicitante: 'Patrícia',
  emailSolicitante: 'p@x.com',
  responsavelId: null,
  responsavelNome: null,
  criadoEm: '2026-11-07T14:10:00',
  resolvidoEm: null,
  mensagens: [
    { idMensagem: 1, autorTipo: 'solicitante', autorNome: 'Patrícia', texto: 'Fica preto', anexoNome: 'print.png', anexoTipo: 'image/png', anexoTamanho: 2048, criadoEm: '2026-11-07T14:10:00' },
    { idMensagem: 2, autorTipo: 'suporte', autorNome: 'Suporte', texto: 'Já vamos ver', criadoEm: '2026-11-07T14:40:00' },
  ],
  ...dados,
});

const acoes = () => ({
  escrever: jest.fn(() => Promise.resolve(chamado())),
  fechar: jest.fn(() => Promise.resolve(chamado({ status: 'fechado' }))),
  atualizar: jest.fn(() => Promise.resolve(chamado())),
  baixarAnexo: jest.fn(() => Promise.resolve({ data: 'x' })),
});

test('quem abriu vê a conversa, abre o anexo, responde e fecha', async () => {
  const a = acoes();
  const onAtualizado = jest.fn();
  render(<ConversaChamado chamado={chamado()} modo="solicitante" acoes={a} onAtualizado={onAtualizado} />);

  expect(screen.getByRole('heading', { name: /#11 Vídeo não carrega/ })).toBeInTheDocument();
  expect(screen.getByText('Em atendimento', { selector: 'span' })).toBeInTheDocument();
  expect(screen.queryByText('Aberto por')).not.toBeInTheDocument();      // só o suporte vê quem abriu
  expect(screen.getByText('Ainda ninguém')).toBeInTheDocument();
  const conversa = screen.getByRole('list', { name: 'Conversa do chamado' });
  expect(within(conversa).getByText(/abriu o chamado/)).toBeInTheDocument();
  expect(within(conversa).getByText('🎧 Suporte (suporte)')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /print.png \(2 KB\)/ }));
  expect(screen.getByRole('dialog', { name: 'anexo' })).toHaveTextContent('print.png (image/png)');
  fireEvent.click(screen.getByRole('button', { name: 'carregar' }));
  expect(a.baixarAnexo).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByRole('button', { name: 'fechar anexo' }));

  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Escreva a mensagem.');
  fireEvent.change(screen.getByLabelText('Escrever no chamado'), { target: { value: 'Ainda não funciona' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(await screen.findByText('Mensagem enviada.')).toBeInTheDocument();
  expect(a.escrever).toHaveBeenCalledWith('Ainda não funciona', null, undefined);
  expect(screen.getByLabelText('Escrever no chamado')).toHaveValue('');
  expect(onAtualizado).toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /Problema resolvido, fechar chamado/ }));
  expect(await screen.findByText('Chamado fechado. Obrigado!')).toBeInTheDocument();
});

test('chamado fechado não aceita mensagem de quem abriu', () => {
  render(<ConversaChamado chamado={chamado({ status: 'fechado', resolvidoEm: '2026-11-08T10:00:00' })} modo="solicitante"
    acoes={acoes()} onAtualizado={jest.fn()} />);
  expect(screen.getByText(/Este chamado foi fechado/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Escrever no chamado')).not.toBeInTheDocument();
  expect(screen.getByText('Resolvido em')).toBeInTheDocument();
});

test('o suporte responde, resolve, muda situação e prioridade e assume o chamado', async () => {
  const a = acoes();
  render(<ConversaChamado chamado={chamado()} modo="suporte" meuId={1} acoes={a} onAtualizado={jest.fn()} />);

  expect(screen.getByText(/Patrícia \(professor\)/)).toBeInTheDocument();
  expect(screen.getByText(/p@x.com/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Responder'), { target: { value: 'Corrigido' } });
  fireEvent.click(screen.getByRole('button', { name: 'Responder e marcar como resolvido' }));
  expect(await screen.findByText('Resposta enviada e chamado marcado como resolvido.')).toBeInTheDocument();
  expect(a.escrever).toHaveBeenCalledWith('Corrigido', null, 'resolvido');

  fireEvent.change(screen.getByLabelText('Situação'), { target: { value: 'fechado' } });
  await waitFor(() => expect(a.atualizar).toHaveBeenCalledWith({ status: 'fechado' }));
  fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'urgente' } });
  await waitFor(() => expect(a.atualizar).toHaveBeenCalledWith({ prioridade: 'urgente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Assumir o chamado' }));
  await waitFor(() => expect(a.atualizar).toHaveBeenCalledWith({ responsavelId: 1 }));
  expect(await screen.findByText('Agora você é o responsável por este chamado.')).toBeInTheDocument();
});

test('o responsável pode deixar o chamado; erro do servidor aparece', async () => {
  const a = acoes();
  a.atualizar.mockRejectedValueOnce({ response: { data: { mensagem: 'Situação inválida.' } } });
  a.escrever.mockRejectedValueOnce(new Error('offline'));
  render(<ConversaChamado chamado={chamado({ responsavelId: 1, responsavelNome: 'Suporte', status: 'resolvido' })}
    modo="suporte" meuId={1} acoes={a} onAtualizado={jest.fn()} />);

  expect(screen.queryByRole('button', { name: 'Responder e marcar como resolvido' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Deixar de ser o responsável' }));
  expect(await screen.findByText('Situação inválida.')).toBeInTheDocument();
  expect(a.atualizar).toHaveBeenCalledWith({ responsavelId: 0 });

  fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Escreva a resposta.');
  fireEvent.change(screen.getByLabelText('Responder'), { target: { value: 'Oi' } });
  fireEvent.change(screen.getByLabelText(/Anexar print ou PDF/), {
    target: { files: [new File(['x'], 'grande.pdf', { type: 'application/pdf' })] },
  });
  Object.defineProperty(screen.getByLabelText(/Anexar print ou PDF/).files[0], 'size', { value: 6 * 1024 * 1024 });
  fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
  expect(screen.getByRole('alert')).toHaveTextContent('O anexo pode ter no máximo 5 MB.');
  fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
  fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
  expect(await screen.findByText('Não foi possível concluir. Tente de novo.')).toBeInTheDocument();
});
