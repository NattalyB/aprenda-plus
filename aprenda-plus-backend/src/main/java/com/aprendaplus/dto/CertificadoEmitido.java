package com.aprendaplus.dto;

import java.time.LocalDateTime;

// Dados impressos no certificado (e mostrados na validação pública)
public record CertificadoEmitido(
        String codigo,
        String aluno,
        String curso,
        String turma,
        Integer cargaHoraria,
        String professor,
        LocalDateTime emitidoEm) {
}
