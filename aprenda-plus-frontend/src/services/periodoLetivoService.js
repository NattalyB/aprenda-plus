import api from './api';

export const listarPeriodosLetivos = () => api.get('/periodos-letivos');
export const buscarPeriodoLetivoPorId = (id) => api.get(`/periodos-letivos/${id}`);
export const criarPeriodoLetivo = (periodo) => api.post('/periodos-letivos', periodo);
export const atualizarPeriodoLetivo = (id, periodo) => api.put(`/periodos-letivos/${id}`, periodo);
export const deletarPeriodoLetivo = (id) => api.delete(`/periodos-letivos/${id}`);