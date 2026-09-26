package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "matricula")
public class Matricula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idMatricula;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Aluno aluno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id", nullable = false)
    private Turma turma;

    @Column(name = "data_matricula", insertable = false, updatable = false)
    private LocalDate dataMatricula;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ativa";

    @Column(name = "contrato_url", length = 255)
    private String contratoUrl;

    @Column(name = "plano_pagamento", length = 50)
    private String planoPagamento;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    // Getters e Setters

    public Integer getIdMatricula() { return idMatricula; }
    public void setIdMatricula(Integer idMatricula) { this.idMatricula = idMatricula; }

    public Aluno getAluno() { return aluno; }
    public void setAluno(Aluno aluno) { this.aluno = aluno; }

    public Turma getTurma() { return turma; }
    public void setTurma(Turma turma) { this.turma = turma; }

    public LocalDate getDataMatricula() { return dataMatricula; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getContratoUrl() { return contratoUrl; }
    public void setContratoUrl(String contratoUrl) { this.contratoUrl = contratoUrl; }

    public String getPlanoPagamento() { return planoPagamento; }
    public void setPlanoPagamento(String planoPagamento) { this.planoPagamento = planoPagamento; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}