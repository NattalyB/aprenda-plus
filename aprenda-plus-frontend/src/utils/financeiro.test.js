import {
  formatarData,
  nomeDoMes,
  hojeISO,
  gerarCsvDeParcelas,
  baixarArquivo,
  STATUS_PARCELA,
  situacaoDaParcela,
  rotuloDaSituacao,
} from './financeiro';

test('formata datas e meses', () => {
  expect(formatarData('2026-10-19')).toBe('19/10/2026');
  expect(formatarData('2026-10-19T10:00:00')).toBe('19/10/2026');
  expect(formatarData(null)).toBe('-');
  expect(nomeDoMes('2026-01')).toBe('jan/26');
  expect(nomeDoMes('2027-12')).toBe('dez/27');
  expect(hojeISO(new Date(2026, 2, 5))).toBe('2026-03-05');
  expect(hojeISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(STATUS_PARCELA.atrasado).toBe('Atrasada');
});

test('gera o CSV no formato do Excel em português', () => {
  const csv = gerarCsvDeParcelas([
    { aluno: 'Ana "Bia"', curso: 'Redes', turma: null, numeroParcela: 2, totalParcelas: 12, vencimento: '2026-10-19', valor: 1234.5, status: 'pago', dataPagamento: '2026-10-18', formaPagamento: 'Pix' },
    { aluno: 'Caio', curso: 'Design', turma: 'T1', numeroParcela: 1, totalParcelas: 1, vencimento: '2026-11-01', valor: 10, status: 'outro', dataPagamento: null, formaPagamento: null },
  ]);

  const linhas = csv.split('\r\n');
  expect(csv.startsWith('﻿')).toBe(true);
  expect(linhas[0]).toContain('"Aluno";"Curso"');
  expect(linhas[1]).toBe('"Ana ""Bia""";"Redes";"";"2/12";"19/10/2026";"1234,50";"Paga";"18/10/2026";"Pix"');
  expect(linhas[2]).toContain('"outro";"";""');
});

test('baixa o arquivo pelo navegador', () => {
  URL.createObjectURL = jest.fn(() => 'blob:teste');
  URL.revokeObjectURL = jest.fn();
  const clique = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  baixarArquivo('parcelas.csv', 'a;b');

  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(clique).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:teste');
  clique.mockRestore();
});

test('Pix e cartão em aberto são cobrança automática; boleto continua a vencer ou atrasado', () => {
  expect(situacaoDaParcela({ status: 'pendente', cobrancaAutomatica: true })).toBe('automatica');
  expect(situacaoDaParcela({ status: 'atrasado', cobrancaAutomatica: true })).toBe('automatica');
  expect(situacaoDaParcela({ status: 'pago', cobrancaAutomatica: true })).toBe('pago');
  expect(situacaoDaParcela({ status: 'pendente', cobrancaAutomatica: false })).toBe('pendente');
  expect(situacaoDaParcela({ status: 'atrasado' })).toBe('atrasado');
  expect(rotuloDaSituacao({ status: 'pendente', cobrancaAutomatica: true })).toBe('Automática');
  expect(rotuloDaSituacao({ status: 'outro' })).toBe('outro');

  const csv = gerarCsvDeParcelas([
    { aluno: 'Ana', curso: 'Redes', numeroParcela: 2, totalParcelas: 3, vencimento: '2026-11-19', valor: 10, status: 'pendente', cobrancaAutomatica: true, formaPagamento: 'Cartão de crédito' },
  ]);
  expect(csv).toContain('"Automática"');
});
