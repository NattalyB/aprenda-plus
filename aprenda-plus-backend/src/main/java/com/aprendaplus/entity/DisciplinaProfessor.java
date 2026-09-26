package com.aprendaplus.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "disciplina_professor")
public class DisciplinaProfessor {

    @EmbeddedId
    private DisciplinaProfessorId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("disciplinaId")
    @JoinColumn(name = "disciplina_id")
    private Disciplina disciplina;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("professorId")
    @JoinColumn(name = "professor_id")
    private Professor professor;

    public DisciplinaProfessor() {}

    public DisciplinaProfessor(Disciplina disciplina, Professor professor) {
        this.disciplina = disciplina;
        this.professor = professor;
        this.id = new DisciplinaProfessorId(disciplina.getIdDisciplina(), professor.getIdProfessor());
    }

    public DisciplinaProfessorId getId() { return id; }
    public void setId(DisciplinaProfessorId id) { this.id = id; }

    public Disciplina getDisciplina() { return disciplina; }
    public void setDisciplina(Disciplina disciplina) { this.disciplina = disciplina; }

    public Professor getProfessor() { return professor; }
    public void setProfessor(Professor professor) { this.professor = professor; }
}