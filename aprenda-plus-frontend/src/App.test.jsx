// Testa as rotas principais do sistema (qual tela abre em cada endereço)
import { render, screen } from '@testing-library/react';
import App from './App';
import { listarCursos } from './services/cursoService';
import { listarItensDoCarrinho } from './services/carrinhoService';
import { listarAlunos } from './services/alunoService';

jest.mock('./services/cursoService');
jest.mock('./services/carrinhoService');
jest.mock('./services/alunoService');

const abrir = (endereco) => {
  window.location.hash = endereco;
  return render(<App />);
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  listarCursos.mockResolvedValue({ data: [{ idCurso: 1, nome: 'Ciência de Dados', valor: 12000 }] });
  listarItensDoCarrinho.mockResolvedValue([]);
  listarAlunos.mockResolvedValue({ data: [] });
});

test('a página inicial mostra cabeçalho, cursos e rodapé', async () => {
  abrir('#/');

  expect(await screen.findByText('CURSOS MAIS VENDIDOS')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Pesquisar cursos...')).toBeInTheDocument();
  expect(screen.getByText('FALE CONOSCO')).toBeInTheDocument();
});

test.each([
  ['#/login', 'Que bom te ver de novo! Entre na sua conta.'],
  ['#/cadastro', 'Crie sua conta e comece a aprender hoje mesmo.'],
  ['#/carrinho', 'Faça login para ver seu carrinho'],
  ['#/admin/login', 'Entre com sua conta de funcionário.'],
])('o endereço %s abre a tela certa', async (endereco, texto) => {
  abrir(endereco);
  expect(await screen.findByText(texto)).toBeInTheDocument();
});

test('o painel admin sem login redireciona pro login do admin', async () => {
  abrir('#/admin/alunos');

  expect(await screen.findByText('Entre com sua conta de funcionário.')).toBeInTheDocument();
  expect(listarAlunos).not.toHaveBeenCalled();
});

test('o painel admin com login abre a tela pedida dentro do layout', async () => {
  localStorage.setItem('tokenAdmin', 'x');
  abrir('#/admin/alunos');

  expect(await screen.findByText('Alunos cadastrados')).toBeInTheDocument();
  expect(screen.getByText('PAINEL ADMIN')).toBeInTheDocument();
});
