package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

// Valor da hora-aula de cada professor (fica separado do cadastro do professor,
// para só quem tem o módulo Financeiro ver e mudar)
@Entity
@Table(name = "professor_hora_aula")
public class ProfessorHoraAula {

    @Id
    @Column(name = "professor_id")
    private Integer professorId;

    @Column(name = "valor_hora", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorHora;

    public ProfessorHoraAula() {
    }

    public ProfessorHoraAula(Integer professorId, BigDecimal valorHora) {
        this.professorId = professorId;
        this.valorHora = valorHora;
    }

    public Integer getProfessorId() { return professorId; }
    public void setProfessorId(Integer professorId) { this.professorId = professorId; }

    public BigDecimal getValorHora() { return valorHora; }
    public void setValorHora(BigDecimal valorHora) { this.valorHora = valorHora; }
}
