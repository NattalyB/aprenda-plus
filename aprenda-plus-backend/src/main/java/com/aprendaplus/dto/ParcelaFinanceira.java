package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Uma parcela, já com o nome do aluno, do curso e da turma (telas do financeiro e do aluno).
// cobrancaAutomatica = Pix ou cartão: o dinheiro cai sozinho, ninguém precisa dar baixa.
// Paga: multa, juros, desconto e valorPago mostram como foi a baixa.
// Em aberto: valorAtualizado é quanto custa pagar hoje (com multa/juros ou desconto).
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
        String status,
        boolean cobrancaAutomatica,
        BigDecimal multa,
        BigDecimal juros,
        BigDecimal desconto,
        BigDecimal valorPago,
        BigDecimal valorAtualizado) {

    // Sem os valores de cobrança (o valor atualizado fica igual ao da parcela)
    public ParcelaFinanceira(Integer idPagamento, Integer idMatricula, Integer idTurma, String aluno, String curso,
                             String turma, Integer numeroParcela, Integer totalParcelas, BigDecimal valor,
                             LocalDate vencimento, LocalDate dataPagamento, String formaPagamento, String status,
                             boolean cobrancaAutomatica) {
        this(idPagamento, idMatricula, idTurma, aluno, curso, turma, numeroParcela, totalParcelas, valor, vencimento,
                dataPagamento, formaPagamento, status, cobrancaAutomatica, null, null, null, null, valor);
    }
}
