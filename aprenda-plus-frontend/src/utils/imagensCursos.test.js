import { getImagemCurso } from './imagensCursos';

describe('getImagemCurso', () => {
  test('encontra a imagem pelo nome exato do curso', () => {
    expect(getImagemCurso('Engenharia de Software')).toBeTruthy();
    expect(getImagemCurso('Ciência de Dados')).toBeTruthy();
  });

  test('ignora acentos, maiúsculas e espaços sobrando', () => {
    expect(getImagemCurso('ciencia de dados')).toBeTruthy();
    expect(getImagemCurso('  ANÁLISE e   Desenvolvimento de Sistemas ')).toBeTruthy();
    expect(getImagemCurso('design grafico')).toBeTruthy();
  });

  test('curso sem imagem devolve null', () => {
    expect(getImagemCurso('Curso Inventado')).toBeNull();
    expect(getImagemCurso('')).toBeNull();
    expect(getImagemCurso(undefined)).toBeNull();
  });
});
