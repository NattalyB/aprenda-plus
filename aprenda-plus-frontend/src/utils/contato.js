// Contatos da equipe, usados pelo assistente virtual quando a pessoa quer falar com alguém.
// O WhatsApp vem do arquivo .env.production (VITE_WHATSAPP_ATENDIMENTO=5551999999999).
export const EMAIL_ATENDIMENTO = 'aprendaplus@gmail.com';

export const numeroWhatsapp = (valor = import.meta.env.VITE_WHATSAPP_ATENDIMENTO) => (valor || '').replace(/\D/g, '');

// Resumo das últimas mensagens, para a equipe já saber do que se trata
export const resumoDaConversa = (mensagens = []) => {
  const linhas = mensagens
    .filter((m) => !m.inicial && !m.erro && !m.atendente)
    .slice(-6)
    .map((m) => `${m.autor === 'aluno' ? 'Eu' : 'Assistente'}: ${m.texto}`);
  return linhas.length ? `\n\nConversa no site:\n${linhas.join('\n')}` : '';
};

export const linkWhatsapp = (numero, mensagens) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(
    `Olá! Vim pelo site do AprendaPlus e gostaria de falar com um atendente.${resumoDaConversa(mensagens)}`
  )}`;

export const linkEmail = (mensagens) =>
  `mailto:${EMAIL_ATENDIMENTO}?subject=${encodeURIComponent('Atendimento pelo site')}&body=${encodeURIComponent(
    `Olá! Gostaria de falar com um atendente.${resumoDaConversa(mensagens)}`
  )}`;
