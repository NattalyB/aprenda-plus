// Leitura e montagem de planilhas CSV para a importação em massa do painel.
// O Excel e o Google Planilhas abrem e salvam CSV ("Arquivo > Salvar como > CSV").

export const LIMITE_LINHAS = 500;

// Lê o arquivo como texto. O Excel às vezes salva o CSV no formato antigo do Windows (sem UTF-8):
// nesse caso os acentos viram um losango com "?" e o arquivo é lido de novo nesse formato.
const lerComo = (arquivo, codificacao) =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result || ''));
    leitor.onerror = () => reject(new Error('leitura'));
    leitor.readAsText(arquivo, codificacao);
  });

export const lerArquivo = async (arquivo) => {
  const texto = await lerComo(arquivo, 'utf-8');
  return texto.includes('\uFFFD') ? lerComo(arquivo, 'windows-1252') : texto;
};

// Modelos de cada importação: colunas, se são obrigatórias, uma dica e linhas de exemplo.
// O servidor aceita as colunas sem acento, com maiúsculas ou minúsculas, em qualquer ordem.
export const MODELOS = {
  alunos: {
    titulo: 'alunos',
    item: 'Aluno',
    importados: ['aluno importado', 'alunos importados'],
    arquivo: 'modelo-alunos.csv',
    colunas: [
      { nome: 'Nome completo', obrigatoria: true },
      { nome: 'E-mail', obrigatoria: true },
      { nome: 'CPF', obrigatoria: true, dica: 'com ou sem pontos' },
      { nome: 'Telefone', obrigatoria: true },
      { nome: 'Data de nascimento', obrigatoria: true, dica: 'dd/mm/aaaa' },
      { nome: 'CEP', obrigatoria: true },
      { nome: 'Rua', obrigatoria: true },
      { nome: 'Número', obrigatoria: true },
      { nome: 'Complemento' },
      { nome: 'Bairro', obrigatoria: true },
      { nome: 'Cidade', obrigatoria: true },
      { nome: 'UF', obrigatoria: true },
      { nome: 'Senha', dica: 'se ficar vazia, o aluno cria a dele em "Esqueci minha senha"' },
    ],
    exemplos: [
      ['Ana Beatriz Souza', 'ana.souza@email.com', '123.456.789-01', '(51) 99999-8888', '15/03/2001', '92010-000',
        'Rua Tiradentes', '120', 'Apto 302', 'Centro', 'Canoas', 'RS', ''],
    ],
  },
  professores: {
    titulo: 'professores',
    item: 'Professor',
    importados: ['professor importado', 'professores importados'],
    arquivo: 'modelo-professores.csv',
    colunas: [
      { nome: 'Nome completo', obrigatoria: true },
      { nome: 'E-mail', obrigatoria: true },
      { nome: 'CPF', obrigatoria: true, dica: 'com ou sem pontos' },
      { nome: 'Telefone', obrigatoria: true },
      { nome: 'Data de nascimento', obrigatoria: true, dica: 'dd/mm/aaaa' },
      { nome: 'CEP', obrigatoria: true },
      { nome: 'Rua', obrigatoria: true },
      { nome: 'Número', obrigatoria: true },
      { nome: 'Complemento' },
      { nome: 'Bairro', obrigatoria: true },
      { nome: 'Cidade', obrigatoria: true },
      { nome: 'UF', obrigatoria: true },
    ],
    exemplos: [
      ['Roberto Carlos Fagundes', 'roberto.fagundes@aprendaplus.com', '987.654.321-00', '(51) 98888-7777',
        '22/08/1980', '90010-150', 'Av. Borges de Medeiros', '500', '', 'Centro Histórico', 'Porto Alegre', 'RS'],
    ],
  },
  cursos: {
    titulo: 'cursos',
    item: 'Curso',
    importados: ['curso importado', 'cursos importados'],
    arquivo: 'modelo-cursos.csv',
    colunas: [
      { nome: 'Nome', obrigatoria: true },
      { nome: 'Categoria', obrigatoria: true, dica: 'superior ou profissionalizante' },
      { nome: 'Carga horária', obrigatoria: true, dica: 'em horas' },
      { nome: 'Modalidade', obrigatoria: true, dica: 'ex.: EAD' },
      { nome: 'Valor', obrigatoria: true, dica: 'ex.: 12000,00' },
      { nome: 'Número de parcelas', dica: 'de 1 a 120' },
      { nome: 'Formas de pagamento' },
      { nome: 'Descrição' },
      { nome: 'Conteúdo' },
      { nome: 'Pré-requisitos' },
    ],
    exemplos: [
      ['Gestão de Projetos', 'superior', '1600', 'EAD', '18000,00', '24', 'Pix, cartão, boleto',
        'Aprenda a planejar e entregar projetos.', 'Escopo, prazos, custos e equipes.', 'Ensino médio completo'],
    ],
  },
  disciplinas: {
    titulo: 'disciplinas',
    item: 'Disciplina',
    importados: ['disciplina importada', 'disciplinas importadas'],
    arquivo: 'modelo-disciplinas.csv',
    colunas: [
      { nome: 'Nome', obrigatoria: true },
      { nome: 'Cursos', obrigatoria: true, dica: 'nome igual ao cadastro; vários separados por ;' },
      { nome: 'Carga horária', obrigatoria: true, dica: 'em horas' },
      { nome: 'Modalidade' },
      { nome: 'Situação', dica: 'ativa ou inativa (vazio = ativa)' },
      { nome: 'Descrição' },
      { nome: 'Conteúdo' },
      { nome: 'Pré-requisitos' },
    ],
    exemplos: [
      ['Lógica de Programação', 'Análise e Desenvolvimento de Sistemas; Engenharia de Software', '80', 'EAD', 'ativa',
        'Base para todas as disciplinas de programação.', 'Algoritmos, variáveis e laços.', ''],
    ],
  },
  aulas: {
    titulo: 'aulas',
    item: 'Aula',
    importados: ['aula importada', 'aulas importadas'],
    arquivo: 'modelo-aulas.csv',
    colunas: [
      { nome: 'Título', obrigatoria: true },
      { nome: 'Disciplina', dica: 'do curso da turma (pode ficar vazia)' },
      { nome: 'Tipo', dica: 'videoaula, leitura, ao vivo ou atividade' },
      { nome: 'Vídeo', dica: 'link do YouTube (youtube.com/watch?v=...)' },
      { nome: 'Material', dica: 'link https:// (ex.: Google Drive)' },
      { nome: 'Conteúdo', dica: 'texto da aula' },
      { nome: 'Duração (minutos)' },
      { nome: 'Data de liberação', dica: 'dd/mm/aaaa (vazio = já liberada)' },
      { nome: 'Publicada', dica: 'sim ou não (vazio = sim)' },
    ],
    exemplos: [
      ['Boas-vindas e apresentação', '', 'leitura', '', '', 'Conheça a disciplina e como a sala de aula funciona.',
        '15', '', 'sim'],
      ['Encontro ao vivo: tira-dúvidas', '', 'ao vivo', '', '', 'Link do encontro enviado no mural.', '60',
        '10/11/2026', 'sim'],
    ],
  },
};

