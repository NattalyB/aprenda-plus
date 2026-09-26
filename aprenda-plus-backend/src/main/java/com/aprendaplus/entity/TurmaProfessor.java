package com.aprendaplus.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "turma_professor")
public class TurmaProfessor {

    @EmbeddedId
    private TurmaProfessorId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("turmaId")
    @JoinColumn(name = "turma_id")
    private Turma turma;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("professorId")
    @JoinColumn(name = "professor_id")
    private Professor professor;

    @Column(name = "papel", nullable = false, length = 20)
    private String papel = "principal";

    public TurmaProfessor() {}

    public TurmaProfessor(Turma turma, Professor professor, String papel) {
        this.turma = turma;
        this.professor = professor;
        this.papel = papel;
        this.id = new TurmaProfessorId(turma.getIdTurma(), professor.getIdProfessor());
    }

    public TurmaProfessorId getId() { return id; }
    public void setId(TurmaProfessorId id) { this.id = id; }

    public Turma getTurma() { return turma; }
    public void setTurma(Turma turma) { this.turma = turma; }

    public Professor getProfessor() { return professor; }
    public void setProfessor(Professor professor) { this.professor = professor; }

    public String getPapel() { return papel; }
    public void setPapel(String papel) { this.papel = papel; }
}