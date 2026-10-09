import { render, screen } from '@testing-library/react';
import Footer from './Footer';

test('rodapé mostra contato e créditos', () => {
  render(<Footer />);

  expect(screen.getByText('FALE CONOSCO')).toBeInTheDocument();
  expect(screen.getByText(/aprendaplus@gmail.com/)).toBeInTheDocument();
  expect(screen.getByText('Alunos +Pra TI')).toBeInTheDocument();
  expect(screen.getByAltText('Aprenda Plus')).toBeInTheDocument();
});
