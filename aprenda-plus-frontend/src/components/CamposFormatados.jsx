import { NumberFormatBase, PatternFormat } from 'react-number-format';

// Campos com máscara (biblioteca react-number-format).
// Os dois avisam a mudança como um input comum: onChange({ target: { name, value } }).

const somenteDigitos = (texto) => String(texto || '').replace(/\D/g, '');

// CPF: mostra 000.000.000-00, mas guarda só os 11 números (é o que o servidor espera)
export function CampoCpf({ id = 'cpf', name = 'cpf', value, onChange, required = false }) {
  return (
    <PatternFormat
      id={id}
      name={name}
      format="###.###.###-##"
      valueIsNumericString
      value={somenteDigitos(value)}
      onValueChange={(valores, origem) => {
        if (origem.source === 'event') onChange({ target: { name, value: valores.value } });
      }}
      placeholder="000.000.000-00"
      inputMode="numeric"
      required={required}
    />
  );
}

// "51999998888" -> "(51) 99999-8888"; "5133334444" -> "(51) 3333-4444" (também formata enquanto digita)
export const formatarTelefone = (numeros) => {
  const d = somenteDigitos(numeros).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const meio = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
};

// Telefone: fixo ou celular, a máscara se ajusta sozinha. Guarda já formatado, como os cadastros que já existem.
export function CampoTelefone({ id = 'telefone', name = 'telefone', value, onChange, required = false }) {
  return (
    <NumberFormatBase
      id={id}
      name={name}
      format={formatarTelefone}
      removeFormatting={(texto) => somenteDigitos(texto).slice(0, 11)}
      valueIsNumericString
      value={somenteDigitos(value).slice(0, 11)}
      onValueChange={(valores, origem) => {
        if (origem.source === 'event') onChange({ target: { name, value: formatarTelefone(valores.value) } });
      }}
      placeholder="(51) 99999-9999"
      inputMode="tel"
      required={required}
    />
  );
}
