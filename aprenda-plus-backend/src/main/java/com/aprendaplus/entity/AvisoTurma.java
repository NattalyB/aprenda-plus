package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Aviso do mural da turma (aparece na sala de aula dos alunos)
@Entity
@Table(name = "aviso_turma")
public class AvisoTurma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idAviso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id", nullable = false)
    private Turma turma;

    @Column(name = "titulo", nullable = false, length = 120)
    private String titulo;

    @Column(name = "mensagem", nullable = false, columnDefinition = "TEXT")
    private String mensagem;

    @Column(name = "autor", length = 150)
    private String autor;

    @Column(name = "fixado", nullable = false)
    private Boolean fixado = false;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    public Integer getIdAviso() { return idAviso; }
    public void setIdAviso(Integer idAviso) { this.idAviso = idAviso; }

    public Turma getTurma() { return turma; }
    public void setTurma(Turma turma) { this.turma = turma; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }

    public String getAutor() { return autor; }
    public void setAutor(String autor) { this.autor = autor; }

    public Boolean getFixado() { return fixado; }
    public void setFixado(Boolean fixado) { this.fixado = fixado; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
