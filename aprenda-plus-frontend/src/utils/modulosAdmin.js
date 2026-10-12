// Módulos do painel admin: a mesma lista do back-end (Modulos.java).
// O nível de acesso de cada funcionário diz quais ele pode usar.
export const MODULOS = [
  { chave: 'alunos', rota: '/admin/alunos', menu: 'Cadastro de alunos', titulo: 'Alunos', icone: '🎓', descricao: 'Cadastro e situação dos alunos' },
  { chave: 'professores', rota: '/admin/professores', menu: 'Cadastro de professores', titulo: 'Professores', icone: '👩‍🏫', descricao: 'Professores, cursos e disciplinas que lecionam' },
  { chave: 'cursos', rota: '/admin/cursos', menu: 'Cadastro de cursos', titulo: 'Cursos', icone: '📘', descricao: 'Cursos, valores e parcelamento' },
  { chave: 'disciplinas', rota: '/admin/disciplinas', menu: 'Cadastro de disciplinas', titulo: 'Disciplinas', icone: '📝', descricao: 'Disciplinas e carga horária' },
  { chave: 'periodos', rota: '/admin/periodos-letivos', menu: 'Períodos letivos', titulo: 'Períodos letivos', icone: '📅', descricao: 'Semestres e datas' },
  { chave: 'turmas', rota: '/admin/turmas', menu: 'Cadastro de turmas', titulo: 'Turmas', icone: '🏫', descricao: 'Turmas, horários e vagas' },
  { chave: 'inscricoes', rota: '/admin/inscricoes', menu: 'Inscrições', titulo: 'Inscrições', icone: '🧾', descricao: 'Compras dos alunos e pagamentos' },
  { chave: 'matriculas', rota: '/admin/matriculas', menu: 'Matrículas', titulo: 'Matrículas', icone: '✅', descricao: 'Alunos matriculados nas turmas' },
  { chave: 'financeiro', rota: '/admin/financeiro', menu: 'Financeiro', titulo: 'Financeiro', icone: '💰', descricao: 'Parcelas, recebimentos e indicadores' },
  { chave: 'funcionarios', rota: '/admin/funcionarios', menu: 'Funcionários do painel', titulo: 'Funcionários', icone: '🪪', descricao: 'Quem acessa o painel' },
  { chave: 'sistema', rota: '/admin/sistema', menu: 'Sistema', titulo: 'Sistema', icone: '⚙️', descricao: 'Níveis de acesso e permissões' },
];

// Módulos que o Master pode liberar para os outros níveis ("sistema" é só do Master)
export const MODULOS_LIBERAVEIS = MODULOS.filter((m) => m.chave !== 'sistema');

export const moduloPorChave = (chave) => MODULOS.find((m) => m.chave === chave);

// O funcionário pode usar este módulo?
export const podeUsar = (acesso, chave) =>
  Boolean(acesso && (acesso.master || (acesso.modulos || []).includes(chave)));

// Módulos que aparecem no menu e nos atalhos do início, na ordem do menu
export const modulosLiberados = (acesso) => MODULOS.filter((m) => podeUsar(acesso, m.chave));
