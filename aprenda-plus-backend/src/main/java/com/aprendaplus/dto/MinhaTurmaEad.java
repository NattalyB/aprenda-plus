package com.aprendaplus.dto;

// Cartão de uma turma na lista "Sala de aula" do aluno
public record MinhaTurmaEad(
        Integer idTurma,
        String turma,
        String curso,
        String professor,
        String statusMatricula,
        boolean podeAcessar,
        int totalAulas,
        int concluidas,
        int percentual,
        boolean temCertificado) {
}
