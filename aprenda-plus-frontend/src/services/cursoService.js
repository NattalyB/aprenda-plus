import api from './api';

export const listarCursos = () => api.get('/cursos');
export const buscarCursoPorId = (id) => api.get(`/cursos/${id}`);
export const criarCurso = (curso) => api.post('/cursos', curso);
export const atualizarCurso = (id, curso) => api.put(`/cursos/${id}`, curso);
export const deletarCurso = (id) => api.delete(`/cursos/${id}`);

export const buscarTurmasPorCurso = (idCurso) => {
  return api.get('/turmas').then((response) => {
    return response.data.filter((turma) => turma.curso?.idCurso === idCurso);
  });
};