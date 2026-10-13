// Inscrições: coluna "Documento" e revisão do certificado de conclusão
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderizar } from '../../testUtils';
import AdminInscricoes from './AdminInscricoes';
import { listarInscricoes } from '../../services/inscricaoService';
import {
  situacaoDosDocumentos,
  listarDocumentosDoAluno,
  revisarDocumento,
  baixarArquivoDoDocumento,
} from '../../services/documentoService';

jest.mock('../../services/inscricaoService');
jest.mock('../../services/documentoService', () => ({
  ...jest.requireActual('../../services/documentoService'),
  situacaoDosDocumentos: jest.fn(),
  listarDocumentosDoAluno: jest.fn(),
  revisarDocumento: jest.fn(),
  baixarArquivoDoDocumento: jest.fn(),
}));

const inscricoes = [
  { idInscricao: 1, aluno: { idAluno: 7, nomeCompleto: 'Maria Silva' }, turma: { nome: 'Turma A' }, status: 'pendente_pagamento' },
  { idInscricao: 2, aluno: { idAluno: 8, nomeCompleto: 'João Souza' }, turma: { nome: 'Turma B' }, status: 'confirmada' },
  { idInscricao: 3, aluno: { idAluno: 9, nomeCompleto: 'Ana Lima' }, turma: { nome: 'Turma A' }, status: 'pendente_pagamento' },
  { idInscricao: 4, aluno: { idAluno: 10, nomeCompleto: 'Rui Alves' }, turma: { nome: 'Turma C' }, status: 'pendente_pagamento' },
];

const documento = (dados = {}) => ({
  idDocumento: 4,
  idAluno: 7,
  nomeArquivo: 'certificado.pdf',
  contentType: 'application/pdf',
  tamanho: 204800,
  status: 'pendente',
  observacao: null,
  enviadoEm: '2026-10-11T14:50:59',
  ...dados,
});

const linhas = () => screen.getAllByRole('row').slice(1);
const linhaDe = (nome) => screen.getByText(nome).closest('tr');

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:doc');
  URL.revokeObjectURL = jest.fn();
  listarInscricoes.mockResolvedValue({ data: inscricoes });
  situacaoDosDocumentos.mockResolvedValue({ data: { 7: 'pendente', 8: 'aprovado', 9: 'recusado' } });
  listarDocumentosDoAluno.mockResolvedValue({ data: [documento()] });
  baixarArquivoDoDocumento.mockResolvedValue({ data: 'pdf' });
});

test('cada inscrição mostra a situação do documento do aluno', async () => {
  renderizar(<AdminInscricoes />);
  await screen.findByText('Maria Silva');

  await waitFor(() => expect(within(linhaDe('Maria Silva')).getByText(/Em análise/)).toBeInTheDocument());
  expect(within(linhaDe('João Souza')).getByText(/Aprovado/)).toBeInTheDocument();
  expect(within(linhaDe('Ana Lima')).getByText(/Recusado/)).toBeInTheDocument();
  expect(within(linhaDe('Rui Alves')).getByText(/Sem documento/)).toBeInTheDocument();
});

test('filtra pela situação do documento (e já abre filtrado pelo link do sininho)', async () => {
  renderizar(<AdminInscricoes />, { rota: '/admin/inscricoes?documento=pendente' });
  await screen.findByText('Maria Silva');
  await waitFor(() => expect(linhas()).toHaveLength(1));

  fireEvent.change(document.querySelector('select[name="filtroDocumento"]'), { target: { value: 'sem' } });
  expect(linhas()).toHaveLength(1);
  expect(screen.getByText('Rui Alves')).toBeInTheDocument();

  fireEvent.change(document.querySelector('select[name="filtroDocumento"]'), { target: { value: '' } });
  expect(linhas()).toHaveLength(4);
});

test('aprovar o documento avisa que o pagamento já pode ser confirmado', async () => {
  revisarDocumento.mockResolvedValue({ data: documento({ status: 'aprovado' }) });
  renderizar(<AdminInscricoes />);
  await screen.findByText('Maria Silva');

  fireEvent.click(within(linhaDe('Maria Silva')).getByRole('button', { name: /Em análise/ }));
  const janela = await screen.findByRole('dialog', { name: 'Documento de escolaridade' });
  expect(within(janela).getByText('Maria Silva')).toBeInTheDocument();
  expect(listarDocumentosDoAluno).toHaveBeenCalledWith(7);

  fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));
  await waitFor(() => expect(document.querySelector('iframe')).toHaveAttribute('src', 'blob:doc'));
  fireEvent.click(screen.getByRole('button', { name: /Aprovar documento/ }));

  await waitFor(() => expect(revisarDocumento).toHaveBeenCalledWith(4, 'aprovado', null));
  expect(await screen.findByRole('status')).toHaveTextContent('Agora você já pode confirmar o pagamento de Maria Silva.');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(situacaoDosDocumentos).toHaveBeenCalledTimes(2);
});

