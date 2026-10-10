import bannerAnaliseDesenvolvimentoSistemas from '../assets/banners/banner-curso-analise-desenvolvimento-sistemas.jpeg';
import bannerCienciadeDados from '../assets/banners/banner-curso-ciencia-dados.jpeg';
import bannerDesenvolvimentoWeb from '../assets/banners/banner-curso-desenvolvimento-web-full-stack.jpeg';
import bannerEngenhariaSoftware from '../assets/banners/banner-curso-engenharia-software.jpeg';
import bannerRedesComputadores from '../assets/banners/banner-curso-redes-computadores.jpeg';
import bannerSegurancaDaInformacao from '../assets/banners/banner-curso-seguranca-informacao.jpeg';
import bannerTecnicoSupManutencaoComputadores from '../assets/banners/banner-curso-tecnico-suporte-manutencao-computadores.jpeg';

import bannerDesignGrafico from '../assets/banners/banner-curso-design-grafico.jpeg';
import bannerMarketingDigital from '../assets/banners/banner-curso-marketing-digital.jpeg';

import bannerAdministracaoEmpresas from '../assets/banners/banner-curso-administracao-empresas.jpeg';
import bannerGestaoFinanceira from '../assets/banners/banner-curso-gestao-financeira.jpeg';
import bannerGestaoRecursosHumanos from '../assets/banners/banner-curso-gestao-recursos-humanos.jpeg';


// Deixa o nome "limpo": sem acentos, minúsculo e sem espaços sobrando
// Assim "Ciência de Dados" e "ciencia de dados " são considerados iguais
const normalizar = (texto) =>
  (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Liga o nome do curso à imagem dele.
// Pra adicionar um curso novo: importe a imagem lá em cima e acrescente uma linha aqui.
const imagensPorCurso = {
  'Análise e Desenvolvimento de Sistemas': bannerAnaliseDesenvolvimentoSistemas,
  'Ciência de Dados': bannerCienciadeDados,
  'Desenvolvimento Web Full Stack': bannerDesenvolvimentoWeb,
  'Engenharia de Software': bannerEngenhariaSoftware,
  'Redes de Computadores': bannerRedesComputadores,
  'Segurança da Informação': bannerSegurancaDaInformacao,
  'Técnico em Suporte e Manutenção de Computadores': bannerTecnicoSupManutencaoComputadores,

  'Design Gráfico': bannerDesignGrafico,
  'Marketing Digital': bannerMarketingDigital,

  'Administração de Empresas': bannerAdministracaoEmpresas,
  'Gestão Financeira': bannerGestaoFinanceira,
  'Gestão de Recursos Humanos': bannerGestaoRecursosHumanos,
};

// Mesma lista, mas com os nomes já normalizados (pra busca tolerante)
const imagensNormalizadas = Object.fromEntries(
  Object.entries(imagensPorCurso).map(([nome, imagem]) => [normalizar(nome), imagem])
);

// Retorna a imagem do curso, ou null se ele ainda não tiver imagem
export const getImagemCurso = (nomeCurso) => imagensNormalizadas[normalizar(nomeCurso)] || null;