package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plano_de_aula")
public class PlanoDeAula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idPlano;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id", nullable = false)
    private Turma turma;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professor_responsavel_id", nullable = false)
    private Professor professorResponsavel;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    // Getters e Setters

    public Integer getIdPlano() { return idPlano; }
    public void setIdPlano(Integer idPlano) { this.idPlano = idPlano; }

    public Turma getTurma() { return turma; }
    public void setTurma(Turma turma) { this.turma = turma; }

    public Professor getProfessorResponsavel() { return professorResponsavel; }
    public void setProfessorResponsavel(Professor professorResponsavel) { this.professorResponsavel = professorResponsavel; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}