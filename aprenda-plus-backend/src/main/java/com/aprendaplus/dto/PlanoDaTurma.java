package com.aprendaplus.dto;

import java.util.List;

// Sala de aula de uma turma vista pelo painel (aulas + mural).
// idPlano = null quando a sala ainda não foi criada.
public record PlanoDaTurma(
        Integer idPlano,
        Integer idTurma,
        String turma,
        Integer idCurso,
        String curso,
        Integer idProfessor,
        String professor,
        List<AulaDaSala> aulas,
        List<AvisoDaTurma> avisos) {
}
