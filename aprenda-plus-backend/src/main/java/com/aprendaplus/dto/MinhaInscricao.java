package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// O que o aluno vê em "Minhas inscrições" (só os dados dele, sem dados internos)
public record MinhaInscricao(
        Integer idInscricao,
        Integer idCurso,
        String curso,
        Integer idTurma,
        String turma,
        String modalidade,
        String diasHorarios,
        String status,
        String formaPagamento,
        BigDecimal valorTotal,
        LocalDateTime dataInscricao,
        boolean podeTrocarTurma) {
}
