import api from './api';

// Sala de aula EAD do aluno (todas devolvem só os dados, sem o "response")
export const listarMinhasTurmasEad = () => api.get('/sala/minhas-turmas').then((r) => r.data);
export const abrirSala = (idTurma) => api.get(`/sala/turmas/${idTurma}`).then((r) => r.data);
export const concluirAula = (idAula) => api.put(`/sala/aulas/${idAula}/concluida`).then((r) => r.data);
export const desmarcarAula = (idAula) => api.delete(`/sala/aulas/${idAula}/concluida`).then((r) => r.data);
export const emitirCertificado = (idTurma) => api.post(`/sala/turmas/${idTurma}/certificado`).then((r) => r.data);

// Validação pública do certificado (não precisa de login)
export const validarCertificado = (codigo) =>
  api.get(`/certificados/${encodeURIComponent(codigo)}`).then((r) => r.data);
