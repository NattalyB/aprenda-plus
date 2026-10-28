// Regras e textos do módulo Comercial (painel). Funções puras, fáceis de testar.
import { formatarData } from './financeiro';

// Etapa em que a pessoa parou (a mesma chave que o servidor manda em LeadComercial.etapa)
export const ETAPAS = {
  inscricao_pendente: {
    rotulo: 'Pagamento pendente',
    descricao: 'Fez a inscrição e não pagou',
    classe: 'comercial-etapa-inscricao',
  },
  carrinho: {
    rotulo: 'Carrinho abandonado',
    descricao: 'Pôs no carrinho e não finalizou',
    classe: 'comercial-etapa-carrinho',
  },
  cadastro: {
    rotulo: 'Só cadastro',
    descricao: 'Criou a conta e nunca comprou',
    classe: 'comercial-etapa-cadastro',
  },
};
export const ORDEM_ETAPAS = ['inscricao_pendente', 'carrinho', 'cadastro'];

export const CANAIS = [
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'telefone', rotulo: 'Telefone' },
  { valor: 'email', rotulo: 'E-mail' },
];

export const RESULTADOS = [
  { valor: 'sem_resposta', rotulo: 'Não respondeu' },
  { valor: 'interessado', rotulo: 'Interessado' },
  { valor: 'retornar_depois', rotulo: 'Pediu retorno depois' },
  { valor: 'sem_interesse', rotulo: 'Sem interesse' },
  { valor: 'matriculou', rotulo: 'Matriculou' },
];

export const PERIODOS = [7, 30, 90];

export const rotuloDoCanal = (valor) => CANAIS.find((c) => c.valor === valor)?.rotulo || valor || '';
export const rotuloDoResultado = (valor) => RESULTADOS.find((r) => r.valor === valor)?.rotulo || valor || '';

const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// 0 -> "hoje", 1 -> "há 1 dia", 5 -> "há 5 dias"
export const textoDiasParado = (dias) => {
  const n = Number(dias) || 0;
  if (n <= 0) return 'hoje';
  return n === 1 ? 'há 1 dia' : `há ${n} dias`;
};

// "2026-10-27T14:05:00" -> "27/10/2026 14:05"
export const formatarDataHora = (valor) => {
  if (!valor) return '-';
  const texto = String(valor);
  const hora = texto.length >= 16 ? texto.slice(11, 16) : '';
  return hora ? `${formatarData(texto)} ${hora}` : formatarData(texto);
};

// Filtros da lista de leads
export const FILTROS_PADRAO = {
  etapa: 'todas',
  busca: '',
  diasMinimos: 0,
  soComConsentimento: false,
  ocultarSemInteresse: true,
};

export const filtrarLeads = (leads = [], filtros = FILTROS_PADRAO) => {
  const termo = normalizar(filtros.busca);
  return leads.filter((lead) => {
    if (filtros.etapa && filtros.etapa !== 'todas' && lead.etapa !== filtros.etapa) return false;
    if (filtros.soComConsentimento && !lead.aceitaMarketing) return false;
    if (filtros.ocultarSemInteresse && lead.ultimoContato?.resultado === 'sem_interesse') return false;
    if ((Number(lead.diasParado) || 0) < (Number(filtros.diasMinimos) || 0)) return false;
    if (!termo) return true;
    const ondeProcurar = [lead.nome, lead.email, lead.telefone, ...(lead.cursos || [])].map(normalizar);
    return ondeProcurar.some((texto) => texto.includes(termo));
  });
};

// Quantos leads em cada etapa (para os contadores das abas e do resumo)
export const contarPorEtapa = (leads = []) => {
  const contagem = { todas: leads.length };
  ORDEM_ETAPAS.forEach((etapa) => {
    contagem[etapa] = leads.filter((lead) => lead.etapa === etapa).length;
  });
  return contagem;
};

// Valor somado das compras paradas (inscrição pendente e carrinho)
export const valorEmAberto = (leads = []) =>
  leads.reduce((soma, lead) => soma + (lead.etapa === 'cadastro' ? 0 : Number(lead.valor || 0)), 0);

// "Maria Silva" -> "Maria"
const primeiroNome = (nome) => (nome || '').trim().split(/\s+/)[0] || '';

// ["A"] -> "A"; ["A", "B"] -> "A e B"; ["A", "B", "C"] -> "A, B e C"
export const juntarCursos = (cursos = []) => {
  if (cursos.length <= 1) return cursos[0] || '';
  return `${cursos.slice(0, -1).join(', ')} e ${cursos[cursos.length - 1]}`;
};

