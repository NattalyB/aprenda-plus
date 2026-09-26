package com.aprendaplus.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "periodo_letivo_curso")
public class PeriodoLetivoCurso {

    @EmbeddedId
    private PeriodoLetivoCursoId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("periodoLetivoId")
    @JoinColumn(name = "periodo_letivo_id")
    private PeriodoLetivo periodoLetivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cursoId")
    @JoinColumn(name = "curso_id")
    private Curso curso;

    public PeriodoLetivoCurso() {}

    public PeriodoLetivoCurso(PeriodoLetivo periodoLetivo, Curso curso) {
        this.periodoLetivo = periodoLetivo;
        this.curso = curso;
        this.id = new PeriodoLetivoCursoId(periodoLetivo.getIdPeriodoLetivo(), curso.getIdCurso());
    }

    public PeriodoLetivoCursoId getId() { return id; }
    public void setId(PeriodoLetivoCursoId id) { this.id = id; }

    public PeriodoLetivo getPeriodoLetivo() { return periodoLetivo; }
    public void setPeriodoLetivo(PeriodoLetivo periodoLetivo) { this.periodoLetivo = periodoLetivo; }

    public Curso getCurso() { return curso; }
    public void setCurso(Curso curso) { this.curso = curso; }
}