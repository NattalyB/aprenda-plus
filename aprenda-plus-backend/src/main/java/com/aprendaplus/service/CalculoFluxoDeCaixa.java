package com.aprendaplus.service;

import com.aprendaplus.dto.FluxoDeCaixa;
import com.aprendaplus.dto.FluxoDeCaixa.MesDoFluxo;
import com.aprendaplus.dto.ResumoFinanceiro.ValorPorItem;
import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.entity.Pagamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;

// Monta o fluxo de caixa a partir das parcelas (entradas) e das contas a pagar (saídas).
// Não depende do Spring nem do banco.
public final class CalculoFluxoDeCaixa {

    private static final Set<String> PARCELA_EM_ABERTO = Set.of(FinanceiroService.PENDENTE, FinanceiroService.ATRASADO);
    static final int MESES_ANTES = 5;
    static final int MESES_DEPOIS = 6;

    private CalculoFluxoDeCaixa() {
    }

    public static FluxoDeCaixa montar(List<Pagamento> parcelas, List<ContaPagar> contas, LocalDate hoje) {
        YearMonth atual = YearMonth.from(hoje);

        List<Pagamento> parcelasPagas = parcelas.stream()
                .filter(p -> FinanceiroService.PAGO.equals(p.getStatus()) && p.getDataPagamento() != null).toList();
        List<Pagamento> parcelasAbertas = parcelas.stream()
                .filter(p -> PARCELA_EM_ABERTO.contains(p.getStatus()) && p.getDataVencimento() != null).toList();
        List<ContaPagar> contasPagas = contas.stream()
                .filter(c -> ContaPagar.PAGO.equals(c.getStatus()) && c.getDataPagamento() != null).toList();
        List<ContaPagar> contasAbertas = contas.stream()
                .filter(c -> ContaPagar.PENDENTE.equals(c.getStatus()) && c.getDataVencimento() != null).toList();

        List<MesDoFluxo> meses = new ArrayList<>();
        BigDecimal acumulado = BigDecimal.ZERO;
        for (int i = -MESES_ANTES; i <= MESES_DEPOIS; i++) {
            YearMonth mes = atual.plusMonths(i);
            BigDecimal entradas = somar(parcelasPagas, p -> mes.equals(YearMonth.from(p.getDataPagamento())),
                    Pagamento::getValorRecebido);
            BigDecimal saidas = somar(contasPagas, c -> mes.equals(YearMonth.from(c.getDataPagamento())),
                    ContaPagar::getValor);
            BigDecimal entradasPrevistas = somar(parcelasAbertas, p -> mes.equals(mesPrevisto(p.getDataVencimento(), atual)),
                    Pagamento::getValorParcela);
            BigDecimal saidasPrevistas = somar(contasAbertas, c -> mes.equals(mesPrevisto(c.getDataVencimento(), atual)),
                    ContaPagar::getValor);
            BigDecimal saldo = entradas.add(entradasPrevistas).subtract(saidas).subtract(saidasPrevistas);
            acumulado = acumulado.add(saldo);
            meses.add(new MesDoFluxo(mes.toString(), entradas, entradasPrevistas, saidas, saidasPrevistas, saldo, acumulado));
        }

        MesDoFluxo doMes = meses.get(MESES_ANTES);
        List<ContaPagar> atrasadas = contasAbertas.stream().filter(c -> c.getDataVencimento().isBefore(hoje)).toList();

        // Despesas do mês atual por categoria (pagas no mês + em aberto vencendo no mês)
        Map<String, BigDecimal> porCategoria = new LinkedHashMap<>();
        for (ContaPagar c : contas) {
            boolean pagaNoMes = ContaPagar.PAGO.equals(c.getStatus()) && c.getDataPagamento() != null
                    && atual.equals(YearMonth.from(c.getDataPagamento()));
            boolean venceNoMes = ContaPagar.PENDENTE.equals(c.getStatus()) && c.getDataVencimento() != null
                    && atual.equals(YearMonth.from(c.getDataVencimento()));
            if ((pagaNoMes || venceNoMes) && c.getValor() != null) {
                String categoria = c.getCategoria() == null || c.getCategoria().isBlank() ? "Outros" : c.getCategoria();
                porCategoria.merge(categoria, c.getValor(), BigDecimal::add);
            }
        }
        List<ValorPorItem> despesas = porCategoria.entrySet().stream()
                .map(e -> new ValorPorItem(e.getKey(), dinheiro(e.getValue())))
                .sorted(Comparator.comparing(ValorPorItem::valor).reversed().thenComparing(ValorPorItem::nome))
                .toList();

        return new FluxoDeCaixa(
                doMes.entradasRealizadas(),
                doMes.saidasRealizadas(),
                dinheiro(doMes.entradasRealizadas().subtract(doMes.saidasRealizadas())),
                doMes.entradasPrevistas(),
                doMes.saidasPrevistas(),
                atrasadas.size(),
                somar(atrasadas, c -> true, ContaPagar::getValor),
                meses,
                despesas);
    }

    // O que venceu em meses passados e não foi pago fica previsto para o mês atual
    static YearMonth mesPrevisto(LocalDate vencimento, YearMonth atual) {
        YearMonth mes = YearMonth.from(vencimento);
        return mes.isBefore(atual) ? atual : mes;
    }

    private static <T> BigDecimal somar(List<T> itens, Predicate<T> filtro, Function<T, BigDecimal> valor) {
        return dinheiro(itens.stream()
                .filter(filtro)
                .map(valor)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private static BigDecimal dinheiro(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
