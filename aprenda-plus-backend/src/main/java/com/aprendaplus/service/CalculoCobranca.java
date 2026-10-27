package com.aprendaplus.service;

import com.aprendaplus.dto.CalculoParcela;
import com.aprendaplus.entity.ConfiguracaoFinanceira;
import com.aprendaplus.exception.RegraDeNegocioException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

// Contas de multa, juros e desconto de uma parcela. Não depende do Spring nem do banco.
//
// - Pagou até o vencimento: ganha o desconto de pontualidade (se houver).
// - Pagou depois do vencimento + dias de carência: multa (uma vez só) + juros de mora
//   proporcionais aos dias de atraso (juros do mês ÷ 30 por dia, contados desde o vencimento).
// - Dentro da carência: não paga encargos, mas também não ganha o desconto.
public final class CalculoCobranca {

    // Limites para evitar erro de digitação (e respeitar a multa máxima de 2% do Código de Defesa do Consumidor)
    public static final BigDecimal MULTA_MAXIMA = new BigDecimal("2.00");
    public static final BigDecimal JUROS_MAXIMO = new BigDecimal("10.00");
    public static final BigDecimal DESCONTO_MAXIMO = new BigDecimal("50.00");
    public static final int CARENCIA_MAXIMA = 30;

    private static final BigDecimal CEM = BigDecimal.valueOf(100);
    private static final BigDecimal DIAS_DO_MES = BigDecimal.valueOf(30);

    private CalculoCobranca() {
    }

    public static CalculoParcela calcular(BigDecimal valor, LocalDate vencimento, LocalDate dataPagamento,
                                          ConfiguracaoFinanceira regras) {
        return calcular(valor, vencimento, dataPagamento, regras, false, null);
    }

    // isentarEncargos: o financeiro perdoou multa e juros (ex.: negociação)
    // descontoCombinado: desconto digitado na baixa; quando vem, substitui o desconto de pontualidade
    public static CalculoParcela calcular(BigDecimal valor, LocalDate vencimento, LocalDate dataPagamento,
                                          ConfiguracaoFinanceira regras, boolean isentarEncargos,
                                          BigDecimal descontoCombinado) {
        BigDecimal original = dinheiro(valor == null ? BigDecimal.ZERO : valor);
        long diasAtraso = vencimento == null || dataPagamento == null || !dataPagamento.isAfter(vencimento)
                ? 0 : ChronoUnit.DAYS.between(vencimento, dataPagamento);
        int carencia = regras == null || regras.getDiasCarencia() == null ? 0 : Math.max(0, regras.getDiasCarencia());

        BigDecimal multa = BigDecimal.ZERO;
        BigDecimal juros = BigDecimal.ZERO;
        BigDecimal desconto = BigDecimal.ZERO;

        if (diasAtraso > carencia && !isentarEncargos) {
            multa = percentual(original, regras == null ? null : regras.getMultaPercentual());
            BigDecimal jurosMes = regras == null || regras.getJurosMesPercentual() == null
                    ? BigDecimal.ZERO : regras.getJurosMesPercentual();
            juros = original.multiply(jurosMes)
                    .multiply(BigDecimal.valueOf(diasAtraso))
                    .divide(CEM.multiply(DIAS_DO_MES), 2, RoundingMode.HALF_UP);
        } else if (diasAtraso == 0) {
            desconto = percentual(original, regras == null ? null : regras.getDescontoPontualidadePercentual());
        }

        if (descontoCombinado != null) {
            if (descontoCombinado.signum() < 0) {
                throw new RegraDeNegocioException("O desconto não pode ser negativo.");
            }
            desconto = dinheiro(descontoCombinado);
        }

        BigDecimal semDesconto = original.add(multa).add(juros);
        if (desconto.compareTo(semDesconto) > 0) {
            throw new RegraDeNegocioException("O desconto não pode ser maior que o valor a pagar.");
        }
        return new CalculoParcela(original, dinheiro(multa), dinheiro(juros), dinheiro(desconto),
                dinheiro(semDesconto.subtract(desconto)), diasAtraso, dataPagamento);
    }

    // Confere os valores digitados na tela de regras
    public static void validar(ConfiguracaoFinanceira regras) {
        if (regras == null) {
            throw new RegraDeNegocioException("Informe as regras de cobrança.");
        }
        conferirFaixa(regras.getMultaPercentual(), MULTA_MAXIMA,
                "A multa deve ficar entre 0% e 2% (limite do Código de Defesa do Consumidor).");
        conferirFaixa(regras.getJurosMesPercentual(), JUROS_MAXIMO, "Os juros devem ficar entre 0% e 10% ao mês.");
        conferirFaixa(regras.getDescontoPontualidadePercentual(), DESCONTO_MAXIMO,
                "O desconto de pontualidade deve ficar entre 0% e 50%.");
        Integer carencia = regras.getDiasCarencia();
        if (carencia == null || carencia < 0 || carencia > CARENCIA_MAXIMA) {
            throw new RegraDeNegocioException("A carência deve ficar entre 0 e 30 dias.");
        }
    }

    private static void conferirFaixa(BigDecimal valor, BigDecimal maximo, String mensagem) {
        if (valor == null || valor.signum() < 0 || valor.compareTo(maximo) > 0) {
            throw new RegraDeNegocioException(mensagem);
        }
    }

    private static BigDecimal percentual(BigDecimal valor, BigDecimal taxa) {
        if (taxa == null || taxa.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return valor.multiply(taxa).divide(CEM, 2, RoundingMode.HALF_UP);
    }

    static BigDecimal dinheiro(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
