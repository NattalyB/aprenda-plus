// Regras e textos das atualizações do sistema. Funções puras (e o "já vi" de cada funcionário).
import { useSyncExternalStore } from 'react';

export const TIPOS = [
  { chave: 'novidade', rotulo: 'Novidade', plural: 'Novidades', icone: '✨' },
  { chave: 'melhoria', rotulo: 'Melhoria', plural: 'Melhorias', icone: '⚡' },
  { chave: 'correcao', rotulo: 'Correção', plural: 'Correções', icone: '🛠' },
  { chave: 'manutencao', rotulo: 'Manutenção', plural: 'Manutenções', icone: '🔧' },
];

const tipoDe = (chave) => TIPOS.find((t) => t.chave === chave);
export const rotuloTipo = (chave) => tipoDe(chave)?.rotulo || chave || '';
export const iconeTipo = (chave) => tipoDe(chave)?.icone || '📢';

const data = (valor) => (valor ? new Date(valor) : null);
const doisDigitos = (n) => String(n).padStart(2, '0');
const diaMes = (d) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
const hora = (d) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;

// Situação de uma manutenção agora: programada, em andamento ou concluída
export const situacaoManutencao = (atualizacao, agora = new Date()) => {
  const inicio = data(atualizacao?.inicioManutencao);
  const fim = data(atualizacao?.fimManutencao);
  if (!inicio || !fim) return null;
  if (agora >= fim) return 'concluida';
  if (agora >= inicio) return 'andamento';
  return 'programada';
};

// "20/11 das 22:00 às 22:30" ou "20/11 às 22:00 até 21/11 às 02:00"
export const periodoManutencao = (atualizacao) => {
  const inicio = data(atualizacao?.inicioManutencao);
  const fim = data(atualizacao?.fimManutencao);
  if (!inicio || !fim) return '';
  if (diaMes(inicio) === diaMes(fim) && inicio.getFullYear() === fim.getFullYear()) {
    return `${diaMes(inicio)} das ${hora(inicio)} às ${hora(fim)}`;
  }
  return `${diaMes(inicio)} às ${hora(inicio)} até ${diaMes(fim)} às ${hora(fim)}`;
};

// Manutenções que ainda não terminaram, da mais próxima para a mais distante
export const manutencoesPendentes = (lista, agora = new Date()) =>
  (lista || [])
    .filter((a) => a.tipo === 'manutencao' && ['programada', 'andamento'].includes(situacaoManutencao(a, agora)))
    .sort((a, b) => String(a.inicioManutencao).localeCompare(String(b.inicioManutencao)));

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro',
  'novembro', 'dezembro'];

// Agrupa por mês de publicação: [{ mes: 'novembro de 2026', itens: [...] }]
export const agruparPorMes = (lista) => {
  const grupos = [];
  (lista || []).forEach((item) => {
    const d = data(item.publicadoEm);
    const mes = d ? `${MESES[d.getMonth()]} de ${d.getFullYear()}` : 'Sem data';
    const grupo = grupos.find((g) => g.mes === mes);
    if (grupo) grupo.itens.push(item);
    else grupos.push({ mes, itens: [item] });
  });
  return grupos;
};

export const dataPublicacao = (valor) => {
  const d = data(valor);
  return d && !Number.isNaN(d.getTime()) ? `${diaMes(d)}/${d.getFullYear()}` : '';
};

// ===== "Já vi" de cada funcionário: guarda o maior número de atualização que ele já viu =====
const chaveVistas = () => `atualizacoesVistas:${localStorage.getItem('idFuncionario') || 'anonimo'}`;
const ouvintes = new Set();

export const lerVistas = () => {
  try {
    const valor = localStorage.getItem(chaveVistas());
    return valor === null ? null : Number(valor) || 0;
  } catch {
    return 0;
  }
};

const maiorId = (lista) => (lista || []).reduce((maior, a) => Math.max(maior, a.idAtualizacao || 0), 0);

export const marcarVistas = (lista) => {
  try {
    localStorage.setItem(chaveVistas(), String(maiorId(lista)));
  } catch {
    // sem armazenamento: só não lembra
  }
  ouvintes.forEach((avisar) => avisar());
};

// Primeiro acesso deste funcionário: começa "em dia", sem avisar o histórico antigo
export const iniciarVistas = (lista) => {
  if (lista && lista.length > 0 && lerVistas() === null) marcarVistas(lista);
};

// Atualizações que este funcionário ainda não viu (vistas = valor de lerVistas/useVistas)
export const atualizacoesNovas = (lista, vistas = lerVistas()) => {
  if (!lista || lista.length === 0 || vistas === null) return [];
  return lista.filter((a) => (a.idAtualizacao || 0) > vistas);
};

// Faz o componente redesenhar quando alguém marca as atualizações como vistas
export const useVistas = () =>
  useSyncExternalStore(
    (avisar) => {
      ouvintes.add(avisar);
      return () => ouvintes.delete(avisar);
    },
    lerVistas,
    lerVistas
  );
