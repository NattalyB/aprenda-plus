import bannerAds from '../assets/banners/analise-desenvolvimento-sistemas-banner-curso.jpeg';
import bannerEngenhariaSoftware from '../assets/banners/engenharia-software-banner-curso.jpeg';
import bannerCienciadeDados from '../assets/banners/ciencia-dados-banner-curso.jpeg';
import bannerDesignGrafico from '../assets/banners/design-grafico-banner-curso.jpeg';

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
  'Análise e Desenvolvimento de Sistemas': bannerAds,
  'Engenharia de Software': bannerEngenhariaSoftware,
  'Ciência de Dados': bannerCienciadeDados,
  'Design Gráfico': bannerDesignGrafico,
};

// Mesma lista, mas com os nomes já normalizados (pra busca tolerante)
const imagensNormalizadas = Object.fromEntries(
  Object.entries(imagensPorCurso).map(([nome, imagem]) => [normalizar(nome), imagem])
);

// Retorna a imagem do curso, ou null se ele ainda não tiver imagem
export const getImagemCurso = (nomeCurso) => imagensNormalizadas[normalizar(nomeCurso)] || null;