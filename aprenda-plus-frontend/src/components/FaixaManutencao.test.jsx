import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FaixaManutencao from './FaixaManutencao';
import { listarManutencoes } from '../services/atualizacaoService';

jest.mock('../services/atualizacaoService', () => ({
  listarManutencoes: jest.fn(),
}));

// "AAAA-MM-DDTHH:mm:00" daqui a N minutos (no horário local, como o back-end manda)
const daquiA = (minutos) => {
  const d = new Date(Date.now() + minutos * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};

const programada = {
  idAtualizacao: 7, tipo: 'manutencao', titulo: 'Troca do servidor', descricao: 'Fora do ar por 30 minutos.',
  inicioManutencao: daquiA(120), fimManutencao: daquiA(150),
};
const emAndamento = {
  idAtualizacao: 8, tipo: 'manutencao', titulo: 'Ajuste no banco', descricao: '',
  inicioManutencao: daquiA(-10), fimManutencao: daquiA(20),
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('mostra as manutenções recebidas e oculta a que a pessoa fechar', () => {
  const { container } = render(<FaixaManutencao manutencoes={[programada, emAndamento]} />);

  expect(screen.getAllByRole('status')).toHaveLength(2);
  expect(screen.getByText('Manutenção em andamento:')).toBeInTheDocument();
  expect(screen.getByText('Manutenção programada:')).toBeInTheDocument();
  expect(screen.getByText(/Fora do ar por 30 minutos/)).toBeInTheDocument();
  expect(container.querySelector('.em-andamento')).toHaveTextContent('Ajuste no banco');
  expect(listarManutencoes).not.toHaveBeenCalled();

  fireEvent.click(screen.getAllByRole('button', { name: 'Ocultar aviso de manutenção' })[0]);
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(JSON.parse(localStorage.getItem('manutencoesOcultas'))).toEqual([8]);
});

test('sem manutenção pendente não mostra nada', () => {
  const concluida = { ...programada, inicioManutencao: daquiA(-60), fimManutencao: daquiA(-30) };
  const { container } = render(<FaixaManutencao manutencoes={[concluida, { idAtualizacao: 1, tipo: 'novidade' }]} />);
  expect(container).toBeEmptyDOMElement();
});

test('no Portal do Professor busca sozinha as manutenções', async () => {
  listarManutencoes.mockResolvedValue([programada]);
  render(<FaixaManutencao perfil="professor" />);

  expect(await screen.findByText(/Troca do servidor/)).toBeInTheDocument();
  expect(listarManutencoes).toHaveBeenCalledWith('professor');
});

test('ocultas ficam ocultas e erro de conexão não quebra', async () => {
  localStorage.setItem('manutencoesOcultas', JSON.stringify([7]));
  const { container, unmount } = render(<FaixaManutencao manutencoes={[programada]} />);
  expect(container).toBeEmptyDOMElement();
  unmount();

  localStorage.setItem('manutencoesOcultas', '{quebrado');
  listarManutencoes.mockRejectedValue(new Error('offline'));
  const outro = render(<FaixaManutencao />);
  await waitFor(() => expect(listarManutencoes).toHaveBeenCalled());
  expect(outro.container).toBeEmptyDOMElement();
});

test('fechar sem armazenamento esconde só até recarregar', () => {
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = () => {
    throw new Error('bloqueado');
  };
  try {
    render(<FaixaManutencao manutencoes={[programada]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar aviso de manutenção' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    Storage.prototype.setItem = original;
  }
});
