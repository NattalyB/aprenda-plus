import { fireEvent, render, screen } from '@testing-library/react';
import PularConteudo from './PularConteudo';

test('leva o foco ao conteúdo sem mudar o endereço', () => {
  render(
    <>
      <PularConteudo alvo="conteudo" />
      <div id="conteudo" tabIndex={-1}>Página</div>
    </>
  );
  const link = screen.getByRole('link', { name: 'Pular para o conteúdo' });
  const antes = window.location.hash;
  fireEvent.click(link);
  expect(screen.getByText('Página')).toHaveFocus();
  expect(window.location.hash).toBe(antes);
});

test('sem o destino na página não quebra', () => {
  render(<PularConteudo alvo="nao-existe" />);
  expect(() => fireEvent.click(screen.getByRole('link', { name: 'Pular para o conteúdo' }))).not.toThrow();
});
