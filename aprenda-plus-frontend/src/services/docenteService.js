import api from './api';

// Portal do Professor: login e as turmas do professor logado.
// A sessão do professor fica separada da do aluno (tokenProfessor).

const dados = (r) => r.data;

export const loginProfessor = (email, senha) => api.post('/auth/login-professor', { email, senha }).then(dados);

export const salvarSessaoProfessor = (sessao) => {
  localStorage.setItem('tokenProfessor', sessao.token);
  localStorage.setItem('idProfessor', sessao.idProfessor);
  localStorage.setItem('nomeProfessor', sessao.nome);
};

export const sairProfessor = () => {
  ['tokenProfessor', 'idProfessor', 'nomeProfessor'].forEach((chave) => localStorage.removeItem(chave));
};

export const professorLogado = () => localStorage.getItem('tokenProfessor') !== null;
export const getNomeProfessor = () => localStorage.getItem('nomeProfessor');

export const minhasTurmas = () => api.get('/docente/turmas').then(dados);
export const salaDaTurma = (idTurma) => api.get(`/docente/turmas/${idTurma}`).then(dados);
export const andamentoDaMinhaTurma = (idTurma) => api.get(`/docente/turmas/${idTurma}/andamento`).then(dados);
export const disciplinasDaTurma = (idTurma) => api.get(`/docente/turmas/${idTurma}/disciplinas`).then(dados);

export const criarAula = (idTurma, aula) => api.post(`/docente/turmas/${idTurma}/aulas`, aula).then(dados);
export const editarAula = (idAula, aula) => api.put(`/docente/aulas/${idAula}`, aula).then(dados);
export const excluirAula = (idAula) => api.delete(`/docente/aulas/${idAula}`).then(dados);
export const moverAula = (idAula, direcao) =>
  api.put(`/docente/aulas/${idAula}/mover`, null, { params: { direcao } }).then(dados);

export const publicarAviso = (idTurma, aviso) => api.post(`/docente/turmas/${idTurma}/avisos`, aviso).then(dados);
export const editarAviso = (idAviso, aviso) => api.put(`/docente/avisos/${idAviso}`, aviso).then(dados);
export const excluirAviso = (idAviso) => api.delete(`/docente/avisos/${idAviso}`).then(dados);
