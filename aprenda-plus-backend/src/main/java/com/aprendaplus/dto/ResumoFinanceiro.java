package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.util.List;

// Indicadores do painel financeiro
public record ResumoFinanceiro(
        BigDecimal previstoNoMes,
        BigDecimal recebidoNoMes,
        BigDecimal emAtraso,
        long parcelasAtrasadas,
        BigDecimal aReceber,
        BigDecimal inadimplencia,
        List<ValorPorMes> porMes,
        List<ValorPorItem> porCurso,
        List<ValorPorItem> porForma) {

    // mes = "2026-10"
    public record ValorPorMes(String mes, BigDecimal previsto, BigDecimal recebido) {
    }

    public record ValorPorItem(String nome, BigDecimal valor) {
    }
}
