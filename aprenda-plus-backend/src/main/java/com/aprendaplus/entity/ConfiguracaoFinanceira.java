package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// Regras de cobrança das parcelas (uma linha só, id = 1):
// multa e juros para quem paga depois do vencimento e desconto para quem paga em dia.
@Entity
@Table(name = "configuracao_financeira")
public class ConfiguracaoFinanceira {

    public static final int ID_UNICO = 1;

    @Id
    @Column(name = "id")
    private Integer id = ID_UNICO;

    // Multa única sobre a parcela atrasada (ex.: 2.00 = 2%)
    @Column(name = "multa_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal multaPercentual = BigDecimal.ZERO;

    // Juros de mora por mês de atraso, cobrados por dia (ex.: 1.00 = 1% ao mês)
    @Column(name = "juros_mes_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal jurosMesPercentual = BigDecimal.ZERO;

    // Desconto para quem paga até o vencimento (ex.: 5.00 = 5%)
    @Column(name = "desconto_pontualidade_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal descontoPontualidadePercentual = BigDecimal.ZERO;

    // Dias de tolerância depois do vencimento sem multa nem juros
    @Column(name = "dias_carencia", nullable = false)
    private Integer diasCarencia = 0;

    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public BigDecimal getMultaPercentual() { return multaPercentual; }
    public void setMultaPercentual(BigDecimal multaPercentual) { this.multaPercentual = multaPercentual; }

    public BigDecimal getJurosMesPercentual() { return jurosMesPercentual; }
    public void setJurosMesPercentual(BigDecimal jurosMesPercentual) { this.jurosMesPercentual = jurosMesPercentual; }

    public BigDecimal getDescontoPontualidadePercentual() { return descontoPontualidadePercentual; }
    public void setDescontoPontualidadePercentual(BigDecimal descontoPontualidadePercentual) {
        this.descontoPontualidadePercentual = descontoPontualidadePercentual;
    }

    public Integer getDiasCarencia() { return diasCarencia; }
    public void setDiasCarencia(Integer diasCarencia) { this.diasCarencia = diasCarencia; }

    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}
