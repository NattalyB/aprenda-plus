package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// Quanto a parcela custa se for paga numa data: valor original + multa + juros - desconto.
public record CalculoParcela(
        BigDecimal valorOriginal,
        BigDecimal multa,
        BigDecimal juros,
        BigDecimal desconto,
        BigDecimal total,
        long diasAtraso,
        LocalDate dataPagamento) {
}
