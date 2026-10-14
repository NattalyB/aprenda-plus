import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MeuDocumento from './MeuDocumento';
import { listarMeusDocumentos, enviarMeuDocumento, baixarArquivoDoDocumento } from '../services/documentoService';
import { mostrarAviso } from '../services/avisoService';

jest.mock('../services/documentoService', () => ({
  ...jest.requireActual('../services/documentoService'),
  listarMeusDocumentos: jest.fn(),
  enviarMeuDocumento: jest.fn(),
  baixarArquivoDoDocumento: jest.fn(),
}));
jest.mock('../services/avisoService');

const documento = (dados = {}) => ({
  idDocumento: 4,
  idAluno: 7,
  nomeArquivo: 'certificado.pdf',
  contentType: 'application/pdf',
  tamanho: 2048,
  status: 'pendente',
  observacao: null,
  enviadoEm: '2026-10-11T14:50:59',
  ...dados,
});

const pdf = () => new File(['%PDF-1.4'], 'novo.pdf', { type: 'application/pdf' });
const anexar = (arquivo) =>
  fireEvent.change(screen.getByLabelText(/Novo certificado/), { target: { files: [arquivo] } });

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:documento');
  URL.revokeObjectURL = jest.fn();
});

test('sem documento, pede o envio do certificado', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [] });
  render(<MeuDocumento />);

  expect(await screen.findByText(/envie o certificado \(ou histórico\)/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar documento' })).toBeInTheDocument();
});

test('documento em análise mostra o status e explica o próximo passo', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [documento()] });
  render(<MeuDocumento />);

  expect(await screen.findByText(/Em análise/)).toBeInTheDocument();
  expect(screen.getByText(/você recebe um e-mail/)).toBeInTheDocument();
  expect(screen.getByText(/enviado em 11\/10\/2026/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enviar documento' })).not.toBeInTheDocument();
});

test('aprovado vale mais que um envio recusado mais novo', async () => {
  listarMeusDocumentos.mockResolvedValue({
    data: [documento({ idDocumento: 5, status: 'recusado', observacao: 'Ilegível' }), documento({ status: 'aprovado' })],
  });
  render(<MeuDocumento />);

  expect(await screen.findByText(/Aprovado/)).toBeInTheDocument();
  expect(screen.queryByText('Ilegível')).not.toBeInTheDocument();
  expect(screen.queryByText('Enviar outro arquivo')).not.toBeInTheDocument();
});

test('recusado mostra o motivo e permite mandar outro arquivo', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [documento({ status: 'recusado', observacao: 'Foto ilegível' })] });
  enviarMeuDocumento.mockResolvedValue({ data: documento({ idDocumento: 9, nomeArquivo: 'novo.pdf' }) });
  render(<MeuDocumento />);

  expect(await screen.findByText('Foto ilegível')).toBeInTheDocument();
  anexar(pdf());
  fireEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));

  await waitFor(() => expect(screen.getByText(/Em análise/)).toBeInTheDocument());
  expect(enviarMeuDocumento).toHaveBeenCalledWith(expect.objectContaining({ name: 'novo.pdf' }));
  expect(mostrarAviso).toHaveBeenCalledWith(expect.stringContaining('Documento enviado'), 'sucesso');
  expect(screen.getByText('novo.pdf')).toBeInTheDocument();
});

test('confere o arquivo antes de enviar', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [] });
  render(<MeuDocumento />);

  fireEvent.click(await screen.findByRole('button', { name: 'Enviar documento' }));
  expect(screen.getByText('Anexe o certificado de conclusão (PDF, JPG ou PNG).')).toBeInTheDocument();
  expect(enviarMeuDocumento).not.toHaveBeenCalled();
});

