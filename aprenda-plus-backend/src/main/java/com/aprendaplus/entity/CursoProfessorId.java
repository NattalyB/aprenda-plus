package com.aprendaplus.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class CursoProfessorId implements Serializable {

    private Integer cursoId;
    private Integer professorId;

    public CursoProfessorId() {}

    public CursoProfessorId(Integer cursoId, Integer professorId) {
        this.cursoId = cursoId;
        this.professorId = professorId;
    }

    public Integer getCursoId() { return cursoId; }
    public void setCursoId(Integer cursoId) { this.cursoId = cursoId; }

    public Integer getProfessorId() { return professorId; }
    public void setProfessorId(Integer professorId) { this.professorId = professorId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CursoProfessorId)) return false;
        CursoProfessorId that = (CursoProfessorId) o;
        return Objects.equals(cursoId, that.cursoId) && Objects.equals(professorId, that.professorId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(cursoId, professorId);
    }
}