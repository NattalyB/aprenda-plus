import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CampoCpf, CampoTelefone, formatarTelefone } from './CamposFormatados';

function Formulario({ inicial = {}, aoMudar }) {
  const [form, setForm] = useState({ cpf: '', telefone: '', ...inicial });
  const mudar = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    aoMudar?.(e.target.name, e.target.value);
  };
  return (
    <>
      <label htmlFor="cpf">CPF</label>
      <CampoCpf value={form.cpf} onChange={mudar} required />
      <label htmlFor="telefone">Telefone</label>
      <CampoTelefone value={form.telefone} onChange={mudar} />
      <output data-testid="valores">{`${form.cpf}|${form.telefone}`}</output>
    </>
  );
}

test('CPF aparece com pontos e traço, mas fica só com os números', () => {
  render(<Formulario />);
  fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '12345678900' } });
  expect(screen.getByLabelText('CPF')).toHaveValue('123.456.789-00');
  expect(screen.getByTestId('valores')).toHaveTextContent('12345678900|');
  expect(screen.getByLabelText('CPF')).toBeRequired();
});

test('CPF que já veio do banco aparece formatado', () => {
  render(<Formulario inicial={{ cpf: '98765432100' }} />);
  expect(screen.getByLabelText('CPF')).toHaveValue('987.654.321-00');
});

test('telefone celular e fixo', () => {
  const aoMudar = jest.fn();
  render(<Formulario aoMudar={aoMudar} />);
  const campo = screen.getByLabelText('Telefone');

  fireEvent.change(campo, { target: { value: '51999998888' } });
  expect(campo).toHaveValue('(51) 99999-8888');
  expect(aoMudar).toHaveBeenLastCalledWith('telefone', '(51) 99999-8888');

  fireEvent.change(campo, { target: { value: '5133334444' } });
  expect(campo).toHaveValue('(51) 3333-4444');
  expect(aoMudar).toHaveBeenLastCalledWith('telefone', '(51) 3333-4444');

  fireEvent.change(campo, { target: { value: '' } });
  expect(aoMudar).toHaveBeenLastCalledWith('telefone', '');
});

test('telefone já formatado do banco continua igual', () => {
  render(<Formulario inicial={{ telefone: '(51) 99999-9999' }} />);
  expect(screen.getByLabelText('Telefone')).toHaveValue('(51) 99999-9999');
});

test.each([
  ['', ''],
  ['5', '(5'],
  ['513', '(51) 3'],
  ['5133334', '(51) 3333-4'],
  ['51999998888', '(51) 99999-8888'],
  ['519999988887777', '(51) 99999-8888'],
  [null, ''],
])('formatarTelefone(%p) = %p', (entrada, saida) => {
  expect(formatarTelefone(entrada)).toBe(saida);
});
