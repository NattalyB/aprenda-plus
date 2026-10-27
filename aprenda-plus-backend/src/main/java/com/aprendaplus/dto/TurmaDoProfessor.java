package com.aprendaplus.dto;

// Uma turma no Portal do Professor, com os números para o cartão da turma
public record TurmaDoProfessor(
        Integer idTurma,
        String nome,
        Integer idCurso,
        String curso,
        String modalidade,
        String diasHorarios,
        String periodoLetivo,
        boolean responsavel,
        boolean salaCriada,
        int alunos,
        int aulas,
        int progressoMedio) {
}
