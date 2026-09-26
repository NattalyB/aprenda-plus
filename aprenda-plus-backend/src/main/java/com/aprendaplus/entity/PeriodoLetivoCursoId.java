package com.aprendaplus.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class PeriodoLetivoCursoId implements Serializable {

    private Integer periodoLetivoId;
    private Integer cursoId;

    public PeriodoLetivoCursoId() {}

    public PeriodoLetivoCursoId(Integer periodoLetivoId, Integer cursoId) {
        this.periodoLetivoId = periodoLetivoId;
        this.cursoId = cursoId;
    }

    public Integer getPeriodoLetivoId() { return periodoLetivoId; }
    public void setPeriodoLetivoId(Integer periodoLetivoId) { this.periodoLetivoId = periodoLetivoId; }

    public Integer getCursoId() { return cursoId; }
    public void setCursoId(Integer cursoId) { this.cursoId = cursoId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PeriodoLetivoCursoId)) return false;
        PeriodoLetivoCursoId that = (PeriodoLetivoCursoId) o;
        return Objects.equals(periodoLetivoId, that.periodoLetivoId) && Objects.equals(cursoId, that.cursoId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(periodoLetivoId, cursoId);
    }
}