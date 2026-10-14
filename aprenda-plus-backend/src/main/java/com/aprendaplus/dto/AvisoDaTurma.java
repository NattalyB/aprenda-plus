package com.aprendaplus.dto;

import java.time.LocalDateTime;

// Aviso do mural da turma
public record AvisoDaTurma(
        Integer idAviso,
        String titulo,
        String mensagem,
        String autor,
        boolean fixado,
        LocalDateTime criadoEm) {
}
