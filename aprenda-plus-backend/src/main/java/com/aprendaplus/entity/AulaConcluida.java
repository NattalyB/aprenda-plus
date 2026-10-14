package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Marca que um aluno concluiu uma aula da sala de aula EAD
@Entity
@Table(name = "aula_concluida")
public class AulaConcluida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idAulaConcluida;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Aluno aluno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aula_id", nullable = false)
    private Aula aula;

    @Column(name = "concluida_em", nullable = false)
    private LocalDateTime concluidaEm;

    public Integer getIdAulaConcluida() { return idAulaConcluida; }
    public void setIdAulaConcluida(Integer idAulaConcluida) { this.idAulaConcluida = idAulaConcluida; }

    public Aluno getAluno() { return aluno; }
    public void setAluno(Aluno aluno) { this.aluno = aluno; }

    public Aula getAula() { return aula; }
    public void setAula(Aula aula) { this.aula = aula; }

    public LocalDateTime getConcluidaEm() { return concluidaEm; }
    public void setConcluidaEm(LocalDateTime concluidaEm) { this.concluidaEm = concluidaEm; }
}
