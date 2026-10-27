import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import AdminTreinamentos from './AdminTreinamentos';
import {
  listarTreinamentos,
  criarTreinamento,
  atualizarTreinamento,
  excluirTreinamento,
  baixarPdfDoTreinamento,
  conferirPdf,
} from '../../services/treinamentoService';
import { ultimaAlteracao } from '../../services/atividadeService';

jest.mock('../../services/treinamentoService', () => ({
  ...jest.requireActual('../../services/treinamentoService'),
  listarTreinamentos: jest.fn(),
  criarTreinamento: jest.fn(),
  atualizarTreinamento: jest.fn(),
  excluirTreinamento: jest.fn(),
  baixarPdfDoTreinamento: jest.fn(),
}));
jest.mock('../../services/atividadeService');

const treinamentos = [
  {
    idTreinamento: 1,
    titulo: 'Como cadastrar um aluno',
    descricao: 'Passo a passo do cadastro',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    temPdf: true,
    pdfNome: 'manual-alunos.pdf',
    pdfTamanho: 2048,
    ordem: 1,
  },
  { idTreinamento: 2, titulo: 'Financeiro', descricao: null, videoUrl: null, temPdf: true, pdfNome: 'financeiro.pdf', pdfTamanho: 10 },
];

const montar = (acesso = { master: true, modulos: [] }) =>
  render(
    <MemoryRouter initialEntries={['/admin/treinamentos']}>
      <Routes>
        <Route path="/admin" element={<Outlet context={{ acesso }} />}>
          <Route path="treinamentos" element={<AdminTreinamentos />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

const pdf = (nome = 'manual.pdf', tamanho = 100) => {
  const arquivo = new File(['%PDF'], nome, { type: 'application/pdf' });
  Object.defineProperty(arquivo, 'size', { value: tamanho });
  return arquivo;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  listarTreinamentos.mockResolvedValue(treinamentos);
  ultimaAlteracao.mockResolvedValue({});
  URL.createObjectURL = jest.fn(() => 'blob:pdf');
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => window.confirm.mockRestore());

test('a equipe assiste, busca e abre o PDF, sem botões de edição', async () => {
  baixarPdfDoTreinamento.mockResolvedValue({ data: new Blob(['%PDF']) });
  montar({ master: false, modulos: ['alunos'] });

  expect(screen.getByText('Carregando treinamentos...')).toBeInTheDocument();
  expect(await screen.findByText('Como cadastrar um aluno')).toBeInTheDocument();
  expect(screen.getByTitle('Vídeo: Como cadastrar um aluno')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'
  );
  expect(screen.queryByRole('button', { name: '+ Novo treinamento' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  expect(ultimaAlteracao).not.toHaveBeenCalled();
  expect(screen.getByText('2 de 2 treinamentos')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Buscar treinamento'), { target: { value: 'financeíro' } });
  expect(screen.queryByText('Como cadastrar um aluno')).not.toBeInTheDocument();
  expect(screen.getByText('1 de 2 treinamentos')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar treinamento'), { target: { value: 'zzz' } });
  expect(screen.getByText('Nenhum treinamento encontrado para "zzz".')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar treinamento'), { target: { value: 'passo a passo' } });
  expect(screen.getByText('Como cadastrar um aluno')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '📄 Abrir manual em PDF' }));
  const janela = await screen.findByRole('dialog', { name: 'Documento manual-alunos.pdf' });
  await waitFor(() => expect(janela.querySelector('iframe')).toHaveAttribute('src', 'blob:pdf'));
  expect(baixarPdfDoTreinamento).toHaveBeenCalledWith(1);
  fireEvent.click(within(janela).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('lista vazia e erro ao carregar', async () => {
  listarTreinamentos.mockResolvedValueOnce([]);
  const { unmount } = montar({ master: false, modulos: [] });
  expect(await screen.findByText('Nenhum treinamento disponível ainda.')).toBeInTheDocument();
  unmount();

  listarTreinamentos.mockResolvedValueOnce(null);
  const segundo = montar();
  expect(await screen.findByText(/Nenhum treinamento ainda. Clique em/)).toBeInTheDocument();
  segundo.unmount();

  listarTreinamentos.mockRejectedValueOnce(new Error('x'));
  montar();
  expect(await screen.findByText('Não foi possível carregar os treinamentos.')).toBeInTheDocument();
});

test('Master cadastra um treinamento com vídeo e PDF, validando antes', async () => {
  criarTreinamento.mockRejectedValueOnce({ response: { data: { mensagem: 'Erro do servidor' } } }).mockResolvedValueOnce({});
  montar();
  await screen.findByText('Como cadastrar um aluno');
  expect(ultimaAlteracao).toHaveBeenCalledWith('treinamentos', 1);

  fireEvent.click(screen.getByRole('button', { name: '+ Novo treinamento' }));
  const form = screen.getByRole('dialog', { name: 'Novo treinamento' });
  const salvar = () => fireEvent.click(within(form).getByRole('button', { name: 'Salvar treinamento' }));

  salvar();
  expect(within(form).getByText('Informe o título do treinamento.')).toBeInTheDocument();

  fireEvent.change(within(form).getByLabelText('Título'), { target: { value: '  Matrículas  ' } });
  salvar();
  expect(within(form).getByText('Coloque o link de um vídeo do YouTube, anexe um PDF, ou os dois.')).toBeInTheDocument();

  fireEvent.change(within(form).getByLabelText('Link do vídeo no YouTube'), { target: { value: 'https://vimeo.com/1' } });
  expect(within(form).getByText('Esse link não é de um vídeo do YouTube.')).toBeInTheDocument();
  salvar();
  expect(within(form).getByText(/Use um link de vídeo do YouTube/)).toBeInTheDocument();

  fireEvent.change(within(form).getByLabelText('Link do vídeo no YouTube'), {
    target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
  });
  expect(within(form).getByText('Vídeo reconhecido ✓')).toBeInTheDocument();

  fireEvent.change(within(form).getByLabelText('Manual em PDF (até 5 MB)'), { target: { files: [pdf('foto.png')] } });
  expect(within(form).getByText('O arquivo precisa ser um PDF.')).toBeInTheDocument();
  const manual = pdf('manual.pdf', 2048);
  fireEvent.change(within(form).getByLabelText('Manual em PDF (até 5 MB)'), { target: { files: [manual] } });
  expect(within(form).getByText(/manual.pdf \(2 KB\) ✓/)).toBeInTheDocument();
  fireEvent.change(within(form).getByLabelText('Descrição (opcional)'), { target: { value: ' Como matricular ' } });
  fireEvent.change(within(form).getByLabelText('Ordem (opcional)'), { target: { value: '3' } });

  salvar();
  expect(await within(form).findByText('Erro do servidor')).toBeInTheDocument();
  salvar();
  expect(await screen.findByText('Treinamento cadastrado.')).toBeInTheDocument();
  expect(criarTreinamento).toHaveBeenLastCalledWith(
    { titulo: 'Matrículas', descricao: 'Como matricular', videoUrl: 'https://youtu.be/dQw4w9WgXcQ', ordem: 3 },
    manual
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(listarTreinamentos).toHaveBeenCalledTimes(2);
});

test('Master edita, remove o PDF, e exclui', async () => {
  atualizarTreinamento.mockResolvedValue({});
  excluirTreinamento.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('x'));
  montar();
  await screen.findByText('Como cadastrar um aluno');

  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
  const form = screen.getByRole('dialog', { name: 'Editar treinamento' });
  expect(within(form).getByLabelText('Título')).toHaveValue('Como cadastrar um aluno');
  expect(within(form).getByText(/manual-alunos.pdf \(2 KB\)/)).toBeInTheDocument();

  fireEvent.click(within(form).getByRole('button', { name: 'Remover PDF' }));
  expect(within(form).getByText('O PDF atual será removido ao salvar.')).toBeInTheDocument();
  fireEvent.click(within(form).getByRole('button', { name: 'Desfazer' }));
  fireEvent.click(within(form).getByRole('button', { name: 'Remover PDF' }));
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar treinamento' }));
  expect(await screen.findByText('Treinamento atualizado.')).toBeInTheDocument();
  expect(atualizarTreinamento).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ titulo: 'Como cadastrar um aluno', ordem: 1 }),
    null,
    true
  );

  // Segundo: só tem PDF; tirar o PDF sem vídeo não deixa salvar
  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
  const outro = screen.getByRole('dialog', { name: 'Editar treinamento' });
  fireEvent.click(within(outro).getByRole('button', { name: 'Remover PDF' }));
  fireEvent.click(within(outro).getByRole('button', { name: 'Salvar treinamento' }));
  expect(within(outro).getByText(/Coloque o link de um vídeo/)).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  window.confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
  expect(excluirTreinamento).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
  expect(await screen.findByText('Treinamento excluído.')).toBeInTheDocument();
  expect(excluirTreinamento).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[1]);
  expect(await screen.findByText('Não foi possível excluir o treinamento.')).toBeInTheDocument();
});

test('trocar o PDF por outro e fechar pelo botão', async () => {
  atualizarTreinamento.mockRejectedValueOnce(new Error('x'));
  montar();
  await screen.findByText('Como cadastrar um aluno');
  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
  const form = screen.getByRole('dialog', { name: 'Editar treinamento' });

  fireEvent.click(within(form).getByRole('button', { name: 'Remover PDF' }));
  const novo = pdf('novo.pdf', 500);
  fireEvent.change(within(form).getByLabelText('Manual em PDF (até 5 MB)'), { target: { files: [novo] } });
  expect(within(form).queryByText('O PDF atual será removido ao salvar.')).not.toBeInTheDocument();
  fireEvent.change(within(form).getByLabelText('Ordem (opcional)'), { target: { value: '' } });
  fireEvent.click(within(form).getByRole('button', { name: 'Salvar treinamento' }));
  expect(await within(form).findByText('Não foi possível salvar o treinamento.')).toBeInTheDocument();
  expect(atualizarTreinamento).toHaveBeenCalledWith(1, expect.objectContaining({ ordem: '' }), novo, false);

  fireEvent.change(within(form).getByLabelText('Manual em PDF (até 5 MB)'), { target: { files: [] } });
  fireEvent.click(within(form).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(conferirPdf(null)).toBeNull();
});
