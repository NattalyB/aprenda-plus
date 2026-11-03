package com.aprendaplus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

// Uma parte do pagamento de uma inscrição paga com mais de uma forma
// (ex.: R$ 1.500 em um cartão em 10x e o restante em outro cartão em 5x).
// valor = quanto desta inscrição é pago nesta forma, já com o desconto do Pix.
@Entity
@Table(name = "inscricao_pagamento")
public class InscricaoPagamento {

    public static final String PIX = "pix";
    public static final String CARTAO = "cartao";
    public static final String BOLETO = "boleto";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idParte;

    @Column(name = "inscricao_id", nullable = false)
    private Integer inscricaoId;

    // 1 = primeira forma escolhida, 2 = segunda
    @Column(name = "ordem", nullable = false)
    private Integer ordem;

    // pix | cartao | boleto
    @Column(name = "forma", nullable = false, length = 10)
    private String forma;

    @Column(name = "parcelas", nullable = false)
    private Integer parcelas;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    public InscricaoPagamento() {
    }

    public InscricaoPagamento(Integer ordem, String forma, Integer parcelas, BigDecimal valor) {
        this.ordem = ordem;
        this.forma = forma;
        this.parcelas = parcelas;
        this.valor = valor;
    }

    public Integer getIdParte() { return idParte; }
    public void setIdParte(Integer idParte) { this.idParte = idParte; }

    public Integer getInscricaoId() { return inscricaoId; }
    public void setInscricaoId(Integer inscricaoId) { this.inscricaoId = inscricaoId; }

    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }

    public String getForma() { return forma; }
    public void setForma(String forma) { this.forma = forma; }

    public Integer getParcelas() { return parcelas; }
    public void setParcelas(Integer parcelas) { this.parcelas = parcelas; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    // Pix é sempre à vista (1 parcela)
    public int quantidadeDeParcelas() {
        if (PIX.equals(forma)) {
            return 1;
        }
        return parcelas == null ? 1 : Math.max(1, Math.min(parcelas, 120));
    }

    // Nome que aparece nas parcelas do financeiro
    public String nomeDaForma() {
        if (PIX.equals(forma)) return "Pix";
        if (CARTAO.equals(forma)) return "Cartão de crédito";
        if (BOLETO.equals(forma)) return "Boleto bancário";
        return forma;
    }
}
