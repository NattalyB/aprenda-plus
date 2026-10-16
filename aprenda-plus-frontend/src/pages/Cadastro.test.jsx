import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import Cadastro from './Cadastro';
import { renderizar } from '../testUtils';
import { cadastrarAlunoComDocumento } from '../services/alunoService';
import { mostrarAviso } from '../services/avisoService';
import { buscarEnderecoPorCep } from '../services/cepService';

jest.mock('../services/alunoService');
jest.mock('../services/avisoService');
// A consulta ao ViaCEP é simulada: nenhum teste acessa a internet
jest.mock('../services/cepService', () => ({
  ...jest.requireActual('../services/cepService'),
  buscarEnderecoPorCep: jest.fn(),
}));

const dados = {
  'Nome completo': 'Maria Silva',
  'E-mail': 'maria@teste.com',
  Telefone: '(51) 99999-9999',
  'Data de nascimento': '2000-05-10',
  CPF: '12345678900',
  'Rua/Av': 'Av. Brasil',
  'Número': '100',
  'Complemento (opcional)': 'Apto 2',
  CEP: '92000-000',
  Bairro: 'Centro',
  Cidade: 'Canoas',
  UF: 'RS',
  Senha: 'senha123',
  'Confirmar senha': 'senha123',
};

const pdf = () => new File(['%PDF-1.4'], 'certificado.pdf', { type: 'application/pdf' });

const anexar = (arquivo) => {
  fireEvent.change(screen.getByLabelText(/Certificado de conclusão/), { target: { files: [arquivo] } });
};

const preencherEEnviar = (arquivo = pdf()) => {
  Object.entries(dados).forEach(([campo, valor]) => {
    fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });
  });
  if (arquivo) anexar(arquivo);
  fireEvent.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  buscarEnderecoPorCep.mockResolvedValue(null);
});

test('cadastro completo envia todos os dados e vai pro login', async () => {
  cadastrarAlunoComDocumento.mockResolvedValue({ data: { idAluno: 1 } });
  renderizar(<Cadastro />, { rota: '/cadastro' });

  preencherEEnviar();

  await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent('/login'));
  expect(cadastrarAlunoComDocumento).toHaveBeenCalledWith(
    expect.objectContaining({
      nomeCompleto: 'Maria Silva',
      email: 'maria@teste.com',
      cpf: '12345678900',
      complemento: 'Apto 2',
      estado: 'RS',
      senhaHash: 'senha123',
    }),
    expect.objectContaining({ name: 'certificado.pdf' })
  );
  expect(mostrarAviso).toHaveBeenCalledWith(expect.stringContaining('enviado para análise'), 'sucesso');
});

test('todos os campos são obrigatórios, menos o complemento', () => {
  renderizar(<Cadastro />);

  Object.keys(dados).forEach((campo) => {
    const elemento = screen.getByLabelText(campo);
    if (campo === 'Complemento (opcional)') {
      expect(elemento).not.toBeRequired();
    } else {
      expect(elemento).toBeRequired();
    }
  });
});

test.each([
  [{ response: { status: 400 } }, 'Verifique os dados preenchidos.'],
  [{ response: { status: 400, data: { mensagem: 'Envie o documento em PDF, JPG ou PNG.' } } }, 'Envie o documento em PDF, JPG ou PNG.'],
  [{ response: { status: 413 } }, 'O arquivo pode ter no máximo 5 MB.'],
  [{ response: { status: 409 } }, 'E-mail ou CPF já cadastrado.'],
  [{ response: { status: 500, data: { message: 'violates unique constraint' } } }, 'E-mail ou CPF já cadastrado.'],
  [new Error('Network Error'), 'Não foi possível concluir o cadastro. Tente novamente.'],
])('erro do servidor mostra a mensagem certa', async (erro, mensagem) => {
  cadastrarAlunoComDocumento.mockRejectedValue(erro);
  renderizar(<Cadastro />, { rota: '/cadastro' });

  preencherEEnviar();

  expect(await screen.findByText(mensagem)).toBeInTheDocument();
  expect(screen.getByTestId('endereco')).toHaveTextContent('/cadastro');
});

test('ao digitar o CEP, o endereço é preenchido e continua editável', async () => {
  buscarEnderecoPorCep.mockResolvedValue({ rua: 'Rua Araçá', bairro: 'Igara', cidade: 'Canoas', estado: 'RS' });
  renderizar(<Cadastro />);

  fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '92035540' } });

  await waitFor(() => expect(screen.getByLabelText('Rua/Av')).toHaveValue('Rua Araçá'));
  expect(screen.getByLabelText('UF')).toHaveValue('RS');

  fireEvent.change(screen.getByLabelText('Bairro'), { target: { value: 'Igara II' } });
  expect(screen.getByLabelText('Bairro')).toHaveValue('Igara II');
});

