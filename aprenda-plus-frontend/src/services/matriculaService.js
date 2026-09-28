import api from './api';

export const listarMatriculas = () => api.get('/matriculas');
export const buscarMatriculaPorId = (id) => api.get(`/matriculas/${id}`);
export const criarMatricula = (matricula) => api.post('/matriculas', matricula);
export const atualizarMatricula = (id, matricula) => api.put(`/matriculas/${id}`, matricula);
export const deletarMatricula = (id) => api.delete(`/matriculas/${id}`);