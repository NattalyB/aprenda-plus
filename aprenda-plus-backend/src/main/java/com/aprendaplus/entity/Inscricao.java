package com.aprendaplus.entity;

import com.aprendaplus.dto.PartePagamento;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "inscricao")
public class Inscricao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idInscricao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Aluno aluno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id", nullable = false)
    private Turma turma;

    @Column(name = "data_inscricao", insertable = false, updatable = false)
    private LocalDateTime dataInscricao;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "pendente_pagamento";

    // Texto legível: "Pix à vista (5% de desconto)", "Cartão de crédito · 10x"
    // ou, no pagamento dividido, "Cartão de crédito · 10x (R$ 1.500,00) + Boleto bancário · 3x (R$ 900,00)"
    @Column(name = "forma_pagamento", length = 255)
    private String formaPagamento;

    // Só na compra pelo site: as formas escolhidas quando o aluno divide o pagamento.
    // Não é uma coluna: o InscricaoService confere tudo e grava as partes em inscricao_pagamento.
    @Transient
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private List<PartePagamento> pagamentoDividido;

    @Column(name = "valor_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    // Getters e Setters

    public Integer getIdInscricao() { return idInscricao; }
    public void setIdInscricao(Integer idInscricao) { this.idInscricao = idInscricao; }

    public Aluno getAluno() { return aluno; }
    public void setAluno(Aluno aluno) { this.aluno = aluno; }

    public Turma getTurma() { return turma; }
    public void setTurma(Turma turma) { this.turma = turma; }

    public LocalDateTime getDataInscricao() { return dataInscricao; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }

    public BigDecimal getValorTotal() { return valorTotal; }
    public void setValorTotal(BigDecimal valorTotal) { this.valorTotal = valorTotal; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }

    public List<PartePagamento> getPagamentoDividido() { return pagamentoDividido; }
    public void setPagamentoDividido(List<PartePagamento> pagamentoDividido) { this.pagamentoDividido = pagamentoDividido; }
}
