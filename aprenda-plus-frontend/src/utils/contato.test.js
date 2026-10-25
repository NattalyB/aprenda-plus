import { EMAIL_ATENDIMENTO, numeroWhatsapp, resumoDaConversa, linkWhatsapp, linkEmail } from './contato';

const conversa = [
  { autor: 'assistente', texto: 'Olá!', inicial: true },
  { autor: 'aluno', texto: 'Quanto custa?' },
  { autor: 'assistente', texto: 'R$ 1.500,00' },
  { autor: 'assistente', texto: 'falhou', erro: true },
  { autor: 'assistente', texto: 'Fale com a equipe', atendente: true },
];

test('número do WhatsApp fica só com dígitos', () => {
  expect(numeroWhatsapp('+55 (51) 99999-0000')).toBe('5551999990000');
  expect(numeroWhatsapp('')).toBe('');
  expect(numeroWhatsapp(undefined)).toBe('');
});

test('resumo leva só as perguntas e respostas de verdade', () => {
  expect(resumoDaConversa(conversa)).toBe('\n\nConversa no site:\nEu: Quanto custa?\nAssistente: R$ 1.500,00');
  expect(resumoDaConversa([])).toBe('');
  expect(resumoDaConversa()).toBe('');
});

test('links do WhatsApp e do e-mail já levam a mensagem pronta', () => {
  const whats = linkWhatsapp('5551999990000', conversa);
  expect(whats.startsWith('https://wa.me/5551999990000?text=')).toBe(true);
  expect(decodeURIComponent(whats.split('text=')[1])).toContain('Eu: Quanto custa?');

  const email = linkEmail(conversa);
  expect(email.startsWith(`mailto:${EMAIL_ATENDIMENTO}?subject=Atendimento%20pelo%20site&body=`)).toBe(true);
  expect(decodeURIComponent(email.split('body=')[1])).toContain('Gostaria de falar com um atendente');
});
