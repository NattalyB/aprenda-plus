import {
  calcularDivisao,
  descreverDivisao,
  divisaoInicial,
  partesParaEnvio,
} from './pagamentoDividido';

const semEspacoEspecial = (texto) => texto.replace(/\s/g, ' ');

test('começa com dois cartões no máximo de parcelas e sem valor', () => {
  expect(divisaoInicial(24)).toEqual([
    { forma: 'cartao', parcelas: 24, valor: null },
    { forma: 'cartao', parcelas: 24 },
  ]);
});

test('o restante do pedido vai sozinho para a 2ª forma', () => {
  const { partes, totalAPagar, desconto, erro } = calcularDivisao(3800, [
    { forma: 'cartao', parcelas: 10, valor: 1500 },
    { forma: 'cartao', parcelas: 5 },
  ]);

  expect(erro).toBeNull();
  expect(partes[0]).toMatchObject({ valor: 1500, aPagar: 1500, parcelas: 10, valorParcela: 150 });
  expect(partes[1]).toMatchObject({ valor: 2300, aPagar: 2300, parcelas: 5, valorParcela: 460 });
  expect(totalAPagar).toBe(3800);
  expect(desconto).toBe(0);
});

test('o desconto do Pix vale só para a parte do Pix', () => {
  const { partes, totalAPagar, desconto } = calcularDivisao(2500, [
    { forma: 'pix', parcelas: 12, valor: 1000 },
    { forma: 'boleto', parcelas: 3 },
  ]);

  expect(partes[0]).toMatchObject({ valor: 1000, desconto: 50, aPagar: 950, parcelas: 1 });
  expect(partes[1]).toMatchObject({ valor: 1500, desconto: 0, aPagar: 1500, parcelas: 3 });
  expect(desconto).toBe(50);
  expect(totalAPagar).toBe(2450);
});

test('parcelas vazias contam como à vista', () => {
  const { partes } = calcularDivisao(100, [
    { forma: 'cartao', parcelas: undefined, valor: 40 },
    { forma: 'boleto', parcelas: 0 },
  ]);
  expect(partes.map((p) => p.parcelas)).toEqual([1, 1]);
});

test('avisa quando o valor da 1ª forma não serve', () => {
  const partes = (valor) => [{ forma: 'cartao', parcelas: 1, valor }, { forma: 'cartao', parcelas: 1 }];

  expect(calcularDivisao(3800, partes(null)).erro).toBe('Digite quanto vai na 1ª forma de pagamento.');
  expect(calcularDivisao(3800, partes('')).erro).toBe('Digite quanto vai na 1ª forma de pagamento.');
  expect(calcularDivisao(3800, partes(0)).erro).toBe('O valor da 1ª forma precisa ser maior que zero.');
  expect(semEspacoEspecial(calcularDivisao(3800, partes(3800)).erro)).toBe(
    'O valor da 1ª forma precisa ser menor que o total do pedido (R$ 3.800,00).'
  );
  // Com erro, a 2ª forma fica zerada
  expect(calcularDivisao(3800, partes(5000)).partes[1].valor).toBe(0);
});

test('descreve as duas formas e monta o que vai para o servidor', () => {
  const { partes } = calcularDivisao(2500, [
    { forma: 'pix', parcelas: 12, valor: 1000 },
    { forma: 'cartao', parcelas: 3 },
  ]);

  expect(semEspacoEspecial(descreverDivisao(partes))).toBe(
    'Pix à vista (R$ 950,00) + Cartão de crédito · 3x (R$ 1.500,00)'
  );
  expect(partesParaEnvio(partes)).toEqual([
    { forma: 'pix', parcelas: 1, valor: 1000 },
    { forma: 'cartao', parcelas: 3, valor: 1500 },
  ]);
});
