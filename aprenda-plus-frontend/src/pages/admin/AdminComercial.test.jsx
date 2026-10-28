import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminComercial from './AdminComercial';
import {
  buscarPainelComercial,
  listarContatosDoAluno,
  listarLeads,
  registrarContato,
} from '../../services/comercialService';
import { baixarArquivo } from '../../utils/financeiro';

jest.mock('../../services/comercialService');
jest.mock('../../utils/financeiro', () => ({
  ...jest.requireActual('../../utils/financeiro'),
  baixarArquivo: jest.fn(),
}));

const painel = (dias = 30) => ({
  de: '2026-09-29',
  ate: '2026-10-28',
  dias,
  indicadores: { visitantes: 120, cadastros: 14, inscricoes: 9, matriculas: 6, buscas: 40, buscasSemResultado: 5, conversao: 5 },
  funil: [
    { chave: 'visitaram', rotulo: 'Visitaram o site', pessoas: 120 },
    { chave: 'viram_curso', rotulo: 'Abriram um curso', pessoas: 60 },
    { chave: 'carrinho', rotulo: 'Puseram no carrinho', pessoas: 15 },
    { chave: 'inscricao', rotulo: 'Fizeram inscrição', pessoas: 9 },
    { chave: 'matricula', rotulo: 'Matricularam', pessoas: 6 },
  ],
  cursos: [
    { idCurso: 2, nome: 'Ciência de Dados', categoria: 'Tecnologia', visualizacoes: 50, pessoas: 40, visitantes: 30, alunos: 12, carrinho: 9, inscricoes: 5, conversao: 12.5 },
    { idCurso: 3, nome: 'Design Gráfico', categoria: 'Design', visualizacoes: 0, pessoas: 0, visitantes: 0, alunos: 0, carrinho: 0, inscricoes: 0, conversao: 0 },
  ],
  buscas: [
    { termo: 'dados', vezes: 12, pessoas: 10, resultados: 1, semResultado: false },
    { termo: 'python', vezes: 5, pessoas: 4, resultados: 0, semResultado: true },
  ],
  porDia: [
    { data: '2026-10-27', visitantes: 8, visualizacoes: 5, buscas: 2 },
    { data: '2026-10-28', visitantes: 4, visualizacoes: 3, buscas: 1 },
  ],
});

const leads = [
  {
    idAluno: 10, nome: 'Ana Souza', email: 'ana@teste.com', telefone: '51999990000', aceitaMarketing: true, jaEhAluno: false,
    etapa: 'inscricao_pendente', cursos: ['Análise e Desenvolvimento de Sistemas'], valor: 1200, desde: '2026-10-24T10:00:00',
    diasParado: 4, ultimoContato: null, totalContatos: 0,
  },
  {
    idAluno: 11, nome: 'Bruno Lima', email: 'bruno@teste.com', telefone: '51988880000', aceitaMarketing: false, jaEhAluno: true,
    etapa: 'carrinho', cursos: ['Ciência de Dados'], valor: 800, desde: '2026-10-26T10:00:00', diasParado: 2,
    ultimoContato: { quando: '2026-10-27T14:05:00', canal: 'whatsapp', resultado: 'interessado', funcionarioNome: 'Carla' },
    totalContatos: 1,
  },
  {
    idAluno: 12, nome: 'Carla Dias', email: 'carla@teste.com', telefone: '', aceitaMarketing: true, jaEhAluno: false,
    etapa: 'cadastro', cursos: [], valor: null, desde: '2026-10-18T10:00:00', diasParado: 10, ultimoContato: null, totalContatos: 0,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  buscarPainelComercial.mockImplementation((dias) => Promise.resolve(painel(dias)));
  listarLeads.mockResolvedValue(leads);
  listarContatosDoAluno.mockResolvedValue([]);
});

