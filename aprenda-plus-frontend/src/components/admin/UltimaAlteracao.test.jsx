import { render, screen, waitFor } from '@testing-library/react';
import UltimaAlteracao from './UltimaAlteracao';
import { ultimaAlteracao } from '../../services/atividadeService';

jest.mock('../../services/atividadeService');

beforeEach(() => jest.clearAllMocks());

test('mostra quem cadastrou e quem alterou por último', async () => {
  ultimaAlteracao.mockResolvedValue({
    criadoPor: 'Ana Souza',
    criadoEm: '2026-10-20T09:00:00',
    alteradoPor: 'Carla Nascimento',
    alteradoEm: '2026-10-27T18:45:00',
  });
  render(<UltimaAlteracao alvo="alunos" id="12" />);

  expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
  expect(screen.getByText('Carla Nascimento')).toBeInTheDocument();
  expect(screen.getByText(/em 27\/10\/2026 às 18:45/)).toBeInTheDocument();
  expect(screen.getByText('·')).toBeInTheDocument();
  expect(ultimaAlteracao).toHaveBeenCalledWith('alunos', '12');
});

test('só cadastrado, só alterado, sem histórico e com erro', async () => {
  ultimaAlteracao.mockResolvedValueOnce({ criadoPor: 'Ana', criadoEm: '2026-10-20T09:00:00' });
  const { unmount } = render(<UltimaAlteracao alvo="cursos" id={1} />);
  expect(await screen.findByText(/Cadastrado por/)).toBeInTheDocument();
  expect(screen.queryByText(/Última alteração/)).not.toBeInTheDocument();
  unmount();

  ultimaAlteracao.mockResolvedValueOnce({ alteradoPor: 'Carla', alteradoEm: '2026-10-27T18:45:00' });
  const segundo = render(<UltimaAlteracao alvo="cursos" id={2} />);
  expect(await screen.findByText(/Última alteração por/)).toBeInTheDocument();
  expect(screen.queryByText(/Cadastrado por/)).not.toBeInTheDocument();
  segundo.unmount();

  ultimaAlteracao.mockResolvedValueOnce({});
  const { container, unmount: fechar } = render(<UltimaAlteracao alvo="cursos" id={3} />);
  await waitFor(() => expect(ultimaAlteracao).toHaveBeenCalledTimes(3));
  expect(container).toBeEmptyDOMElement();
  fechar();

  ultimaAlteracao.mockRejectedValueOnce(new Error('x'));
  const comErro = render(<UltimaAlteracao alvo="cursos" id={4} />);
  await waitFor(() => expect(ultimaAlteracao).toHaveBeenCalledTimes(4));
  expect(comErro.container).toBeEmptyDOMElement();
});

test('sem id não consulta', () => {
  const { container } = render(<UltimaAlteracao alvo="cursos" />);
  expect(ultimaAlteracao).not.toHaveBeenCalled();
  expect(container).toBeEmptyDOMElement();
});

test('desmontar antes da resposta não atualiza a tela', async () => {
  let responder;
  let falhar;
  ultimaAlteracao
    .mockReturnValueOnce(new Promise((r) => (responder = r)))
    .mockReturnValueOnce(new Promise((_, f) => (falhar = f)));
  const a = render(<UltimaAlteracao alvo="cursos" id={5} />);
  a.unmount();
  responder({ criadoPor: 'Ana' });
  const b = render(<UltimaAlteracao alvo="cursos" id={6} />);
  b.unmount();
  falhar(new Error('x'));
  await Promise.resolve();
  expect(ultimaAlteracao).toHaveBeenCalledTimes(2);
});
