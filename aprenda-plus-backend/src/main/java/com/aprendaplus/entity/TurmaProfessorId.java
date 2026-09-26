package com.aprendaplus.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class TurmaProfessorId implements Serializable {

    private Integer turmaId;
    private Integer professorId;

    public TurmaProfessorId() {}

    public TurmaProfessorId(Integer turmaId, Integer professorId) {
        this.turmaId = turmaId;
        this.professorId = professorId;
    }

    public Integer getTurmaId() { return turmaId; }
    public void setTurmaId(Integer turmaId) { this.turmaId = turmaId; }

    public Integer getProfessorId() { return professorId; }
    public void setProfessorId(Integer professorId) { this.professorId = professorId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TurmaProfessorId)) return false;
        TurmaProfessorId that = (TurmaProfessorId) o;
        return Objects.equals(turmaId, that.turmaId) && Objects.equals(professorId, that.professorId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(turmaId, professorId);
    }
}