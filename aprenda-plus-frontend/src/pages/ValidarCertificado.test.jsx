import { screen, fireEvent } from '@testing-library/react';
import ValidarCertificado from './ValidarCertificado';
import { renderizar } from '../testUtils';
import { validarCertificado } from '../services/salaService';

jest.mock('../services/salaService');

const abrir = (rota = '/certificado') =>
  renderizar(<ValidarCertificado />, { rota, caminho: rota === '/certificado' ? '/certificado' : '/certificado/:codigo' });

beforeEach(() => jest.clearAllMocks());

test('digitar o código leva para a conferência', () => {
  abrir();
  fireEvent.change(screen.getByLabelText('Código do certificado'), { target: { value: ' abcd-efgh ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
  expect(screen.getByTestId('endereco')).toHaveTextContent('/certificado/ABCD-EFGH');
});

test('código vazio não faz nada', () => {
  abrir();
  fireEvent.click(screen.getByRole('button', { name: 'Conferir' }));
  expect(screen.getByTestId('endereco')).toHaveTextContent('/certificado');
  expect(validarCertificado).not.toHaveBeenCalled();
});

test('certificado verdadeiro mostra os dados', async () => {
  validarCertificado.mockResolvedValue({
    codigo: 'K7QM', aluno: 'Lucas Almeida', curso: 'Administração', turma: 'Turma ADM-B', cargaHoraria: 360, emitidoEm: '2026-10-13T21:30:00',
  });
  abrir('/certificado/K7QM');

  expect(await screen.findByText('✅ Certificado válido')).toBeInTheDocument();
  expect(validarCertificado).toHaveBeenCalledWith('K7QM');
  expect(screen.getByLabelText('Código do certificado')).toHaveValue('K7QM');
  expect(screen.getByText('Lucas Almeida')).toBeInTheDocument();
  expect(screen.getByText('360 horas')).toBeInTheDocument();
  expect(screen.getByText('13 de outubro de 2026')).toBeInTheDocument();
});

test('certificado sem curso nem carga horária', async () => {
  validarCertificado.mockResolvedValue({ codigo: 'K7QM', aluno: 'Lucas', curso: null, turma: null, cargaHoraria: null, emitidoEm: null });
  abrir('/certificado/K7QM');
  expect(await screen.findByText('✅ Certificado válido')).toBeInTheDocument();
  expect(screen.getAllByText('-')).toHaveLength(2);
  expect(screen.queryByText('Carga horária')).not.toBeInTheDocument();
});

test.each([
  [{ response: { status: 404, data: { mensagem: 'Certificado não encontrado. Confira o código.' } } }, 'Certificado não encontrado. Confira o código.'],
  [{ response: { status: 404 } }, 'Certificado não encontrado. Confira o código.'],
  [new Error('rede'), 'Não foi possível conferir agora. Tente novamente.'],
])('código que não confere (%#)', async (erro, mensagem) => {
  validarCertificado.mockRejectedValue(erro);
  abrir('/certificado/XXXX');
  expect(await screen.findByText('❌ Não encontramos este certificado')).toBeInTheDocument();
  expect(screen.getByText(mensagem)).toBeInTheDocument();
});
