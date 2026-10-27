package com.aprendaplus.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

// Conta a pagar (despesa da escola): aluguel, luz, internet, impostos, pagamento de professores...
// O pagamento de hora-aula dos professores também vira uma conta (professorId + referência do mês).
@Entity
@Table(name = "conta_pagar")
public class ContaPagar {

    public static final String PENDENTE = "pendente";
    public static final String PAGO = "pago";
    public static final String CANCELADO = "cancelado";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idConta;

    @Column(name = "descricao", nullable = false, length = 150)
    private String descricao;

    @Column(name = "categoria", nullable = false, length = 40)
    private String categoria;

    // Quem recebe (empresa, pessoa, professor)
    @Column(name = "fornecedor", length = 150)
    private String fornecedor;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "data_vencimento", nullable = false)
    private LocalDate dataVencimento;

    @Column(name = "data_pagamento")
    private LocalDate dataPagamento;

    @Column(name = "forma_pagamento", length = 50)
    private String formaPagamento;

    // pendente, pago ou cancelado ("atrasado" é calculado: pendente com vencimento passado)
    @Column(name = "status", nullable = false, length = 20)
    private String status = PENDENTE;

    @Column(name = "observacao", length = 500)
    private String observacao;

    // Pagamento de professor: quem é, de qual mês ("2026-10"), quantas horas e o valor da hora
    @Column(name = "professor_id")
    private Integer professorId;

    @Column(name = "referencia", length = 7)
    private String referencia;

    @Column(name = "horas", precision = 6, scale = 2)
    private BigDecimal horas;

    @Column(name = "valor_hora", precision = 10, scale = 2)
    private BigDecimal valorHora;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    // Situação para a tela: pendente que já venceu aparece como atrasada
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public String getSituacao() {
        if (PENDENTE.equals(status) && dataVencimento != null
                && dataVencimento.isBefore(LocalDate.now(ZoneId.of("America/Sao_Paulo")))) {
            return "atrasado";
        }
        return status;
    }

    public Integer getIdConta() { return idConta; }
    public void setIdConta(Integer idConta) { this.idConta = idConta; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public String getFornecedor() { return fornecedor; }
    public void setFornecedor(String fornecedor) { this.fornecedor = fornecedor; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public LocalDate getDataVencimento() { return dataVencimento; }
    public void setDataVencimento(LocalDate dataVencimento) { this.dataVencimento = dataVencimento; }

    public LocalDate getDataPagamento() { return dataPagamento; }
    public void setDataPagamento(LocalDate dataPagamento) { this.dataPagamento = dataPagamento; }

    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }

    public Integer getProfessorId() { return professorId; }
    public void setProfessorId(Integer professorId) { this.professorId = professorId; }

    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }

    public BigDecimal getHoras() { return horas; }
    public void setHoras(BigDecimal horas) { this.horas = horas; }

    public BigDecimal getValorHora() { return valorHora; }
    public void setValorHora(BigDecimal valorHora) { this.valorHora = valorHora; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
}
