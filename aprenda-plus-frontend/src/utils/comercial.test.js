import {
  contarPorEtapa,
  etapasDoFunil,
  filtrarLeads,
  formatarDataHora,
  formatarPorcentagem,
  FILTROS_PADRAO,
  gerarCsvDeLeads,
  juntarCursos,
  linkEmailDoLead,
  linkWhatsappDoLead,
  mensagemSugerida,
  rotuloDoCanal,
  rotuloDoResultado,
  telefoneWhatsapp,
  textoDiasParado,
  valorEmAberto,
} from './comercial';

const lead = (dados = {}) => ({
  idAluno: 1,
  nome: 'Ana Souza',
  email: 'ana@teste.com',
  telefone: '51999990000',
  aceitaMarketing: true,
  jaEhAluno: false,
  etapa: 'carrinho',
  cursos: ['Ciência de Dados'],
  valor: 800,
  desde: '2026-10-26T10:00:00',
  diasParado: 2,
  ultimoContato: null,
  totalContatos: 0,
  ...dados,
});

test('filtra por etapa, busca, tempo parado, consentimento e sem interesse', () => {
  const leads = [
    lead(),
    lead({ idAluno: 2, nome: 'Bruno', etapa: 'cadastro', aceitaMarketing: false, diasParado: 10, cursos: [] }),
    lead({ idAluno: 3, nome: 'Carla', etapa: 'inscricao_pendente', ultimoContato: { resultado: 'sem_interesse' } }),
  ];

  expect(filtrarLeads(leads, FILTROS_PADRAO).map((l) => l.nome)).toEqual(['Ana Souza', 'Bruno']);
  expect(filtrarLeads(leads, { ...FILTROS_PADRAO, ocultarSemInteresse: false })).toHaveLength(3);
  expect(filtrarLeads(leads, { ...FILTROS_PADRAO, etapa: 'cadastro' }).map((l) => l.nome)).toEqual(['Bruno']);
  expect(filtrarLeads(leads, { ...FILTROS_PADRAO, soComConsentimento: true }).map((l) => l.nome)).toEqual(['Ana Souza']);
  expect(filtrarLeads(leads, { ...FILTROS_PADRAO, diasMinimos: 7 }).map((l) => l.nome)).toEqual(['Bruno']);
  expect(filtrarLeads(leads, { ...FILTROS_PADRAO, busca: 'ciencia' }).map((l) => l.nome)).toEqual(['Ana Souza']);
  expect(filtrarLeads(leads, { ...FILTROS_PADRAO, busca: '9999' })).toHaveLength(2);
  expect(filtrarLeads()).toEqual([]);
});

test('conta leads por etapa e soma o valor parado (sem contar só cadastro)', () => {
  const leads = [lead(), lead({ etapa: 'inscricao_pendente', valor: 1200 }), lead({ etapa: 'cadastro', valor: null })];
  expect(contarPorEtapa(leads)).toEqual({ todas: 3, inscricao_pendente: 1, carrinho: 1, cadastro: 1 });
  expect(valorEmAberto(leads)).toBe(2000);
  expect(contarPorEtapa()).toEqual({ todas: 0, inscricao_pendente: 0, carrinho: 0, cadastro: 0 });
});

test('mensagem sugerida muda conforme a etapa', () => {
  expect(mensagemSugerida(lead({ etapa: 'inscricao_pendente', cursos: ['ADS', 'Design'] }))).toContain(
    'Olá, Ana! Tudo bem? Aqui é da equipe do AprendaPlus. Vi que você fez a inscrição em ADS e Design'
  );
  expect(mensagemSugerida(lead())).toContain('deixou Ciência de Dados no carrinho');
  expect(mensagemSugerida(lead({ etapa: 'cadastro' }))).toContain('se interessou por Ciência de Dados');
  expect(mensagemSugerida(lead({ etapa: 'cadastro', cursos: [] }))).toContain('Posso te ajudar a escolher');
  expect(mensagemSugerida(lead({ nome: '', etapa: 'carrinho', cursos: [] }))).toMatch(/^Olá! Tudo bem\?.*deixou um curso/);
  expect(mensagemSugerida(lead({ etapa: 'inscricao_pendente', cursos: [] }))).toContain('um dos nossos cursos');
});

