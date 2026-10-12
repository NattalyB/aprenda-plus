package com.aprendaplus.dto;

// Turma aberta de um curso, com as vagas que ainda restam.
// Usada na compra e na troca de turma pelo aluno.
public record TurmaDisponivel(
        Integer idTurma,
        String nome,
        String modalidade,
        String diasHorarios,
        String periodoLetivo,
        Integer capacidadeMaxima,
        long vagasRestantes) {
}
