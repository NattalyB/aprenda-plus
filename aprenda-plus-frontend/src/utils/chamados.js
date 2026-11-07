// Regras e textos dos chamados de suporte. Funções puras, fáceis de testar.

export const CATEGORIAS = [
  { chave: 'erro', rotulo: 'Erro no sistema' },
  { chave: 'acesso', rotulo: 'Acesso e senha' },
  { chave: 'duvida', rotulo: 'Dúvida de uso' },
  { chave: 'sugestao', rotulo: 'Sugestão de melhoria' },
  { chave: 'outro', rotulo: 'Outro assunto' },
];

export const PRIORIDADES = [
  { chave: 'baixa', rotulo: 'Baixa', dica: 'Dá para esperar' },
  { chave: 'media', rotulo: 'Média', dica: 'Atrapalha, mas tem outro jeito' },
  { chave: 'alta', rotulo: 'Alta', dica: 'Impede uma tarefa importante' },
  { chave: 'urgente', rotulo: 'Urgente', dica: 'Ninguém consegue trabalhar' },
];

export const SITUACOES = [
  { chave: 'aberto', rotulo: 'Aberto', classe: 'aberto' },
  { chave: 'em_atendimento', rotulo: 'Em atendimento', classe: 'atendimento' },
  { chave: 'resolvido', rotulo: 'Resolvido', classe: 'resolvido' },
  { chave: 'fechado', rotulo: 'Fechado', classe: 'fechado' },
];

export const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024;
export const TIPOS_DE_ANEXO = ['image/png', 'image/jpeg', 'application/pdf'];

const rotuloDe = (lista, chave) => lista.find((item) => item.chave === chave)?.rotulo || chave || '';

export const rotuloCategoria = (chave) => rotuloDe(CATEGORIAS, chave);
export const rotuloPrioridade = (chave) => rotuloDe(PRIORIDADES, chave);
export const rotuloSituacao = (chave) => rotuloDe(SITUACOES, chave);
export const classeSituacao = (chave) => SITUACOES.find((s) => s.chave === chave)?.classe || 'fechado';

export const encerrado = (chamado) => chamado?.status === 'fechado';

// O chamado está esperando o suporte? (aberto, ou o solicitante escreveu por último e ainda não acabou)
export const aguardaSuporte = (chamado) =>
  Boolean(chamado) &&
  (chamado.status === 'aberto' ||
    (chamado.status === 'em_atendimento' && chamado.ultimaMensagemDe === 'solicitante'));

// Quem abriu tem resposta nova do suporte para ler?
export const temRespostaDoSuporte = (chamado) =>
  Boolean(chamado) && chamado.ultimaMensagemDe === 'suporte' && chamado.status !== 'fechado';

// Chave de "já li" que muda sempre que o chamado tem novidade
export const chaveDeNovidade = (chamado) => `${chamado.idChamado}:${chamado.atualizadoEm || ''}`;

// Confere o anexo antes de enviar: devolve a mensagem de erro ou null
export const erroDoAnexo = (arquivo) => {
  if (!arquivo) return null;
  if (!TIPOS_DE_ANEXO.includes(arquivo.type)) return 'Anexe um print (PNG ou JPG) ou um PDF.';
  if (arquivo.size > TAMANHO_MAXIMO_ANEXO) return 'O anexo pode ter no máximo 5 MB.';
  return null;
};

// Nome da tela onde a pessoa estava, a partir do endereço (ex.: "#/admin/financeiro" -> "Financeiro")
const TELAS = [
  [/^\/admin\/?$/, 'Início do painel'],
  [/^\/admin\/alunos/, 'Cadastro de alunos'],
  [/^\/admin\/professores/, 'Cadastro de professores'],
  [/^\/admin\/cursos/, 'Cadastro de cursos'],
  [/^\/admin\/disciplinas/, 'Cadastro de disciplinas'],
  [/^\/admin\/periodos-letivos/, 'Períodos letivos'],
  [/^\/admin\/turmas/, 'Cadastro de turmas'],
  [/^\/admin\/aulas/, 'Sala de aula (EAD)'],
  [/^\/admin\/inscricoes/, 'Inscrições'],
  [/^\/admin\/matriculas/, 'Matrículas'],
  [/^\/admin\/financeiro/, 'Financeiro'],
  [/^\/admin\/comercial/, 'Comercial'],
  [/^\/admin\/funcionarios/, 'Funcionários do painel'],
  [/^\/admin\/treinamentos/, 'Treinamentos'],
  [/^\/admin\/historico/, 'Histórico de alterações'],
  [/^\/admin\/sistema/, 'Sistema'],
  [/^\/professor\/turmas/, 'Portal do Professor · Turma'],
  [/^\/professor/, 'Portal do Professor · Minhas turmas'],
];

export const nomeDaTela = (caminho) => {
  const limpo = (caminho || '').split('?')[0];
  return TELAS.find(([regra]) => regra.test(limpo))?.[1] || '';
};

const doisDigitos = (n) => String(n).padStart(2, '0');

// "07/11/2026 às 19:21"
export const dataHora = (valor) => {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()} às ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
};

export const tamanhoLegivel = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
};
