// Funções da sala de aula EAD usadas pelo aluno e pelo painel

// Pega o código do vídeo de qualquer link do YouTube (ou null)
export const idDoYoutube = (url) => {
  if (!url) return null;
  const achado = String(url)
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/);
  return achado ? achado[1] : null;
};

// Endereço do player (versão sem cookies do YouTube)
export const urlDoPlayer = (url) => {
  const id = idDoYoutube(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
};

export const TIPOS_DE_AULA = {
  video: { texto: 'Videoaula', icone: '🎬' },
  leitura: { texto: 'Leitura', icone: '📖' },
  ao_vivo: { texto: 'Aula ao vivo', icone: '🔴' },
  atividade: { texto: 'Atividade', icone: '✍️' },
};

export const tipoDaAula = (tipo) => TIPOS_DE_AULA[tipo] || TIPOS_DE_AULA.video;

// "2026-11-03" -> "03/11/2026"
export const formatarDataCurta = (data) => {
  if (!data) return '';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

// "2026-10-13T21:05:00" -> "13/10/2026 às 21:05"
export const formatarDataHora = (data) => {
  if (!data) return '';
  const texto = String(data);
  const hora = texto.slice(11, 16);
  return hora ? `${formatarDataCurta(texto)} às ${hora}` : formatarDataCurta(texto);
};

// "13 de outubro de 2026" (texto do certificado)
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataPorExtenso = (data) => {
  if (!data) return '';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
};

// Agrupa as aulas por disciplina, mantendo a ordem em que aparecem
export const agruparPorDisciplina = (aulas) => {
  const grupos = [];
  (aulas || []).forEach((aula) => {
    const nome = aula.disciplina || 'Aulas gerais';
    let grupo = grupos.find((g) => g.nome === nome);
    if (!grupo) {
      grupo = { nome, aulas: [] };
      grupos.push(grupo);
    }
    grupo.aulas.push(aula);
  });
  return grupos;
};
