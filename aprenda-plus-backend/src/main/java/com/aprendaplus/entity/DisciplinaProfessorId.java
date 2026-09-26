package com.aprendaplus.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class DisciplinaProfessorId implements Serializable {

    private Integer disciplinaId;
    private Integer professorId;

    public DisciplinaProfessorId() {}

    public DisciplinaProfessorId(Integer disciplinaId, Integer professorId) {
        this.disciplinaId = disciplinaId;
        this.professorId = professorId;
    }

    public Integer getDisciplinaId() { return disciplinaId; }
    public void setDisciplinaId(Integer disciplinaId) { this.disciplinaId = disciplinaId; }

    public Integer getProfessorId() { return professorId; }
    public void setProfessorId(Integer professorId) { this.professorId = professorId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DisciplinaProfessorId)) return false;
        DisciplinaProfessorId that = (DisciplinaProfessorId) o;
        return Objects.equals(disciplinaId, that.disciplinaId) && Objects.equals(professorId, that.professorId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(disciplinaId, professorId);
    }
}