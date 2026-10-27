// Abas dentro do cadastro (ex.: Matrículas dentro do aluno):
// os formulários abertos de lá voltam para a mesma aba depois de salvar ou cancelar.

// Só aceita voltar para uma tela do próprio painel (nada de link externo)
export const destinoDeVolta = (parametros, padrao) => {
  const voltar = parametros?.get('voltar');
  return voltar && voltar.startsWith('/admin/') && !voltar.startsWith('//') ? voltar : padrao;
};

// "/admin/matriculas/novo" + { aluno: 5 } + "/admin/alunos/5/editar?aba=matriculas"
// -> "/admin/matriculas/novo?aluno=5&voltar=%2Fadmin%2Falunos%2F5%2Feditar%3Faba%3Dmatriculas"
export const rotaComVolta = (rota, voltar, extras = {}) => {
  const params = new URLSearchParams();
  Object.entries(extras).forEach(([chave, valor]) => {
    if (valor != null && valor !== '') params.set(chave, String(valor));
  });
  if (voltar) params.set('voltar', voltar);
  const query = params.toString();
  return query ? `${rota}?${query}` : rota;
};
