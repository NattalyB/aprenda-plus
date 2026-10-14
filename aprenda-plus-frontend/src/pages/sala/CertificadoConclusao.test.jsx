import { screen, fireEvent } from '@testing-library/react';
import CertificadoConclusao, { linkDeValidacao } from './CertificadoConclusao';
import { renderizar, logarAluno } from '../../testUtils';
import { emitirCertificado } from '../../services/salaService';

jest.mock('../../services/salaService');

const certificado = (dados = {}) => ({
  codigo: 'K7QM-4XHT-9RWA',
  aluno: 'Lucas Almeida',
  curso: 'Administração',
  turma: 'Turma ADM-B',
  cargaHoraria: 360,
  professor: 'Carla Mendes',
  emitidoEm: '2026-10-13T21:30:00',
  ...dados,
});

const abrir = () => renderizar(<CertificadoConclusao />, { rota: '/sala/3/certificado', caminho: '/sala/:idTurma/certificado' });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('mostra o certificado com os dados, o código e o link de validação', async () => {
  logarAluno();
  emitirCertificado.mockResolvedValue(certificado());
  abrir();

  expect(await screen.findByRole('heading', { name: 'Lucas Almeida' })).toBeInTheDocument();
  expect(emitirCertificado).toHaveBeenCalledWith('3');
  const texto = screen.getByRole('article', { name: 'Certificado de conclusão' });
  expect(texto).toHaveTextContent('concluiu o curso Administração (Turma ADM-B), com carga horária de 360 horas');
  expect(texto).toHaveTextContent('Emitido em 13 de outubro de 2026');
  expect(texto).toHaveTextContent('Carla Mendes');
  expect(texto).toHaveTextContent('K7QM-4XHT-9RWA');
  expect(texto).toHaveTextContent('#/certificado/K7QM-4XHT-9RWA');
  expect(screen.getByRole('link', { name: '← Voltar para a sala' })).toHaveAttribute('href', '/sala/3');
});

test('botão de imprimir abre a impressão do navegador', async () => {
  logarAluno();
  emitirCertificado.mockResolvedValue(certificado({ curso: null, cargaHoraria: null, professor: null }));
  window.print = jest.fn();
  abrir();

  fireEvent.click(await screen.findByRole('button', { name: /Imprimir ou salvar em PDF/ }));
  expect(window.print).toHaveBeenCalled();
  expect(screen.getByRole('article')).toHaveTextContent('concluiu o curso Turma ADM-B, na modalidade');
  expect(screen.queryByText('Professor(a) responsável')).not.toBeInTheDocument();
});

test('ainda com aulas pendentes mostra o motivo', async () => {
  logarAluno();
  emitirCertificado.mockRejectedValueOnce({ response: { data: { mensagem: 'Conclua todas as aulas (1 de 3).' } } });
  abrir();
  expect(await screen.findByText('Conclua todas as aulas (1 de 3).')).toBeInTheDocument();
});

test('erro genérico e sem login', async () => {
  logarAluno();
  emitirCertificado.mockRejectedValueOnce(new Error('x'));
  const { unmount } = abrir();
  expect(await screen.findByText('Não foi possível emitir o certificado.')).toBeInTheDocument();
  unmount();

  localStorage.clear();
  abrir();
  expect(screen.getByText('Faça login para ver o seu certificado.')).toBeInTheDocument();
});

test('link de validação usa o endereço atual do site', () => {
  expect(linkDeValidacao('ABC')).toBe(`${window.location.origin}${window.location.pathname}#/certificado/ABC`);
});