describe('certificado de conclusão', () => {
  test('sem o anexo, nem envia e explica o que falta', async () => {
    renderizar(<Cadastro />);
    preencherEEnviar(null);

    expect(screen.getByText('Anexe o certificado de conclusão (PDF, JPG ou PNG).')).toBeInTheDocument();
    expect(cadastrarAlunoComDocumento).not.toHaveBeenCalled();
    await act(async () => {}); // deixa a busca do CEP terminar
  });

  test('arquivo de outro tipo é recusado antes de enviar', async () => {
    renderizar(<Cadastro />);
    preencherEEnviar(new File(['x'], 'certificado.docx'));

    expect(screen.getByText('Envie o documento em PDF, JPG ou PNG.')).toBeInTheDocument();
    expect(cadastrarAlunoComDocumento).not.toHaveBeenCalled();
    await act(async () => {}); // deixa a busca do CEP terminar
  });

  test('arquivo com mais de 5 MB é recusado antes de enviar', async () => {
    renderizar(<Cadastro />);
    const grande = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(grande, 'size', { value: 6 * 1024 * 1024 });
    preencherEEnviar(grande);

    expect(screen.getByText('O arquivo pode ter no máximo 5 MB.')).toBeInTheDocument();
    await act(async () => {});
  });

  test('mostra o nome do arquivo escolhido e aceita arrastar', () => {
    renderizar(<Cadastro />);
    anexar(pdf());
    expect(screen.getByText(/certificado\.pdf/)).toBeInTheDocument();

    const foto = new File(['img'], 'foto.png', { type: 'image/png' });
    const area = screen.getByTestId('certificado-area');
    fireEvent.dragOver(area);
    expect(area).toHaveClass('arrastando');
    fireEvent.dragLeave(area);
    expect(area).not.toHaveClass('arrastando');
    fireEvent.drop(area, { dataTransfer: { files: [foto] } });
    expect(screen.getByText(/foto\.png/)).toBeInTheDocument();
    expect(area).toHaveClass('com-arquivo');
  });

  test('escolher e cancelar a janela de arquivos não apaga o anexo', () => {
    renderizar(<Cadastro />);
    anexar(pdf());
    fireEvent.change(screen.getByLabelText(/Certificado de conclusão/), { target: { files: [] } });
    expect(screen.getByText(/certificado\.pdf/)).toBeInTheDocument();
  });
});

describe('senha', () => {
  const preencher = (senha, confirmar) => {
    Object.entries({ ...dados, Senha: senha, 'Confirmar senha': confirmar }).forEach(([campo, valor]) => {
      fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } });
    });
    anexar(pdf());
  };

  test('as duas senhas precisam ser iguais', async () => {
    renderizar(<Cadastro />);
    preencher('senha123', 'senha124');

    expect(screen.getByText('As senhas ainda não são iguais')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));
    expect(screen.getByText('As senhas digitadas não são iguais.')).toBeInTheDocument();
    expect(cadastrarAlunoComDocumento).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    expect(screen.getByText('✓ As senhas são iguais')).toBeInTheDocument();
    await act(async () => {});
  });

  test('senha curta é recusada antes de enviar', async () => {
    renderizar(<Cadastro />);
    preencher('123', '123');
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR CONTA' }));
    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
    expect(cadastrarAlunoComDocumento).not.toHaveBeenCalled();
    await act(async () => {});
  });

  test('o olho mostra e esconde a senha', () => {
    renderizar(<Cadastro />);
    const senha = screen.getByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');

    const [olho] = screen.getAllByRole('button', { name: 'Mostrar senha' });
    fireEvent.click(olho);
    expect(senha).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(senha).toHaveAttribute('type', 'password');
  });

  test('CPF e telefone com máscara vão só com o que o servidor espera', async () => {
    cadastrarAlunoComDocumento.mockResolvedValue({ data: { idAluno: 1 } });
    renderizar(<Cadastro />, { rota: '/cadastro' });
    preencherEEnviar();

    await waitFor(() => expect(cadastrarAlunoComDocumento).toHaveBeenCalled());
    expect(screen.getByLabelText('CPF')).toHaveValue('123.456.789-00');
    const [enviado] = cadastrarAlunoComDocumento.mock.calls[0];
    expect(enviado.cpf).toBe('12345678900');
    expect(enviado.telefone).toBe('(51) 99999-9999');
  });
});
