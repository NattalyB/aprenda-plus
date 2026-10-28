import api from './api';

// Registra o que as pessoas fazem no site (buscas, cursos abertos e cursos postos no carrinho)
// para os relatórios do módulo Comercial. Quem não está logado fica anônimo: o navegador guarda
// só um código aleatório de sessão, sem nome, e-mail ou qualquer dado pessoal.
// Os envios são "de fundo": se a internet ou o servidor falharem, o site segue normal.

const CHAVE_SESSAO = 'sessaoVisitante';

const novoCodigo = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Navegadores antigos: monta um UUID v4 na mão
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
};

// Mesmo código enquanto a pessoa usar este navegador (liga a visita ao cadastro, se ela se cadastrar)
let sessaoEmMemoria = null;
export const codigoDaSessao = () => {
  try {
    let codigo = localStorage.getItem(CHAVE_SESSAO);
    if (!codigo) {
      codigo = novoCodigo();
      localStorage.setItem(CHAVE_SESSAO, codigo);
    }
    return codigo;
  } catch {
    // Navegador sem armazenamento (ex.: janela privada bloqueada): vale só enquanto a página estiver aberta
    if (!sessaoEmMemoria) sessaoEmMemoria = novoCodigo();
    return sessaoEmMemoria;
  }
};

// "  Ciência   de DADOS " -> "ciencia de dados" (para não registrar a mesma busca duas vezes)
export const normalizarTermo = (termo) =>
  (termo || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const registrar = (dados) =>
  api.post('/eventos', { ...dados, sessao: codigoDaSessao() }).then(
    () => true,
    () => false
  );

// Buscas já registradas nesta visita (cada termo conta uma vez por visita)
const buscasRegistradas = new Set();

export const TAMANHO_MINIMO_BUSCA = 2;

export const registrarBusca = (termo, resultados) => {
  const chave = normalizarTermo(termo);
  if (chave.length < TAMANHO_MINIMO_BUSCA || buscasRegistradas.has(chave)) {
    return Promise.resolve(false);
  }
  buscasRegistradas.add(chave);
  return registrar({ tipo: 'BUSCA', termo: termo.trim().slice(0, 100), resultados });
};

export const registrarCursoVisto = (idCurso) =>
  idCurso ? registrar({ tipo: 'VISUALIZACAO', idCurso }) : Promise.resolve(false);

export const registrarCursoNoCarrinho = (idCurso) =>
  idCurso ? registrar({ tipo: 'CARRINHO', idCurso }) : Promise.resolve(false);

// Só para os testes: esquece as buscas já registradas
export const esquecerBuscasRegistradas = () => buscasRegistradas.clear();