test('recusar pede o motivo, que vai para o aluno', async () => {
  revisarDocumento.mockResolvedValue({ data: documento({ status: 'recusado', observacao: 'Foto cortada' }) });
  renderizar(<AdminInscricoes />);
  await screen.findByText('Maria Silva');

  fireEvent.click(within(linhaDe('Maria Silva')).getByRole('button', { name: /Em análise/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));
  fireEvent.click(screen.getByRole('button', { name: /Recusar/ }));

  const confirmar = screen.getByRole('button', { name: 'Confirmar recusa' });
  expect(confirmar).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Motivo da recusa/), { target: { value: 'Foto cortada' } });
  fireEvent.click(confirmar);

  await waitFor(() => expect(revisarDocumento).toHaveBeenCalledWith(4, 'recusado', 'Foto cortada'));
  expect(await screen.findByRole('status')).toHaveTextContent('Maria Silva vai receber um e-mail com o motivo.');
});

test('voltar da recusa e erro do servidor ao revisar', async () => {
  revisarDocumento.mockRejectedValueOnce({ response: { data: { mensagem: 'Documento não encontrado.' } } });
  revisarDocumento.mockRejectedValueOnce(new Error('rede'));
  renderizar(<AdminInscricoes />);
  await screen.findByText('Maria Silva');

  fireEvent.click(within(linhaDe('Maria Silva')).getByRole('button', { name: /Em análise/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Analisar' }));

  fireEvent.click(screen.getByRole('button', { name: /Recusar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

  fireEvent.click(screen.getByRole('button', { name: /Aprovar documento/ }));
  expect(await screen.findByText('Documento não encontrado.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Recusar/ }));
  fireEvent.change(screen.getByLabelText(/Motivo da recusa/), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }));
  expect(await screen.findByText('Não foi possível salvar a revisão.')).toBeInTheDocument();
});

test('documento já aprovado ou recusado mostra só a ação contrária', async () => {
  listarDocumentosDoAluno.mockResolvedValue({
    data: [documento({ idDocumento: 6, status: 'recusado', observacao: 'Ilegível' }), documento({ status: 'aprovado', enviadoEm: null })],
  });
  renderizar(<AdminInscricoes />);
  await screen.findByText('Maria Silva');

  fireEvent.click(within(linhaDe('Maria Silva')).getByRole('button', { name: /Em análise/ }));
  expect(await screen.findByText('Motivo: Ilegível')).toBeInTheDocument();
  expect(screen.getByText(/enviado em -/)).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: 'Abrir' })[0]);
  expect(screen.queryByRole('button', { name: /Recusar/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Aprovar documento/ })).toBeInTheDocument();
  // o último "Fechar" é o da janela do arquivo (o primeiro fecha a revisão inteira)
  fireEvent.click(screen.getAllByRole('button', { name: 'Fechar' }).at(-1));
  expect(screen.getByRole('dialog', { name: 'Documento de escolaridade' })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: 'Abrir' })[1]);
  expect(screen.queryByRole('button', { name: /Aprovar documento/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Recusar/ })).toBeInTheDocument();
});

test('aluno sem documento, erro ao carregar e fechar a janela', async () => {
  listarDocumentosDoAluno.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(new Error('x'));
  renderizar(<AdminInscricoes />);
  await screen.findByText('Rui Alves');

  fireEvent.click(within(linhaDe('Rui Alves')).getByRole('button', { name: /Sem documento/ }));
  expect(await screen.findByText('Este aluno ainda não enviou o certificado de conclusão.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(within(linhaDe('Ana Lima')).getByRole('button', { name: /Recusado/ }));
  expect(await screen.findByText('Não foi possível carregar os documentos do aluno.')).toBeInTheDocument();
});

test('se a situação dos documentos não carregar, a lista funciona igual', async () => {
  situacaoDosDocumentos.mockRejectedValue(new Error('x'));
  listarInscricoes.mockResolvedValue({ data: [{ ...inscricoes[0], aluno: null }] });
  renderizar(<AdminInscricoes />);

  const botao = await screen.findByRole('button', { name: /Sem documento/ });
  expect(botao).toBeDisabled();
});