// Descobre o separador olhando o cabeçalho: o Excel em português salva com ";", o Google Planilhas com ","
export const separadorDe = (cabecalho) => {
  const pontoEVirgula = (cabecalho.match(/;/g) || []).length;
  const virgula = (cabecalho.match(/,/g) || []).length;
  const tab = (cabecalho.match(/\t/g) || []).length;
  if (tab > pontoEVirgula && tab > virgula) return '\t';
  return pontoEVirgula >= virgula && pontoEVirgula > 0 ? ';' : ',';
};

// Quebra o texto em linhas e colunas, respeitando aspas ("Rua A, 10" fica numa coluna só)
// e quebras de linha dentro de aspas.
export const lerCsv = (texto) => {
  const conteudo = String(texto || '').replace(/^﻿/, '');
  const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] || '';
  const sep = separadorDe(primeiraLinha);
  const linhas = [];
  let linha = [];
  let campo = '';
  let entreAspas = false;

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (entreAspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && conteudo[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
};

// Planilha -> { colunas, linhas: [{ "Nome": "Ana", ..., _linha: "2" }] }
// Linhas totalmente vazias são puladas, mas o número de cada linha continua o da planilha.
export const lerPlanilha = (texto) => {
  const tabela = lerCsv(texto);
  const colunas = (tabela[0] || []).map((c) => c.trim());
  if (colunas.filter(Boolean).length === 0) {
    return { colunas: [], linhas: [] };
  }
  const linhas = [];
  tabela.slice(1).forEach((valores, indice) => {
    if (valores.every((v) => !v || !v.trim())) return;
    const linha = { _linha: String(indice + 2) };
    colunas.forEach((coluna, i) => {
      if (coluna) linha[coluna] = (valores[i] ?? '').trim();
    });
    linhas.push(linha);
  });
  return { colunas, linhas };
};

// Compara nomes de colunas como o servidor: sem acento, sem maiúsculas e sem espaços
export const nomeDaColuna = (nome) =>
  String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Colunas obrigatórias do modelo que não estão na planilha
export const colunasFaltando = (modelo, colunas) => {
  const presentes = new Set(colunas.map(nomeDaColuna));
  return modelo.colunas.filter((c) => c.obrigatoria && !presentes.has(nomeDaColuna(c.nome))).map((c) => c.nome);
};

const aspas = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

// CSV com ";" e o "BOM" no começo, para o Excel em português abrir com os acentos certos
export const montarCsv = (cabecalho, linhas) =>
  '﻿' + [cabecalho, ...linhas].map((linha) => linha.map(aspas).join(';')).join('\r\n');

export const modeloEmCsv = (modelo) => montarCsv(modelo.colunas.map((c) => c.nome), modelo.exemplos);

// As linhas que deram erro, com uma coluna "Erro" no fim, para corrigir e importar de novo
export const linhasComErroEmCsv = (colunas, linhasEnviadas, resultado) => {
  const erros = new Map(resultado.linhas.filter((l) => l.erros.length > 0).map((l) => [String(l.linha), l.erros]));
  const cabecalho = [...colunas.filter(Boolean), 'Erro'];
  const linhas = linhasEnviadas
    .filter((l) => erros.has(l._linha))
    .map((l) => [...colunas.filter(Boolean).map((c) => l[c] ?? ''), erros.get(l._linha).join(' | ')]);
  return montarCsv(cabecalho, linhas);
};
