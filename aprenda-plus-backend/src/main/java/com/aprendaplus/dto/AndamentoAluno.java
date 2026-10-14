package com.aprendaplus.dto;

import java.time.LocalDateTime;

// Progresso de um aluno na sala de aula (andamento da turma)
public record AndamentoAluno(
        Integer idAluno,
        String nome,
        String email,
        String statusMatricula,
        int concluidas,
        int totalAulas,
        int percentual,
        LocalDateTime ultimaAtividade,
        boolean certificado) {
}
