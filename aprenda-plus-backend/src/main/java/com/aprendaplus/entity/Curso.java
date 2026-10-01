package com.aprendaplus.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "curso")
public class Curso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idCurso;

    @Column(name = "nome", nullable = false, length = 150)
    private String nome;

    @Column(name = "categoria", nullable = false, length = 30)
    private String categoria;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(columnDefinition = "TEXT")
    private String conteudo;

    @Column(name = "carga_horaria", nullable = false)
    private Integer cargaHoraria;

    @Column(name = "modalidade", nullable = false, length = 30)
    private String modalidade;

    @Column(name = "pre_requisitos", columnDefinition = "TEXT")
    private String preRequisitos;

    @Column(name = "valor", nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    // Em quantas parcelas mensais o curso é pago (opcional).
    // O front calcula a mensalidade: valor / numeroParcelas
    @Min(value = 1, message = "O número de parcelas deve ser no mínimo 1.")
    @Max(value = 120, message = "O número de parcelas deve ser no máximo 120.")
    @Column(name = "numero_parcelas")
    private Integer numeroParcelas;

    @Column(name = "formas_pagamento", length = 150)
    private String formasPagamento;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    // Getters e Setters

    public Integer getIdCurso() { return idCurso; }
    public void setIdCurso(Integer idCurso) { this.idCurso = idCurso; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getConteudo() { return conteudo; }
    public void setConteudo(String conteudo) { this.conteudo = conteudo; }

    public Integer getCargaHoraria() { return cargaHoraria; }
    public void setCargaHoraria(Integer cargaHoraria) { this.cargaHoraria = cargaHoraria; }

    public String getModalidade() { return modalidade; }
    public void setModalidade(String modalidade) { this.modalidade = modalidade; }

    public String getPreRequisitos() { return preRequisitos; }
    public void setPreRequisitos(String preRequisitos) { this.preRequisitos = preRequisitos; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public Integer getNumeroParcelas() { return numeroParcelas; }
    public void setNumeroParcelas(Integer numeroParcelas) { this.numeroParcelas = numeroParcelas; }

    public String getFormasPagamento() { return formasPagamento; }
    public void setFormasPagamento(String formasPagamento) { this.formasPagamento = formasPagamento; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}