// Mensagem pronta para a equipe mandar, de acordo com a etapa em que a pessoa parou
export const mensagemSugerida = (lead) => {
  const nome = primeiroNome(lead?.nome);
  const ola = nome ? `Olá, ${nome}! Tudo bem?` : 'Olá! Tudo bem?';
  const cursos = juntarCursos(lead?.cursos || []);
  switch (lead?.etapa) {
    case 'inscricao_pendente':
      return `${ola} Aqui é da equipe do AprendaPlus. Vi que você fez a inscrição em ${cursos || 'um dos nossos cursos'}, mas o pagamento ainda não foi concluído. Posso te ajudar com alguma dúvida para garantir a sua vaga?`;
    case 'carrinho':
      return `${ola} Aqui é da equipe do AprendaPlus. Vi que você deixou ${cursos || 'um curso'} no carrinho. Ficou alguma dúvida sobre o curso ou as formas de pagamento? Estou à disposição!`;
    default:
      return cursos
        ? `${ola} Aqui é da equipe do AprendaPlus. Obrigado por se cadastrar! Vi que você se interessou por ${cursos}. Posso te ajudar a escolher o seu curso?`
        : `${ola} Aqui é da equipe do AprendaPlus. Obrigado por se cadastrar! Posso te ajudar a escolher o seu curso?`;
  }
};

// Telefone do aluno no formato do WhatsApp: "(51) 99999-0000" -> "5551999990000"
export const telefoneWhatsapp = (telefone) => {
  const numeros = (telefone || '').replace(/\D/g, '');
  if (numeros.length === 10 || numeros.length === 11) return `55${numeros}`;
  if ((numeros.length === 12 || numeros.length === 13) && numeros.startsWith('55')) return numeros;
  return '';
};

export const linkWhatsappDoLead = (lead) => {
  const numero = telefoneWhatsapp(lead?.telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagemSugerida(lead))}` : '';
};

export const linkEmailDoLead = (lead) =>
  lead?.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent('AprendaPlus: podemos te ajudar?')}&body=${encodeURIComponent(
        mensagemSugerida(lead)
      )}`
    : '';

const valorParaPlanilha = (valor) =>
  valor === null || valor === undefined ? '' : Number(valor).toFixed(2).replace('.', ',');

// CSV para o Excel em português (separador ";" e acentos certos)
export const gerarCsvDeLeads = (leads = []) => {
  const cabecalho = [
    'Nome', 'E-mail', 'Telefone', 'Etapa', 'Cursos de interesse', 'Valor (R$)', 'Parado desde',
    'Dias parado', 'Aceita ofertas', 'Já é aluno', 'Último contato', 'Resultado do último contato',
  ];
  const aspas = (texto) => `"${String(texto ?? '').replace(/"/g, '""')}"`;
  const linhas = leads.map((lead) =>
    [
      lead.nome,
      lead.email,
      lead.telefone,
      ETAPAS[lead.etapa]?.rotulo || lead.etapa,
      (lead.cursos || []).join(', '),
      valorParaPlanilha(lead.valor),
      lead.desde ? formatarData(lead.desde) : '',
      lead.diasParado ?? '',
      lead.aceitaMarketing ? 'Sim' : 'Não',
      lead.jaEhAluno ? 'Sim' : 'Não',
      lead.ultimoContato ? formatarDataHora(lead.ultimoContato.quando) : '',
      lead.ultimoContato ? rotuloDoResultado(lead.ultimoContato.resultado) : '',
    ]
      .map(aspas)
      .join(';')
  );
  return '﻿' + [cabecalho.map(aspas).join(';'), ...linhas].join('\r\n');
};

// Funil: % de cada etapa em relação à primeira e quanto se perdeu desde a etapa anterior
export const etapasDoFunil = (funil = []) => {
  const base = Number(funil[0]?.pessoas) || 0;
  return funil.map((etapa, indice) => {
    const pessoas = Number(etapa.pessoas) || 0;
    const anterior = indice === 0 ? null : Number(funil[indice - 1].pessoas) || 0;
    return {
      ...etapa,
      pessoas,
      porcentagem: base > 0 ? Math.round((pessoas / base) * 1000) / 10 : 0,
      perda: anterior ? Math.max(0, Math.round(((anterior - pessoas) / anterior) * 1000) / 10) : null,
    };
  });
};

// 33.3 -> "33,3%"
export const formatarPorcentagem = (valor) =>
  `${Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
