import api from './api';

export const listarFuncionarios = () => api.get('/funcionarios');
export const buscarFuncionarioPorId = (id) => api.get(`/funcionarios/${id}`);
export const criarFuncionario = (funcionario) => api.post('/funcionarios', funcionario);
export const atualizarFuncionario = (id, funcionario) => api.put(`/funcionarios/${id}`, funcionario);
export const deletarFuncionario = (id) => api.delete(`/funcionarios/${id}`);

// Níveis de acesso (módulo Sistema)
export const listarNiveis = () => api.get('/niveis-acesso');
export const criarNivel = (nivel) => api.post('/niveis-acesso', nivel);
export const atualizarNivel = (id, nivel) => api.put(`/niveis-acesso/${id}`, nivel);
export const deletarNivel = (id) => api.delete(`/niveis-acesso/${id}`);
