package com.aprendaplus.dto;

import com.aprendaplus.dto.ResumoFinanceiro.ValorPorItem;

import java.math.BigDecimal;
import java.util.List;

// Fluxo de caixa: o que entrou (parcelas pagas) e saiu (contas pagas) em cada mês,
// mais o que ainda está previsto para entrar e sair.
public record FluxoDeCaixa(
        BigDecimal entradasNoMes,
        BigDecimal saidasNoMes,
        BigDecimal saldoNoMes,
        BigDecimal aReceberNoMes,
        BigDecimal aPagarNoMes,
        long contasAtrasadas,
        BigDecimal valorContasAtrasadas,
        List<MesDoFluxo> meses,
        List<ValorPorItem> despesasPorCategoria) {

    // mes = "2026-10". Meses que já passaram só têm o realizado; o que ficou em aberto
    // (atrasado) entra como previsto no mês atual. saldo = entradas - saídas (realizado + previsto).
    public record MesDoFluxo(
            String mes,
            BigDecimal entradasRealizadas,
            BigDecimal entradasPrevistas,
            BigDecimal saidasRealizadas,
            BigDecimal saidasPrevistas,
            BigDecimal saldo,
            BigDecimal saldoAcumulado) {
    }
}
