import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormNovoChamado from './FormNovoChamado';
import { abrirChamado } from '../../services/chamadoService';

jest.mock('../../services/chamadoService', () => ({ abrirChamado: jest.fn() }));

const preencher = (rotulo, valor) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

beforeEach(() => jest.clearAllMocks());

test('abre o chamado com a tela de onde a pessoa veio e o print', async () => {
  abrirChamado.mockResolvedValue({ idChamado: 7 });
  const onCriado = jest.fn();
  render(<FormNovoChamado perfil="professor" telaInicial="Financeiro" onCriado={onCriado} onCancelar={jest.fn()} />);

  expect(screen.getByLabelText('Onde aconteceu? (tela)')).toHaveValue('Financeiro');
  preencher('Assunto *', 'Erro ao salvar');
  preencher('Categoria', 'acesso');
  preencher('Prioridade', 'urgente');
  preencher('Descrição do problema *', 'Aparece erro 500');
  const print = new File(['x'], 'print.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText(/Anexar print ou PDF/), { target: { files: [print] } });
  expect(screen.getByText(/print.png/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));
  expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  await waitFor(() => expect(onCriado).toHaveBeenCalledWith({ idChamado: 7 }));
  expect(abrirChamado).toHaveBeenCalledWith('professor', {
    assunto: 'Erro ao salvar', categoria: 'acesso', prioridade: 'urgente', descricao: 'Aparece erro 500', tela: 'Financeiro',
  }, print);
});

test('confere os campos e o anexo antes de enviar', () => {
  render(<FormNovoChamado perfil="funcionario" onCriado={jest.fn()} onCancelar={jest.fn()} />);
  const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));

  enviar();
  expect(screen.getByRole('alert')).toHaveTextContent('Informe o assunto do chamado.');
  preencher('Assunto *', 'A');
  enviar();
  expect(screen.getByRole('alert')).toHaveTextContent('Descreva o problema.');
  preencher('Descrição do problema *', 'B');
  fireEvent.change(screen.getByLabelText(/Anexar print ou PDF/), {
    target: { files: [new File(['x'], 'a.zip', { type: 'application/zip' })] },
  });
  enviar();
  expect(screen.getByRole('alert')).toHaveTextContent('Anexe um print (PNG ou JPG) ou um PDF.');
  fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
  expect(screen.queryByText(/a.zip/)).not.toBeInTheDocument();
  expect(abrirChamado).not.toHaveBeenCalled();
});

test('mostra o erro do servidor e permite cancelar', async () => {
  abrirChamado.mockRejectedValueOnce({ response: { data: { mensagem: 'Categoria inválida.' } } });
  abrirChamado.mockRejectedValueOnce(new Error('offline'));
  const onCancelar = jest.fn();
  render(<FormNovoChamado perfil="funcionario" onCriado={jest.fn()} onCancelar={onCancelar} />);
  preencher('Assunto *', 'A');
  preencher('Descrição do problema *', 'B');

  fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));
  expect(await screen.findByText('Categoria inválida.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));
  expect(await screen.findByText('Não foi possível abrir o chamado. Tente de novo.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(onCancelar).toHaveBeenCalled();
});