test('visão geral mostra indicadores, funil e compras para recuperar', async () => {
  render(<AdminComercial />);

  expect(await screen.findByText('Visitantes', { selector: '.financeiro-indicadores span' })).toBeInTheDocument();
  expect(screen.getByText('Visitantes', { selector: '.financeiro-indicadores span' }).closest('li')).toHaveTextContent('120');
  expect(buscarPainelComercial).toHaveBeenCalledWith(30);
  expect(screen.getByText('Conversão').closest('li')).toHaveTextContent('5%');
  expect(screen.getByLabelText('Funil de vendas')).toHaveTextContent('Abriram um curso');
  expect(screen.getByText('−50%')).toBeInTheDocument();
  expect(await screen.findByText('R$ 2.000,00', { exact: false })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Visitantes por dia' })).toBeInTheDocument();

  fireEvent.mouseEnter(screen.getByTestId('dia-2026-10-27'));
  expect(screen.getByRole('tooltip')).toHaveTextContent('8 visitante(s)');
});

test('troca o período do painel', async () => {
  render(<AdminComercial />);
  await screen.findByText('Visitantes', { selector: '.financeiro-indicadores span' });

  fireEvent.click(screen.getByRole('button', { name: 'Últimos 7 dias' }));
  await waitFor(() => expect(buscarPainelComercial).toHaveBeenLastCalledWith(7));
  expect(screen.getByRole('button', { name: 'Últimos 7 dias' })).toHaveAttribute('aria-pressed', 'true');
});

test('atalho de uma etapa abre os leads já filtrados', async () => {
  render(<AdminComercial />);
  const resumo = await screen.findByText('Carrinho abandonado', { selector: '.comercial-resumo-leads span' });

  fireEvent.click(resumo.closest('button'));

  expect(screen.getByRole('tab', { name: /Leads/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
});

test('lista os leads com filtros, WhatsApp e exportação', async () => {
  render(<AdminComercial />);
  fireEvent.click(screen.getByRole('tab', { name: /Leads/ }));

  expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
  expect(screen.getByText('3 pessoas')).toBeInTheDocument();
  expect(screen.getByText('Já é aluno')).toBeInTheDocument();
  expect(screen.getByText('Sem ofertas')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'WhatsApp de Ana Souza' })).toHaveAttribute(
    'href',
    expect.stringContaining('https://wa.me/5551999990000')
  );
  // Sem telefone, sem botão de WhatsApp
  expect(screen.queryByRole('link', { name: 'WhatsApp de Carla Dias' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Só quem aceita receber ofertas (para campanhas)'));
  expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument();
  expect(screen.getByText('2 pessoas')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Tempo parado'), { target: { value: '7' } });
  expect(screen.getByText('1 pessoa')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Exportar planilha' }));
  expect(baixarArquivo).toHaveBeenCalledWith(expect.stringMatching(/^leads-aprendaplus-\d{4}-\d{2}-\d{2}\.csv$/), expect.stringContaining('Carla Dias'));

  fireEvent.change(screen.getByLabelText('Buscar leads'), { target: { value: 'ninguem' } });
  expect(screen.getByText('Nenhum lead com esses filtros.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Exportar planilha' })).toBeDisabled();
});

test('registra um contato e atualiza a lista', async () => {
  listarContatosDoAluno.mockResolvedValue([
    { idContato: 1, quando: '2026-10-26T09:00:00', canal: 'telefone', resultado: 'sem_resposta', funcionarioNome: 'Carla', observacao: 'Caixa postal' },
  ]);
  registrarContato.mockResolvedValue({
    idContato: 2, quando: '2026-10-28T15:00:00', canal: 'email', resultado: 'retornar_depois', funcionarioNome: 'Carla', observacao: 'Sexta',
  });
  render(<AdminComercial />);
  fireEvent.click(screen.getByRole('tab', { name: /Leads/ }));
  const linha = (await screen.findByText('Ana Souza')).closest('tr');

  fireEvent.click(within(linha).getByRole('button', { name: 'Contatos' }));

  const painelLateral = screen.getByRole('dialog', { name: 'Contatos com Ana Souza' });
  expect(within(painelLateral).getByText(/fez a inscrição em Análise e Desenvolvimento de Sistemas/)).toBeInTheDocument();
  expect(await within(painelLateral).findByText('Caixa postal')).toBeInTheDocument();

  fireEvent.click(within(painelLateral).getByRole('button', { name: 'REGISTRAR CONTATO' }));
  expect(within(painelLateral).getByText('Escolha como foi o contato.')).toBeInTheDocument();
  expect(registrarContato).not.toHaveBeenCalled();

  fireEvent.change(within(painelLateral).getByLabelText('Canal'), { target: { value: 'email' } });
  fireEvent.change(within(painelLateral).getByLabelText('Como foi'), { target: { value: 'retornar_depois' } });
  fireEvent.change(within(painelLateral).getByLabelText('Observação (opcional)'), { target: { value: 'Sexta' } });
  fireEvent.click(within(painelLateral).getByRole('button', { name: 'REGISTRAR CONTATO' }));

  await waitFor(() =>
    expect(registrarContato).toHaveBeenCalledWith({ idAluno: 10, canal: 'email', resultado: 'retornar_depois', observacao: 'Sexta' })
  );
  expect(await within(painelLateral).findByText('Pediu retorno depois', { selector: 'strong' })).toBeInTheDocument();
  expect(listarLeads).toHaveBeenCalledTimes(2);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('mostra o erro do servidor ao registrar contato', async () => {
  registrarContato.mockRejectedValue({ response: { data: { mensagem: 'Aluno não encontrado.' } } });
  render(<AdminComercial />);
  fireEvent.click(screen.getByRole('tab', { name: /Leads/ }));
  fireEvent.click(within((await screen.findByText('Carla Dias')).closest('tr')).getByRole('button', { name: 'Contatos' }));

  const painelLateral = screen.getByRole('dialog');
  expect(within(painelLateral).getByText('Aceita receber ofertas')).toBeInTheDocument();
  fireEvent.change(within(painelLateral).getByLabelText('Como foi'), { target: { value: 'interessado' } });
  fireEvent.click(within(painelLateral).getByRole('button', { name: 'REGISTRAR CONTATO' }));
  expect(await within(painelLateral).findByText('Aluno não encontrado.')).toBeInTheDocument();

  fireEvent.click(within(painelLateral).getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('aba de interesse mostra cursos, termos e buscas sem resultado', async () => {
  render(<AdminComercial />);
  fireEvent.click(screen.getByRole('tab', { name: 'Interesse nos cursos' }));

  expect(await screen.findByText('Ciência de Dados')).toBeInTheDocument();
  expect(screen.getByText('12,5%')).toBeInTheDocument();
  expect(screen.getByText('Design Gráfico').closest('tr')).toHaveClass('comercial-linha-apagada');
  expect(screen.getByText('Sem resultado')).toBeInTheDocument();
  expect(screen.getAllByText('python')).toHaveLength(2);
});

test('mostra o erro quando o servidor recusa', async () => {
  buscarPainelComercial.mockRejectedValue({ response: { status: 403, data: { erro: 'Seu nível de acesso não permite usar este módulo.' } } });
  listarLeads.mockRejectedValue({});
  render(<AdminComercial />);

  expect(await screen.findByText('Seu nível de acesso não permite usar este módulo.')).toBeInTheDocument();
});

test('painel e listas vazias têm mensagens próprias', async () => {
  buscarPainelComercial.mockResolvedValue({
    ...painel(),
    funil: [{ chave: 'visitaram', rotulo: 'Visitaram o site', pessoas: 0 }],
    porDia: [{ data: '2026-10-28', visitantes: 0, visualizacoes: 0, buscas: 0 }],
    buscas: [],
  });
  listarLeads.mockResolvedValue([]);
  render(<AdminComercial />);

  expect(await screen.findByText('Ainda não há movimento registrado neste período.')).toBeInTheDocument();
  expect(screen.getByText('Ainda não há visitas registradas neste período.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Interesse nos cursos' }));
  expect(screen.getByText('Ninguém usou a busca neste período.')).toBeInTheDocument();
  expect(screen.getByText('Todas as buscas encontraram algum curso. 🎉')).toBeInTheDocument();
});
