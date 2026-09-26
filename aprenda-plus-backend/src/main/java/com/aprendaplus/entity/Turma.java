package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "turma")
public class Turma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idTurma;

    @Column(name = "nome", nullable = false, length = 100)
    private String nome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "periodo_letivo_id", nullable = false)
    private PeriodoLetivo periodoLetivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;

    @Column(name = "carga_horaria")
    private Integer cargaHoraria;

    @Column(name = "modalidade", length = 30)
    private String modalidade;

    @Column(name = "capacidade_maxima", nullable = false)
    private Integer capacidadeMaxima;

    @Column(name = "dias_horarios", length = 150)
    private String diasHorarios;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "inscricoes_abertas";

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    // Getters e Setters

    public Integer getIdTurma() { return idTurma; }
    public void setIdTurma(Integer idTurma) { this.idTurma = idTurma; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public PeriodoLetivo getPeriodoLetivo() { return periodoLetivo; }
    public void setPeriodoLetivo(PeriodoLetivo periodoLetivo) { this.periodoLetivo = periodoLetivo; }

    public Curso getCurso() { return curso; }
    public void setCurso(Curso curso) { this.curso = curso; }

    public Integer getCargaHoraria() { return cargaHoraria; }
    public void setCargaHoraria(Integer cargaHoraria) { this.cargaHoraria = cargaHoraria; }

    public String getModalidade() { return modalidade; }
    public void setModalidade(String modalidade) { this.modalidade = modalidade; }

    public Integer getCapacidadeMaxima() { return capacidadeMaxima; }
    public void setCapacidadeMaxima(Integer capacidadeMaxima) { this.capacidadeMaxima = capacidadeMaxima; }

    public String getDiasHorarios() { return diasHorarios; }
    public void setDiasHorarios(String diasHorarios) { this.diasHorarios = diasHorarios; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}