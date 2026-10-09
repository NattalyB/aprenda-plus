import { formatarValor, arredondar, calcularMensalidade, DESCONTO_PIX } from './precoCurso';

// Remove o espaço especial que o Intl coloca entre "R$" e o número,
// pra comparar com um texto normal
const semEspacoEspecial = (texto) => texto.replace(/\s/g, ' ');

describe('formatarValor', () => {
  test('formata no padrão brasileiro', () => {
    expect(semEspacoEspecial(formatarValor(48000))).toBe('R$ 48.000,00');
    expect(semEspacoEspecial(formatarValor(7999.9))).toBe('R$ 7.999,90');
  });

  test('aceita texto com número', () => {
    expect(semEspacoEspecial(formatarValor('199.9'))).toBe('R$ 199,90');
  });

  test('valor vazio vira R$ 0,00', () => {
    expect(semEspacoEspecial(formatarValor(null))).toBe('R$ 0,00');
    expect(semEspacoEspecial(formatarValor(undefined))).toBe('R$ 0,00');
  });
});

describe('arredondar', () => {
  test('arredonda para centavos', () => {
    expect(arredondar(10.005)).toBeCloseTo(10.01, 2);
    expect(arredondar(333.3333)).toBe(333.33);
    expect(arredondar('2.5')).toBe(2.5);
  });
});

describe('calcularMensalidade', () => {
  test('divide o valor pelo número de parcelas', () => {
    expect(calcularMensalidade({ valor: 12000, numeroParcelas: 24 })).toBe(500);
  });

  test('sem parcelas cadastradas devolve null', () => {
    expect(calcularMensalidade({ valor: 12000 })).toBeNull();
    expect(calcularMensalidade({ valor: 12000, numeroParcelas: 0 })).toBeNull();
    expect(calcularMensalidade({ valor: 12000, numeroParcelas: -3 })).toBeNull();
  });

  test('curso inexistente devolve null', () => {
    expect(calcularMensalidade(null)).toBeNull();
    expect(calcularMensalidade(undefined)).toBeNull();
  });
});

test('desconto do Pix é de 5%', () => {
  expect(DESCONTO_PIX).toBe(0.05);
});
