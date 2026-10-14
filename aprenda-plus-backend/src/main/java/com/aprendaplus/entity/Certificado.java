package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Certificado de conclusão emitido para um aluno numa turma
@Entity
@Table(name = "certificado")
public class Certificado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idCertificado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Aluno aluno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id", nullable = false)
    private Turma turma;

    @Column(name = "codigo", nullable = false, length = 20, unique = true)
    private String codigo;

    @Column(name = "carga_horaria")
    private Integer cargaHoraria;

    @Column(name = "emitido_em", nullable = false)
    private LocalDateTime emitidoEm;

    public Integer getIdCertificado() { return idCertificado; }
    public void setIdCertificado(Integer idCertificado) { this.idCertificado = idCertificado; }

    public Aluno getAluno() { return aluno; }
    public void setAluno(Aluno aluno) { this.aluno = aluno; }

    public Turma getTurma() { return turma; }
    public void setTurma(Turma turma) { this.turma = turma; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public Integer getCargaHoraria() { return cargaHoraria; }
    public void setCargaHoraria(Integer cargaHoraria) { this.cargaHoraria = cargaHoraria; }

    public LocalDateTime getEmitidoEm() { return emitidoEm; }
    public void setEmitidoEm(LocalDateTime emitidoEm) { this.emitidoEm = emitidoEm; }
}
