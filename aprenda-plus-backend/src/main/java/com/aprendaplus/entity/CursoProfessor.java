package com.aprendaplus.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "curso_professor")
public class CursoProfessor {

    @EmbeddedId
    private CursoProfessorId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cursoId")
    @JoinColumn(name = "curso_id")
    private Curso curso;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("professorId")
    @JoinColumn(name = "professor_id")
    private Professor professor;

    public CursoProfessor() {}

    public CursoProfessor(Curso curso, Professor professor) {
        this.curso = curso;
        this.professor = professor;
        this.id = new CursoProfessorId(curso.getIdCurso(), professor.getIdProfessor());
    }

    public CursoProfessorId getId() { return id; }
    public void setId(CursoProfessorId id) { this.id = id; }

    public Curso getCurso() { return curso; }
    public void setCurso(Curso curso) { this.curso = curso; }

    public Professor getProfessor() { return professor; }
    public void setProfessor(Professor professor) { this.professor = professor; }
}