test('junta nomes de cursos em português', () => {
  expect(juntarCursos([])).toBe('');
  expect(juntarCursos(['A'])).toBe('A');
  expect(juntarCursos(['A', 'B', 'C'])).toBe('A, B e C');
});

test('monta o telefone e os links de WhatsApp e e-mail', () => {
  expect(telefoneWhatsapp('(51) 99999-0000')).toBe('5551999990000');
  expect(telefoneWhatsapp('5133334444')).toBe('555133334444');
  expect(telefoneWhatsapp('5551999990000')).toBe('5551999990000');
  expect(telefoneWhatsapp('123')).toBe('');
  expect(telefoneWhatsapp(null)).toBe('');

  expect(linkWhatsappDoLead(lead())).toMatch(/^https:\/\/wa\.me\/5551999990000\?text=Ol%C3%A1/);
  expect(linkWhatsappDoLead(lead({ telefone: '' }))).toBe('');
  expect(linkEmailDoLead(lead())).toMatch(/^mailto:ana@teste\.com\?subject=/);
  expect(linkEmailDoLead(lead({ email: '' }))).toBe('');
});

test('textos de tempo, data, porcentagem e rótulos', () => {
  expect(textoDiasParado(0)).toBe('hoje');
  expect(textoDiasParado(1)).toBe('há 1 dia');
  expect(textoDiasParado(9)).toBe('há 9 dias');
  expect(formatarDataHora('2026-10-27T14:05:00')).toBe('27/10/2026 14:05');
  expect(formatarDataHora('2026-10-27')).toBe('27/10/2026');
  expect(formatarDataHora(null)).toBe('-');
  expect(formatarPorcentagem(33.3)).toBe('33,3%');
  expect(formatarPorcentagem(null)).toBe('0%');
  expect(rotuloDoCanal('whatsapp')).toBe('WhatsApp');
  expect(rotuloDoCanal('xpto')).toBe('xpto');
  expect(rotuloDoResultado('retornar_depois')).toBe('Pediu retorno depois');
  expect(rotuloDoResultado(undefined)).toBe('');
});

test('funil calcula % sobre as visitas e a perda entre etapas', () => {
  const etapas = etapasDoFunil([
    { chave: 'visitaram', pessoas: 200 },
    { chave: 'viram_curso', pessoas: 50 },
    { chave: 'carrinho', pessoas: 50 },
  ]);
  expect(etapas.map((e) => e.porcentagem)).toEqual([100, 25, 25]);
  expect(etapas.map((e) => e.perda)).toEqual([null, 75, 0]);
  expect(etapasDoFunil([{ chave: 'a', pessoas: 0 }, { chave: 'b', pessoas: 0 }])[1]).toMatchObject({ porcentagem: 0, perda: null });
});

test('CSV abre no Excel com ponto e vírgula e acentos', () => {
  const csv = gerarCsvDeLeads([
    lead({ nome: 'Ana "Aninha"', ultimoContato: { quando: '2026-10-27T14:05:00', resultado: 'interessado' } }),
    lead({ etapa: 'cadastro', valor: null, aceitaMarketing: false, jaEhAluno: true, desde: null }),
  ]);
  const linhas = csv.split('\r\n');
  expect(csv.startsWith('﻿')).toBe(true);
  expect(linhas).toHaveLength(3);
  expect(linhas[1]).toContain('"Ana ""Aninha"""');
  expect(linhas[1]).toContain('"Carrinho abandonado";"Ciência de Dados";"800,00";"26/10/2026";"2";"Sim";"Não";"27/10/2026 14:05";"Interessado"');
  expect(linhas[2]).toContain('"Só cadastro";"Ciência de Dados";"";"";"2";"Não";"Sim";"";""');
});
