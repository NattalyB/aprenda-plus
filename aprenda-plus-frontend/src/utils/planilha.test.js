import {
  MODELOS,
  separadorDe,
  lerCsv,
  lerPlanilha,
  nomeDaColuna,
  colunasFaltando,
  montarCsv,
  modeloEmCsv,
  linhasComErroEmCsv,
} from './planilha';

test('descobre o separador pelo cabeçalho', () => {
  expect(separadorDe('Nome;E-mail;CPF')).toBe(';');
  expect(separadorDe('Nome,E-mail,CPF')).toBe(',');
  expect(separadorDe('Nome\tE-mail\tCPF')).toBe('\t');
  expect(separadorDe('Nome')).toBe(',');
});

test('lê CSV com aspas, aspas duplas, quebra de linha dentro de aspas e BOM', () => {
  const texto = '﻿Nome;Endereço;Obs\r\n"Ana";"Rua A; 10";"disse ""oi"""\r\nBia;Rua B;"linha 1\nlinha 2"\n';
  expect(lerCsv(texto)).toEqual([
    ['Nome', 'Endereço', 'Obs'],
    ['Ana', 'Rua A; 10', 'disse "oi"'],
    ['Bia', 'Rua B', 'linha 1\nlinha 2'],
  ]);
  expect(lerCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  expect(lerCsv('a,b\r1,2\r')).toEqual([['a', 'b'], ['1', '2']]);
  expect(lerCsv('')).toEqual([]);
  expect(lerCsv(null)).toEqual([]);
});

test('transforma a planilha em linhas com o número de cada uma, pulando as vazias', () => {
  const { colunas, linhas } = lerPlanilha('Nome; E-mail ;\n Ana ;ana@x.com;extra\n;;\nBia\n');
  expect(colunas).toEqual(['Nome', 'E-mail', '']);
  expect(linhas).toEqual([
    { _linha: '2', Nome: 'Ana', 'E-mail': 'ana@x.com' },
    { _linha: '4', Nome: 'Bia', 'E-mail': '' },
  ]);
  expect(lerPlanilha(';;\n1;2')).toEqual({ colunas: [], linhas: [] });
  expect(lerPlanilha('')).toEqual({ colunas: [], linhas: [] });
});

test('compara colunas sem acento, maiúsculas nem espaços e aponta as obrigatórias que faltam', () => {
  expect(nomeDaColuna('Data de Nascimento')).toBe('datadenascimento');
  expect(nomeDaColuna('Número')).toBe('numero');
  expect(nomeDaColuna(undefined)).toBe('');
  expect(colunasFaltando(MODELOS.cursos, ['nome', 'CATEGORIA', 'carga_horaria', 'Modalidade', 'valor'])).toEqual([]);
  expect(colunasFaltando(MODELOS.cursos, ['Nome', 'Valor'])).toEqual(['Categoria', 'Carga horária', 'Modalidade']);
});

test('monta o CSV do Excel e o modelo de cada importação', () => {
  expect(montarCsv(['A', 'B'], [['1', 'x"y'], [null, undefined]])).toBe('﻿"A";"B"\r\n"1";"x""y"\r\n"";""');
  Object.values(MODELOS).forEach((modelo) => {
    const [cabecalho, ...exemplos] = lerCsv(modeloEmCsv(modelo));
    expect(cabecalho).toEqual(modelo.colunas.map((c) => c.nome));
    exemplos.forEach((linha) => expect(linha).toHaveLength(modelo.colunas.length));
    // o modelo baixado passa na conferência de colunas
    expect(colunasFaltando(modelo, cabecalho)).toEqual([]);
  });
});

test('separa as linhas com erro, com o motivo numa coluna a mais', () => {
  const colunas = ['Nome', '', 'E-mail'];
  const enviadas = [
    { _linha: '2', Nome: 'Ana', 'E-mail': 'ana@x.com' },
    { _linha: '3', Nome: 'Bia' },
  ];
  const resultado = {
    linhas: [
      { linha: 2, erros: [] },
      { linha: 3, erros: ['Informe o e-mail.', 'Informe o CPF.'] },
    ],
  };
  expect(lerCsv(linhasComErroEmCsv(colunas, enviadas, resultado))).toEqual([
    ['Nome', 'E-mail', 'Erro'],
    ['Bia', '', 'Informe o e-mail. | Informe o CPF.'],
  ]);
});
