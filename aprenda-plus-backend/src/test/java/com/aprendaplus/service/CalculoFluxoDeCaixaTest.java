package com.aprendaplus.service;

import com.aprendaplus.dto.FluxoDeCaixa;
import com.aprendaplus.dto.FluxoDeCaixa.MesDoFluxo;
import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.entity.Pagamento;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CalculoFluxoDeCaixaTest {

    private static final LocalDate HOJE = LocalDate.of(2026, 10, 20);

    private static Pagamento parcela(String valor, LocalDate vencimento, String status, LocalDate pagoEm, String valorPago) {
        Pagamento p = new Pagamento();
        p.setValorParcela(new BigDecimal(valor));
        p.setDataVencimento(vencimento);
        p.setStatus(status);
        p.setDataPagamento(pagoEm);
        p.setValorPago(valorPago == null ? null : new BigDecimal(valorPago));
        return p;
    }

    private static ContaPagar conta(String categoria, String valor, LocalDate vencimento, String status, LocalDate pagaEm) {
        ContaPagar c = new ContaPagar();
        c.setCategoria(categoria);
        c.setValor(new BigDecimal(valor));
        c.setDataVencimento(vencimento);
        c.setStatus(status);
        c.setDataPagamento(pagaEm);
        return c;
    }

    private static BigDecimal r$(String valor) {
        return new BigDecimal(valor);
    }

    private static MesDoFluxo mes(FluxoDeCaixa f, String mes) {
        return f.meses().stream().filter(m -> m.mes().equals(mes)).findFirst().orElseThrow();
    }

    @Test
    void separaRealizadoEPrevistoPorMes() {
        List<Pagamento> parcelas = List.of(
                // paga em setembro com juros (vale o valor pago)
                parcela("500", LocalDate.of(2026, 9, 5), "pago", LocalDate.of(2026, 9, 12), "510.00"),
                // paga em outubro (parcela antiga, sem valor pago: vale o valor da parcela)
                parcela("500", LocalDate.of(2026, 10, 5), "pago", LocalDate.of(2026, 10, 5), null),
                // atrasada de setembro: entra como prevista em outubro
                parcela("300", LocalDate.of(2026, 9, 25), "atrasado", null, null),
                // a vencer em novembro
                parcela("500", LocalDate.of(2026, 11, 5), "pendente", null, null),
                // cancelada: não conta
                parcela("999", LocalDate.of(2026, 11, 5), "cancelado", null, null));
        List<ContaPagar> contas = List.of(
                conta("Aluguel", "1000", LocalDate.of(2026, 10, 10), "pago", LocalDate.of(2026, 10, 10)),
                conta("Energia", "200", LocalDate.of(2026, 10, 15), "pendente", null),   // atrasada
                conta("Energia", "150", LocalDate.of(2026, 9, 15), "pendente", null),    // atrasada de setembro
                conta("Aluguel", "1000", LocalDate.of(2026, 11, 10), "pendente", null),
                conta("Outros", "50", LocalDate.of(2026, 10, 1), "cancelado", null));

        FluxoDeCaixa f = CalculoFluxoDeCaixa.montar(parcelas, contas, HOJE);

        assertEquals(12, f.meses().size());
        assertEquals("2026-05", f.meses().get(0).mes());
        assertEquals("2027-04", f.meses().get(11).mes());

        MesDoFluxo setembro = mes(f, "2026-09");
        assertEquals(r$("510.00"), setembro.entradasRealizadas());
        assertEquals(r$("0.00"), setembro.entradasPrevistas());
        assertEquals(r$("0.00"), setembro.saidasPrevistas());
        assertEquals(r$("510.00"), setembro.saldo());

        MesDoFluxo outubro = mes(f, "2026-10");
        assertEquals(r$("500.00"), outubro.entradasRealizadas());
        assertEquals(r$("300.00"), outubro.entradasPrevistas());
        assertEquals(r$("1000.00"), outubro.saidasRealizadas());
        assertEquals(r$("350.00"), outubro.saidasPrevistas());
        assertEquals(r$("-550.00"), outubro.saldo());
        assertEquals(r$("-40.00"), outubro.saldoAcumulado());

        MesDoFluxo novembro = mes(f, "2026-11");
        assertEquals(r$("500.00"), novembro.entradasPrevistas());
        assertEquals(r$("1000.00"), novembro.saidasPrevistas());
        assertEquals(r$("-540.00"), novembro.saldoAcumulado());

        // Indicadores do mês atual
        assertEquals(r$("500.00"), f.entradasNoMes());
        assertEquals(r$("1000.00"), f.saidasNoMes());
        assertEquals(r$("-500.00"), f.saldoNoMes());
        assertEquals(r$("300.00"), f.aReceberNoMes());
        assertEquals(r$("350.00"), f.aPagarNoMes());
        assertEquals(2L, f.contasAtrasadas());
        assertEquals(r$("350.00"), f.valorContasAtrasadas());

        // Despesas de outubro por categoria (paga + a vencer no mês; a de setembro e a cancelada não entram)
        assertEquals(2, f.despesasPorCategoria().size());
        assertEquals("Aluguel", f.despesasPorCategoria().get(0).nome());
        assertEquals(r$("1000.00"), f.despesasPorCategoria().get(0).valor());
        assertEquals("Energia", f.despesasPorCategoria().get(1).nome());
        assertEquals(r$("200.00"), f.despesasPorCategoria().get(1).valor());
    }

    @Test
    void semNadaTudoZerado() {
        FluxoDeCaixa f = CalculoFluxoDeCaixa.montar(List.of(), List.of(), HOJE);
        assertEquals(12, f.meses().size());
        assertEquals(r$("0.00"), f.saldoNoMes());
        assertEquals(0L, f.contasAtrasadas());
        assertTrue(f.despesasPorCategoria().isEmpty());
    }

    @Test
    void contaSemCategoriaViraOutros() {
        ContaPagar semCategoria = conta(" ", "80", HOJE, "pendente", null);
        FluxoDeCaixa f = CalculoFluxoDeCaixa.montar(List.of(), List.of(semCategoria), HOJE);
        assertEquals("Outros", f.despesasPorCategoria().get(0).nome());
        assertEquals(0L, f.contasAtrasadas()); // vence hoje: ainda não está atrasada
    }

    @Test
    void oQueVenceuNoPassadoFicaPrevistoParaOMesAtual() {
        YearMonth atual = YearMonth.of(2026, 10);
        assertEquals(atual, CalculoFluxoDeCaixa.mesPrevisto(LocalDate.of(2026, 3, 1), atual));
        assertEquals(YearMonth.of(2026, 12), CalculoFluxoDeCaixa.mesPrevisto(LocalDate.of(2026, 12, 1), atual));
    }
}
