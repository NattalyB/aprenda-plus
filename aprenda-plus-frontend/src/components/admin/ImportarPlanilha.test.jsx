import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ImportarPlanilha from './ImportarPlanilha';
import { lerArquivo } from '../../utils/planilha';
import { importarPlanilha } from '../../services/importacaoService';
import { baixarArquivo } from '../../utils/financeiro';

jest.mock('../../services/importacaoService');
jest.mock('../../utils/financeiro', () => ({
  ...jest.requireActual('../../utils/financeiro'),
  baixarArquivo: jest.fn(),
}));

const CABECALHO = 'Nome;Categoria;Carga horária;Modalidade;Valor';
const csv = (...linhas) => new File([[CABECALHO, ...linhas].join('\n')], 'cursos.csv', { type: 'text/csv' });

const previa = {
  confirmado: false,
  total: 2,
  validas: 1,
  comErro: 1,
  importadas: 0,
  linhas: [
    { linha: 2, descricao: 'Gestão de Projetos', erros: [], importada: false },
    { linha: 4, descricao: 'Redes', erros: ['Já existe um curso com o nome "Redes".', 'Informe o valor do curso.'], importada: false },
  ],
};
const final = {
  ...previa,
  confirmado: true,
  importadas: 1,
  linhas: [{ ...previa.linhas[0], importada: true }, previa.linhas[1]],
};

const janela = () => screen.getByRole('dialog', { name: 'Importar cursos' });
const abrir = (props = {}) => {
  const onConcluido = jest.fn();
  render(<ImportarPlanilha tipo="cursos" onConcluido={onConcluido} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '📥 Importar planilha' }));
  return onConcluido;
};
const enviar = (arquivo) =>
  fireEvent.change(screen.getByLabelText('Arquivo da planilha (CSV)'), { target: { files: arquivo ? [arquivo] : [] } });

beforeEach(() => {
  jest.clearAllMocks();
});

test('mostra os passos, as colunas do modelo e baixa o modelo', () => {
  abrir();

  expect(within(janela()).getByText('Importar cursos por planilha')).toBeInTheDocument();
  const colunas = within(screen.getByRole('list', { name: 'Colunas da planilha' })).getAllByRole('listitem');
  expect(colunas[0]).toHaveTextContent('Nome *');
  expect(colunas[0]).toHaveClass('obrigatoria');
  expect(colunas[5]).toHaveTextContent('Número de parcelasde 1 a 120');
  expect(colunas[5]).not.toHaveClass('obrigatoria');

  fireEvent.click(screen.getByRole('button', { name: '⬇ Baixar modelo' }));
  expect(baixarArquivo).toHaveBeenCalledWith('modelo-cursos.csv', expect.stringContaining('"Nome";"Categoria"'));
});