test('mostra a mensagem do servidor quando o envio falha', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [] });
  enviarMeuDocumento.mockRejectedValueOnce({ response: { data: { mensagem: 'Envie o documento em PDF, JPG ou PNG.' } } });
  enviarMeuDocumento.mockRejectedValueOnce(new Error('rede'));
  render(<MeuDocumento />);

  await screen.findByRole('button', { name: 'Enviar documento' });
  anexar(pdf());
  fireEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));
  expect(await screen.findByText('Envie o documento em PDF, JPG ou PNG.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));
  expect(await screen.findByText('Não foi possível enviar o documento.')).toBeInTheDocument();
});

test('em análise, dá pra trocar o arquivo ou desistir', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [documento()] });
  render(<MeuDocumento />);

  fireEvent.click(await screen.findByText('Enviar outro arquivo'));
  expect(screen.getByLabelText(/Novo certificado/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByLabelText(/Novo certificado/)).not.toBeInTheDocument();
});

test('abre o arquivo enviado numa janela e fecha com Esc', async () => {
  listarMeusDocumentos.mockResolvedValue({ data: [documento()] });
  baixarArquivoDoDocumento.mockResolvedValue({ data: 'conteudo' });
  render(<MeuDocumento />);

  fireEvent.click(await screen.findByText('Ver arquivo'));
  await waitFor(() => expect(document.querySelector('iframe')).toHaveAttribute('src', 'blob:documento'));
  expect(screen.getByRole('link', { name: 'Baixar' })).toHaveAttribute('download', 'certificado.pdf');
  expect(baixarArquivoDoDocumento).toHaveBeenCalledWith(4);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:documento');
});

test('foto aparece como imagem; erro ao abrir mostra aviso', async () => {
  listarMeusDocumentos.mockResolvedValue({
    data: [documento({ nomeArquivo: 'foto.jpg', contentType: 'image/jpeg' })],
  });
  baixarArquivoDoDocumento.mockResolvedValueOnce({ data: 'img' }).mockRejectedValueOnce(new Error('x'));
  render(<MeuDocumento />);

  fireEvent.click(await screen.findByText('Ver arquivo'));
  expect(await screen.findByAltText('Documento enviado: foto.jpg')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));

  fireEvent.click(screen.getByText('Ver arquivo'));
  expect(await screen.findByText('Não foi possível abrir o documento.')).toBeInTheDocument();
});

test('se a consulta falhar, o cartão simplesmente não aparece', async () => {
  listarMeusDocumentos.mockRejectedValue(new Error('rede'));
  const { container } = render(<MeuDocumento />);
  await waitFor(() => expect(listarMeusDocumentos).toHaveBeenCalled());
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

describe('lembrete no carrinho', () => {
  test('quem nunca enviou vê o aviso e já pode mandar o arquivo', async () => {
    listarMeusDocumentos.mockResolvedValue({ data: [] });
    enviarMeuDocumento.mockResolvedValue({ data: documento({ nomeArquivo: 'novo.pdf' }) });
    render(<MeuDocumento lembrete />);

    expect(await screen.findByText('Falta o seu certificado de conclusão do ensino médio.')).toBeInTheDocument();
    anexar(pdf());
    fireEvent.click(screen.getByRole('button', { name: 'Enviar documento' }));
    // Depois de enviar, o cartão continua na tela mostrando que está em análise
    expect(await screen.findByText(/Em análise/)).toBeInTheDocument();
  });

  test('quem foi recusado também vê o aviso', async () => {
    listarMeusDocumentos.mockResolvedValue({ data: [documento({ status: 'recusado', observacao: 'Ilegível' })] });
    render(<MeuDocumento lembrete />);
    expect(await screen.findByText('Ilegível')).toBeInTheDocument();
  });

  test.each(['pendente', 'aprovado'])('com documento %s, não aparece nada', async (status) => {
    listarMeusDocumentos.mockResolvedValue({ data: [documento({ status })] });
    const { container } = render(<MeuDocumento lembrete />);
    await waitFor(() => expect(listarMeusDocumentos).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
