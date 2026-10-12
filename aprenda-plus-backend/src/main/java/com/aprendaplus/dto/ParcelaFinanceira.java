package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Uma parcela, já com o nome do aluno, do curso e da turma (telas do financeiro e do aluno)
public record ParcelaFinanceira(
        Integer idPagamento,
        Integer idMatricula,
        Integer idTurma,
        String aluno,
        String curso,
        String turma,
        Integer numeroParcela,
        Integer totalParcelas,
        BigDecimal valor,
        LocalDate vencimento,
        LocalDate dataPagamento,
        String formaPagamento,
        String status) {
}