test('confere, mostra a prévia e importa só as linhas certas', async () => {
  importarPlanilha.mockResolvedValueOnce(previa).mockResolvedValueOnce(final);
  const onConcluido = abrir();

  enviar(csv('Gestão de Projetos;superior;1600;EAD;18000,00', '', 'Redes;superior;100;EAD;'));

  expect(await screen.findByText('✓ 1 linha pronta')).toBeInTheDocument();
  expect(screen.getByText('✗ 1 com erro')).toBeInTheDocument();
  expect(screen.getByText('📄 cursos.csv')).toBeInTheDocument();
  expect(importarPlanilha).toHaveBeenCalledWith(
    'cursos',
    [
      { _linha: '2', Nome: 'Gestão de Projetos', Categoria: 'superior', 'Carga horária': '1600', Modalidade: 'EAD', Valor: '18000,00' },
      { _linha: '4', Nome: 'Redes', Categoria: 'superior', 'Carga horária': '100', Modalidade: 'EAD', Valor: '' },
    ],
    { confirmar: false, idTurma: undefined }
  );
  const linhas = within(janela()).getAllByRole('row').slice(1);
  expect(linhas[0]).toHaveTextContent('✓ Pronta');
  expect(linhas[1]).toHaveClass('importar-linha-erro');
  expect(within(linhas[1]).getAllByRole('listitem')).toHaveLength(2);
  expect(onConcluido).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Importar 1 linha' }));

  expect(await screen.findByText('✓ 1 curso importado')).toBeInTheDocument();
  expect(screen.getByText('✗ 1 linha ficou de fora')).toBeInTheDocument();
  expect(importarPlanilha).toHaveBeenLastCalledWith('cursos', expect.any(Array), { confirmar: true, idTurma: undefined });
  expect(onConcluido).toHaveBeenCalledWith(final);
  // No fim, a tabela mostra só o que ficou de fora
  expect(within(janela()).getAllByRole('row')).toHaveLength(2);

  fireEvent.click(screen.getByRole('button', { name: '⬇ Baixar linhas com erro' }));
  const [nome, conteudo] = baixarArquivo.mock.calls[0];
  expect(nome).toBe('cursos-com-erro.csv');
  expect(conteudo).toContain('"Redes";"superior";"100";"EAD";"";"Já existe um curso com o nome ""Redes"". | Informe o valor do curso."');
  expect(conteudo).not.toContain('Gestão');

  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('tudo certo: sem botão de baixar erros; nada válido: não deixa importar', async () => {
  const tudoCerto = { confirmado: true, total: 1, validas: 1, comErro: 0, importadas: 1, linhas: [previa.linhas[0]] };
  importarPlanilha.mockResolvedValueOnce({ ...tudoCerto, confirmado: false, importadas: 0 }).mockResolvedValueOnce(tudoCerto);
  abrir();
  enviar(csv('Gestão;superior;1;EAD;1'));
  fireEvent.click(await screen.findByRole('button', { name: 'Importar 1 linha' }));
  expect(await screen.findByText('✓ 1 curso importado')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Baixar linhas com erro/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  importarPlanilha.mockResolvedValueOnce({ ...previa, validas: 0, comErro: 2, linhas: [previa.linhas[1]] });
  fireEvent.click(screen.getByRole('button', { name: '📥 Importar planilha' }));
  enviar(csv('Redes;superior;1;EAD;'));
  expect(await screen.findByRole('button', { name: 'Importar 0 linhas' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Escolher outro arquivo' }));
  expect(screen.getByText('Escolher arquivo CSV')).toBeInTheDocument();
});

test('confere o arquivo antes de mandar para o servidor', async () => {
  abrir();

  enviar(new File(['Nome;Valor\n'], 'vazio.csv'));
  expect(await screen.findByText('A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho.')).toBeInTheDocument();

  enviar(new File(['Nome;Valor\nGestão;10'], 'faltando.csv'));
  expect(
    await screen.findByText('Faltam as colunas Categoria, Carga horária, Modalidade. Baixe o modelo para ver o formato certo.')
  ).toBeInTheDocument();
  expect(screen.getByText('faltando.csv · escolher outro')).toBeInTheDocument();

  enviar(new File(['Nome;Categoria;Carga;Modalidade;Valor\nGestão;superior;1;EAD;1'], 'uma.csv'));
  expect(await screen.findByText('Falta a coluna Carga horária. Baixe o modelo para ver o formato certo.')).toBeInTheDocument();

  const muitas = Array.from({ length: 501 }, (_, i) => `Curso ${i};superior;1;EAD;1`);
  enviar(csv(...muitas));
  expect(await screen.findByText('Envie no máximo 500 linhas por vez (a planilha tem 501).')).toBeInTheDocument();

  enviar({ name: 'quebrado.csv' });
  expect(await screen.findByText('Não foi possível ler o arquivo. Salve a planilha como CSV e tente de novo.')).toBeInTheDocument();

  enviar(null);
  expect(importarPlanilha).not.toHaveBeenCalled();
});

test('mostra o erro do servidor na conferência e na importação', async () => {
  importarPlanilha
    .mockRejectedValueOnce({ response: { data: { mensagem: 'Escolha o professor responsável antes de importar as aulas.' } } })
    .mockRejectedValueOnce(new Error('rede'))
    .mockResolvedValueOnce(previa)
    .mockRejectedValueOnce(new Error('rede'));
  abrir();

  enviar(csv('Gestão;superior;1;EAD;1'));
  expect(await screen.findByText('Escolha o professor responsável antes de importar as aulas.')).toBeInTheDocument();
  enviar(csv('Gestão;superior;1;EAD;1'));
  expect(await screen.findByText('Não foi possível conferir a planilha.')).toBeInTheDocument();

  enviar(csv('Gestão;superior;1;EAD;1'));
  fireEvent.click(await screen.findByRole('button', { name: 'Importar 1 linha' }));
  expect(await screen.findByText('Não foi possível importar a planilha.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Importar 1 linha' })).toBeEnabled();
});

test('aulas vão para a turma certa; o botão pode ficar desligado', async () => {
  importarPlanilha.mockResolvedValueOnce({ ...previa, linhas: [{ linha: 2, descricao: 'Boas-vindas', erros: [], importada: false }] });
  const { rerender } = render(<ImportarPlanilha tipo="aulas" idTurma="3" disabled title="Escolha o professor primeiro" />);
  const botao = screen.getByRole('button', { name: '📥 Importar planilha' });
  expect(botao).toBeDisabled();
  expect(botao).toHaveAttribute('title', 'Escolha o professor primeiro');

  rerender(<ImportarPlanilha tipo="aulas" idTurma="3" />);
  fireEvent.click(screen.getByRole('button', { name: '📥 Importar planilha' }));
  expect(screen.getByRole('dialog', { name: 'Importar aulas' })).toHaveTextContent('uma linha para cada aula');
  fireEvent.change(screen.getByLabelText('Arquivo da planilha (CSV)'), {
    target: { files: [new File(['Título;Tipo\nBoas-vindas;videoaula'], 'aulas.csv')] },
  });
  await waitFor(() =>
    expect(importarPlanilha).toHaveBeenCalledWith('aulas', [{ _linha: '2', Título: 'Boas-vindas', Tipo: 'videoaula' }], {
      confirmar: false,
      idTurma: '3',
    })
  );
  expect(await screen.findByRole('columnheader', { name: 'Aula' })).toBeInTheDocument();
});

test('fecha com Esc, mas não no meio da importação', async () => {
  let terminar;
  importarPlanilha.mockReturnValueOnce(new Promise((resolve) => (terminar = resolve)));
  abrir();
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(janela()).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '📥 Importar planilha' }));
  enviar(csv('Gestão;superior;1;EAD;1'));
  expect(await screen.findByText('Conferindo a planilha...')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(janela()).toBeInTheDocument();

  terminar(previa);
  expect(await screen.findByText('✓ 1 linha pronta')).toBeInTheDocument();
});

test('arquivo salvo pelo Excel no formato antigo do Windows mantém os acentos', async () => {
  // "Gestão" em windows-1252: o "ã" é o byte 0xE3 (inválido em UTF-8)
  const bytes = new Uint8Array([71, 101, 115, 116, 0xe3, 111]);
  expect(await lerArquivo(new File([bytes], 'antigo.csv'))).toBe('Gestão');
  expect(await lerArquivo(new File(['Gestão'], 'utf8.csv'))).toBe('Gestão');
});
