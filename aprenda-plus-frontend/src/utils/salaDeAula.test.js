import {
  idDoYoutube,
  urlDoPlayer,
  tipoDaAula,
  formatarDataCurta,
  formatarDataHora,
  dataPorExtenso,
  agruparPorDisciplina,
} from './salaDeAula';

const ID = 'dQw4w9WgXcQ';

test.each([
  [`https://www.youtube.com/watch?v=${ID}`, ID],
  [`https://www.youtube.com/watch?feature=share&v=${ID}&t=5`, ID],
  [`youtube.com/embed/${ID}`, ID],
  [`https://m.youtube.com/shorts/${ID}`, ID],
  [`https://youtu.be/${ID}?si=abc`, ID],
  [` https://www.youtube.com/live/${ID} `, ID],
  ['https://vimeo.com/123', null],
  ['https://www.youtube.com/watch?v=curto', null],
  ['', null],
  [null, null],
])('idDoYoutube(%p) = %p', (url, esperado) => {
  expect(idDoYoutube(url)).toBe(esperado);
});

test('monta o player sem cookies do YouTube', () => {
  expect(urlDoPlayer(`https://youtu.be/${ID}`)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=0`);
  expect(urlDoPlayer('https://vimeo.com/1')).toBeNull();
});

test('tipo de aula desconhecido vira videoaula', () => {
  expect(tipoDaAula('leitura').texto).toBe('Leitura');
  expect(tipoDaAula('xpto').texto).toBe('Videoaula');
});

test('formata as datas', () => {
  expect(formatarDataCurta('2026-11-03')).toBe('03/11/2026');
  expect(formatarDataCurta(null)).toBe('');
  expect(formatarDataHora('2026-10-13T21:05:00')).toBe('13/10/2026 às 21:05');
  expect(formatarDataHora('2026-10-13')).toBe('13/10/2026');
  expect(formatarDataHora(null)).toBe('');
  expect(dataPorExtenso('2026-10-13T21:05:00')).toBe('13 de outubro de 2026');
  expect(dataPorExtenso('2026-01-02')).toBe('2 de janeiro de 2026');
  expect(dataPorExtenso(null)).toBe('');
});

test('agrupa as aulas por disciplina na ordem em que aparecem', () => {
  const grupos = agruparPorDisciplina([
    { idAula: 1, disciplina: 'Marketing' },
    { idAula: 2, disciplina: null },
    { idAula: 3, disciplina: 'Marketing' },
  ]);
  expect(grupos.map((g) => g.nome)).toEqual(['Marketing', 'Aulas gerais']);
  expect(grupos[0].aulas.map((a) => a.idAula)).toEqual([1, 3]);
  expect(agruparPorDisciplina(undefined)).toEqual([]);
});
