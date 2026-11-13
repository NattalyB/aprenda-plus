import { screen } from '@testing-library/react';
import Privacidade from './Privacidade';
import { renderizar } from '../testUtils';

test('explica os dados, o uso, o compartilhamento e como exercer os direitos', () => {
  renderizar(<Privacidade />, { rota: '/privacidade' });

  expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument();
  ['1. Quais dados coletamos', '2. Para que usamos', '4. Com quem compartilhamos', '7. Seus direitos'].forEach((titulo) =>
    expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument()
  );
  expect(screen.getByText(/apenas o nome e o e-mail da sua conta Google/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'aprendaplus@gmail.com' })).toHaveAttribute('href', 'mailto:aprendaplus@gmail.com');
  expect(screen.getByRole('link', { name: '← Voltar ao início' })).toHaveAttribute('href', '/');
});
