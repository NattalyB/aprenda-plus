package com.aprendaplus.dto;

import java.util.List;

// Tudo o que o aluno vê ao entrar na sala de aula de uma turma
public record SalaDoAluno(
        Integer idTurma,
        String turma,
        String curso,
        String modalidade,
        String diasHorarios,
        String professor,
        Integer cargaHoraria,
        int totalAulas,
        int concluidas,
        int percentual,
        List<AulaDaSala> aulas,
        List<AvisoDaTurma> avisos,
        CertificadoEmitido certificado) {
}
