import {
  aguardaSuporte,
  chaveDeNovidade,
  classeSituacao,
  dataHora,
  encerrado,
  erroDoAnexo,
  nomeDaTela,
  rotuloCategoria,
  rotuloPrioridade,
  rotuloSituacao,
  tamanhoLegivel,
  temRespostaDoSuporte,
  TAMANHO_MAXIMO_ANEXO,
} from './chamados';

test('rótulos e classes', () => {
  expect(rotuloCategoria('acesso')).toBe('Acesso e senha');
  expect(rotuloPrioridade('urgente')).toBe('Urgente');
  expect(rotuloSituacao('em_atendimento')).toBe('Em atendimento');
  expect(rotuloSituacao('xpto')).toBe('xpto');
  expect(rotuloSituacao(undefined)).toBe('');
  expect(classeSituacao('em_atendimento')).toBe('atendimento');
  expect(classeSituacao('xpto')).toBe('fechado');
});

test('quem está esperando quem', () => {
  expect(aguardaSuporte({ status: 'aberto', ultimaMensagemDe: 'suporte' })).toBe(true);
  expect(aguardaSuporte({ status: 'em_atendimento', ultimaMensagemDe: 'solicitante' })).toBe(true);
  expect(aguardaSuporte({ status: 'em_atendimento', ultimaMensagemDe: 'suporte' })).toBe(false);
  expect(aguardaSuporte({ status: 'resolvido', ultimaMensagemDe: 'solicitante' })).toBe(false);
  expect(aguardaSuporte(null)).toBe(false);
  expect(temRespostaDoSuporte({ status: 'resolvido', ultimaMensagemDe: 'suporte' })).toBe(true);
  expect(temRespostaDoSuporte({ status: 'fechado', ultimaMensagemDe: 'suporte' })).toBe(false);
  expect(temRespostaDoSuporte(undefined)).toBe(false);
  expect(encerrado({ status: 'fechado' })).toBe(true);
  expect(encerrado(null)).toBe(false);
  expect(chaveDeNovidade({ idChamado: 4, atualizadoEm: '2026-11-07T10:00' })).toBe('4:2026-11-07T10:00');
  expect(chaveDeNovidade({ idChamado: 4 })).toBe('4:');
});

test('confere o anexo: print ou PDF de até 5 MB', () => {
  expect(erroDoAnexo(null)).toBeNull();
  expect(erroDoAnexo({ type: 'image/png', size: 10 })).toBeNull();
  expect(erroDoAnexo({ type: 'application/pdf', size: 10 })).toBeNull();
  expect(erroDoAnexo({ type: 'application/zip', size: 10 })).toBe('Anexe um print (PNG ou JPG) ou um PDF.');
  expect(erroDoAnexo({ type: 'image/jpeg', size: TAMANHO_MAXIMO_ANEXO + 1 })).toBe('O anexo pode ter no máximo 5 MB.');
});

test('nome da tela a partir do endereço', () => {
  expect(nomeDaTela('/admin')).toBe('Início do painel');
  expect(nomeDaTela('/admin/financeiro?aba=parcelas')).toBe('Financeiro');
  expect(nomeDaTela('/admin/turmas/3/editar')).toBe('Cadastro de turmas');
  expect(nomeDaTela('/professor/turmas/5')).toBe('Portal do Professor · Turma');
  expect(nomeDaTela('/professor')).toBe('Portal do Professor · Minhas turmas');
  expect(nomeDaTela('/carrinho')).toBe('');
  expect(nomeDaTela(undefined)).toBe('');
});

test('datas e tamanhos legíveis', () => {
  expect(dataHora('2026-11-07T09:05:00')).toBe('07/11/2026 às 09:05');
  expect(dataHora(null)).toBe('');
  expect(dataHora('não é data')).toBe('');
  expect(tamanhoLegivel(0)).toBe('');
  expect(tamanhoLegivel(500)).toBe('500 B');
  expect(tamanhoLegivel(2048)).toBe('2 KB');
  expect(tamanhoLegivel(1572864)).toBe('1,5 MB');
});
