import api from './api';

// Histórico de alterações do sistema (quem cadastrou/alterou o quê, e quando)

// filtros: { modulo, tipo, acao, busca, de, ate, pagina, tamanho } — vazios não vão na consulta
export const buscarAtividades = (filtros = {}) => {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor !== null && valor !== undefined)
  );
  return api.get('/atividades', { params }).then((r) => r.data);
};

// Quem cadastrou e quem alterou por último (ex.: alvo 'alunos', id 12)
export const ultimaAlteracao = (alvo, id) =>
  api.get('/atividades/ultima', { params: { alvo, id } }).then((r) => r.data);
