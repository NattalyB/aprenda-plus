import bannerAds from '../assets/banners/analise-desenvolvimento-sistemas-banner-curso.jfif';
import bannerEngenhariaSoftware from '../assets/banners/engenharia-software-banner-curso.jfif';

// Liga o nome do curso (como está cadastrado no banco) à imagem dele.
// Pra adicionar um curso novo: importe a imagem lá em cima e acrescente uma linha aqui.
const imagensPorCurso = {
  'Análise e Desenvolvimento de Sistemas': bannerAds,
  'Engenharia de Software': bannerEngenhariaSoftware,
};

// Retorna a imagem do curso, ou null se ele ainda não tiver imagem
export const getImagemCurso = (nomeCurso) => imagensPorCurso[nomeCurso] || null;