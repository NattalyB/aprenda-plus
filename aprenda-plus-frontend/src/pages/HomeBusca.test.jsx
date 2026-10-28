import { screen, fireEvent, act } from '@testing-library/react';
import Home, { ESPERA_PARA_REGISTRAR_BUSCA } from './Home';
import Header from '../components/Header';
import { renderizar } from '../testUtils';
import { listarCursos } from '../services/cursoService';
import { listarItensDoCarrinho } from '../services/carrinhoService';
import { registrarBusca } from '../services/eventoService';

jest.mock('../services/cursoService');
jest.mock('../services/carrinhoService');
jest.mock('../services/eventoService', () => ({
  ...jest.requireActual('../services/eventoService'),
  registrarBusca: jest.fn(),
  registrarCursoVisto: jest.fn(),
}));

const cursos = [
  { idCurso: 1, nome: 'Engenharia de Software', categoria: 'superior', valor: 48000 },
  { idCurso: 2, nome: 'Ciência de Dados', categoria: 'superior', valor: 12000 },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.clear();
  listarCursos.mockResolvedValue({ data: cursos });
  listarItensDoCarrinho.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

const digitar = (texto) =>
  fireEvent.change(screen.getByPlaceholderText(/pesquis|busc|curso/i), { target: { value: texto } });

test('registra a busca só quando a pessoa para de digitar, com quantos cursos achou', async () => {
  renderizar(<><Header /><Home /></>);
  await act(async () => {});
  expect(await screen.findByText('Ciência de Dados')).toBeInTheDocument();

  digitar('ci');
  digitar('cien');
  act(() => jest.advanceTimersByTime(ESPERA_PARA_REGISTRAR_BUSCA - 100));
  expect(registrarBusca).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(200));
  expect(registrarBusca).toHaveBeenCalledTimes(1);
  expect(registrarBusca).toHaveBeenCalledWith('cien', 1);

  digitar('python');
  act(() => jest.advanceTimersByTime(ESPERA_PARA_REGISTRAR_BUSCA));
  expect(registrarBusca).toHaveBeenLastCalledWith('python', 0);
});

test('termo muito curto não é registrado', async () => {
  renderizar(<><Header /><Home /></>);
  await act(async () => {});
  await screen.findByText('Ciência de Dados');

  digitar('c');
  act(() => jest.advanceTimersByTime(ESPERA_PARA_REGISTRAR_BUSCA * 2));
  expect(registrarBusca).not.toHaveBeenCalled();
});
