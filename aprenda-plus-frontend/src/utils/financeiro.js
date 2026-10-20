// Funções de apoio das telas do financeiro

export const STATUS_PARCELA = {
  pendente: 'A vencer',
  atrasado: 'Atrasada',
  pago: 'Paga',
  cancelado: 'Cancelada',
  automatica: 'Automática',
};

// Pix e cartão caem sozinhos: parcela em aberto deles não é "a vencer" nem "atrasada",
// é cobrança automática (ninguém precisa dar baixa). Devolve a chave usada nos filtros e nas cores.
export const situacaoDaParcela = (parcela) =>
  parcela.cobrancaAutomatica && (parcela.status === 'pendente' || parcela.status === 'atrasado')
    ? 'automatica'
    : parcela.status;

export const rotuloDaSituacao = (parcela) => {
  const situacao = situacaoDaParcela(parcela);
  return STATUS_PARCELA[situacao] || situacao;
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "2026-10-19" -> "19/10/2026"
export const formatarData = (data) => {
  if (!data) return '-';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

// "2026-10" -> "out/26"
export const nomeDoMes = (mes) => {
  const [ano, numero] = String(mes).split('-');
  return `${MESES[Number(numero) - 1]}/${ano.slice(2)}`;
};

// Data de hoje no formato do campo <input type="date">: "2026-10-12"
export const hojeISO = (agora = new Date()) => {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Valor com vírgula para a planilha: 1234.5 -> "1234,50"
const valorParaPlanilha = (valor) => Number(valor || 0).toFixed(2).replace('.', ',');

// Monta um CSV que o Excel em português abre direto (separador ";" e acentos certos)
export const gerarCsvDeParcelas = (parcelas) => {
  const cabecalho = ['Aluno', 'Curso', 'Turma', 'Parcela', 'Vencimento', 'Valor', 'Situação', 'Pago em', 'Forma de pagamento'];
  const aspas = (texto) => `"${String(texto ?? '').replace(/"/g, '""')}"`;
  const linhas = parcelas.map((p) =>
    [
      p.aluno,
      p.curso,
      p.turma,
      `${p.numeroParcela}/${p.totalParcelas}`,
      formatarData(p.vencimento),
      valorParaPlanilha(p.valor),
      rotuloDaSituacao(p),
      p.dataPagamento ? formatarData(p.dataPagamento) : '',
      p.formaPagamento,
    ]
      .map(aspas)
      .join(';')
  );
  return '﻿' + [cabecalho.map(aspas).join(';'), ...linhas].join('\r\n');
};

// Faz o navegador baixar um arquivo de texto
export const baixarArquivo = (nome, conteudo, tipo = 'text/csv;charset=utf-8') => {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
