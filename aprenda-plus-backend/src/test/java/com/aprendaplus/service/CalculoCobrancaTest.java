package com.aprendaplus.service;

import com.aprendaplus.dto.CalculoParcela;
import com.aprendaplus.entity.ConfiguracaoFinanceira;
import com.aprendaplus.exception.RegraDeNegocioException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class CalculoCobrancaTest {

    private static final LocalDate VENCIMENTO = LocalDate.of(2026, 10, 10);
    private static final BigDecimal VALOR = new BigDecimal("500.00");

    private static ConfiguracaoFinanceira regras(String multa, String juros, String desconto, int carencia) {
        ConfiguracaoFinanceira r = new ConfiguracaoFinanceira();
        r.setMultaPercentual(new BigDecimal(multa));
        r.setJurosMesPercentual(new BigDecimal(juros));
        r.setDescontoPontualidadePercentual(new BigDecimal(desconto));
        r.setDiasCarencia(carencia);
        return r;
    }

    private static BigDecimal r$(String valor) {
        return new BigDecimal(valor);
    }

    @Test
    void pagouAtrasadoPagaMultaEJurosPorDia() {
        // 15 dias de atraso: multa 2% = 10,00; juros 1% ao mês = 500 x 1% x 15/30 = 2,50
        CalculoParcela c = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(15), regras("2", "1", "5", 0));
        assertEquals(r$("500.00"), c.valorOriginal());
        assertEquals(r$("10.00"), c.multa());
        assertEquals(r$("2.50"), c.juros());
        assertEquals(r$("0.00"), c.desconto());
        assertEquals(r$("512.50"), c.total());
        assertEquals(15L, c.diasAtraso());
    }

    @Test
    void pagouEmDiaGanhaODescontoDePontualidade() {
        CalculoParcela noDia = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO, regras("2", "1", "5", 0));
        assertEquals(r$("25.00"), noDia.desconto());
        assertEquals(r$("475.00"), noDia.total());
        assertEquals(0L, noDia.diasAtraso());

        CalculoParcela antes = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.minusDays(3), regras("2", "1", "5", 0));
        assertEquals(r$("475.00"), antes.total());
    }

    @Test
    void dentroDaCarenciaNaoPagaEncargosNemGanhaDesconto() {
        CalculoParcela c = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(3), regras("2", "1", "5", 3));
        assertEquals(r$("0.00"), c.multa());
        assertEquals(r$("0.00"), c.juros());
        assertEquals(r$("0.00"), c.desconto());
        assertEquals(r$("500.00"), c.total());

        // Passou da carência: os juros contam desde o vencimento
        CalculoParcela depois = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(4), regras("2", "1", "0", 3));
        assertEquals(r$("10.00"), depois.multa());
        assertEquals(r$("0.67"), depois.juros());
        assertEquals(r$("510.67"), depois.total());
    }

    @Test
    void isentarTiraMultaEJuros() {
        CalculoParcela c = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(40), regras("2", "1", "0", 0),
                true, null);
        assertEquals(r$("500.00"), c.total());
        assertEquals(40L, c.diasAtraso());
    }

    @Test
    void descontoCombinadoSubstituiOdePontualidade() {
        CalculoParcela emDia = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO, regras("2", "1", "5", 0),
                false, r$("50"));
        assertEquals(r$("50.00"), emDia.desconto());
        assertEquals(r$("450.00"), emDia.total());

        // Atrasado com desconto negociado: encargos - desconto
        CalculoParcela atrasado = CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(30), regras("2", "1", "0", 0),
                false, r$("15.00"));
        assertEquals(r$("500.00"), atrasado.total()); // 500 + 10 + 5 - 15
    }

    @Test
    void descontoInvalidoEhRecusado() {
        assertEquals("O desconto não pode ser negativo.", assertThrows(RegraDeNegocioException.class,
                () -> CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO, null, false, r$("-1"))).getMessage());
        assertEquals("O desconto não pode ser maior que o valor a pagar.", assertThrows(RegraDeNegocioException.class,
                () -> CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO, null, false, r$("500.01"))).getMessage());
    }

    @Test
    void semRegrasOuSemDatasNaoMudaOValor() {
        assertEquals(r$("500.00"), CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(90), null).total());
        assertEquals(r$("500.00"), CalculoCobranca.calcular(VALOR, null, VENCIMENTO, regras("2", "1", "5", 0)).total()
                .add(r$("25.00")));
        assertEquals(r$("0.00"), CalculoCobranca.calcular(null, VENCIMENTO, VENCIMENTO, null).total());
        ConfiguracaoFinanceira vazia = new ConfiguracaoFinanceira();
        vazia.setMultaPercentual(null);
        vazia.setJurosMesPercentual(null);
        vazia.setDiasCarencia(null);
        assertEquals(r$("500.00"), CalculoCobranca.calcular(VALOR, VENCIMENTO, VENCIMENTO.plusDays(5), vazia).total());
    }

    @Test
    void validaAsRegras() {
        CalculoCobranca.validar(regras("2", "1", "10", 5));
        assertEquals("A multa deve ficar entre 0% e 2% (limite do Código de Defesa do Consumidor).",
                assertThrows(RegraDeNegocioException.class, () -> CalculoCobranca.validar(regras("2.5", "1", "0", 0))).getMessage());
        assertEquals("Os juros devem ficar entre 0% e 10% ao mês.",
                assertThrows(RegraDeNegocioException.class, () -> CalculoCobranca.validar(regras("2", "-1", "0", 0))).getMessage());
        assertEquals("O desconto de pontualidade deve ficar entre 0% e 50%.",
                assertThrows(RegraDeNegocioException.class, () -> CalculoCobranca.validar(regras("2", "1", "60", 0))).getMessage());
        assertEquals("A carência deve ficar entre 0 e 30 dias.",
                assertThrows(RegraDeNegocioException.class, () -> CalculoCobranca.validar(regras("2", "1", "0", 31))).getMessage());
        ConfiguracaoFinanceira semCarencia = regras("2", "1", "0", 0);
        semCarencia.setDiasCarencia(null);
        assertThrows(RegraDeNegocioException.class, () -> CalculoCobranca.validar(semCarencia));
        assertEquals("Informe as regras de cobrança.",
                assertThrows(RegraDeNegocioException.class, () -> CalculoCobranca.validar(null)).getMessage());
    }
}
