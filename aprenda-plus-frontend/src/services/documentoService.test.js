import api from './api';
import * as documentoService from './documentoService';
import { cadastrarAlunoComDocumento } from './alunoService';

jest.mock('./api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

beforeEach(() => jest.clearAllMocks());

test('rotas do aluno e do painel', () => {
  documentoService.listarMeusDocumentos();
  expect(api.get).toHaveBeenCalledWith('/documentos/meus');

  documentoService.listarDocumentosDoAluno(7);
  expect(api.get).toHaveBeenCalledWith('/documentos/aluno/7');

  documentoService.situacaoDosDocumentos();
  expect(api.get).toHaveBeenCalledWith('/documentos/situacao');

  documentoService.revisarDocumento(4, 'recusado', 'Ilegível');
  expect(api.put).toHaveBeenCalledWith('/documentos/4/revisao', { status: 'recusado', observacao: 'Ilegível' });

  documentoService.baixarArquivoDoDocumento(4);
  expect(api.get).toHaveBeenCalledWith('/documentos/4/arquivo', { responseType: 'blob' });
});

test('envio do aluno vai como formulário com o arquivo', () => {
  const arquivo = new File(['%PDF'], 'c.pdf');
  documentoService.enviarMeuDocumento(arquivo);

  const [rota, dados, config] = api.post.mock.calls[0];
  expect(rota).toBe('/documentos/meus');
  expect(dados.get('arquivo')).toBe(arquivo);
  expect(config).toEqual(multipart);
});

test('cadastro com documento manda o aluno em JSON e o certificado juntos', async () => {
  const arquivo = new File(['%PDF'], 'c.pdf');
  cadastrarAlunoComDocumento({ nomeCompleto: 'Maria' }, arquivo);

  const [rota, dados, config] = api.post.mock.calls[0];
  expect(rota).toBe('/alunos/com-documento');
  expect(config).toEqual(multipart);
  expect(dados.get('documento')).toBe(arquivo);
  const aluno = dados.get('aluno');
  expect(aluno.type).toBe('application/json');
  const texto = await new Promise((resolve) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.readAsText(aluno);
  });
  expect(JSON.parse(texto)).toEqual({ nomeCompleto: 'Maria' });

  cadastrarAlunoComDocumento({ nomeCompleto: 'Sem anexo' }, null);
  expect(api.post.mock.calls[1][1].get('documento')).toBeNull();
});

describe('conferirArquivoDoDocumento', () => {
  const arquivo = (nome, tamanho = 100) => {
    const f = new File(['x'], nome);
    Object.defineProperty(f, 'size', { value: tamanho });
    return f;
  };

  test.each([
    [null, 'Anexe o certificado de conclusão (PDF, JPG ou PNG).'],
    [arquivo('certificado.docx'), 'Envie o documento em PDF, JPG ou PNG.'],
    [arquivo('sem-extensao'), 'Envie o documento em PDF, JPG ou PNG.'],
    [arquivo('grande.pdf', 5 * 1024 * 1024 + 1), 'O arquivo pode ter no máximo 5 MB.'],
    [arquivo('Foto.JPEG'), null],
    [arquivo('scan.png'), null],
    [arquivo('certificado.pdf', 5 * 1024 * 1024), null],
  ])('%p -> %p', (entrada, esperado) => {
    expect(documentoService.conferirArquivoDoDocumento(entrada)).toBe(esperado);
  });
});

test.each([
  [undefined, ''],
  [0, '0 B'],
  [900, '900 B'],
  [2048, '2 KB'],
  [1572864, '1,5 MB'],
])('formatarTamanho(%p) = %p', (bytes, texto) => {
  expect(documentoService.formatarTamanho(bytes)).toBe(texto);
});
