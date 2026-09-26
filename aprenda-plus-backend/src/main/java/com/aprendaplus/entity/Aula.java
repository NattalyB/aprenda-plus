package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "aula")
public class Aula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idAula;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plano_id", nullable = false)
    private PlanoDeAula plano;

    @Column(name = "numero_aula", nullable = false)
    private Integer numeroAula;

    @Column(name = "data_aula")
    private LocalDate dataAula;

    @Column(name = "topico", nullable = false, length = 200)
    private String topico;

    @Column(name = "conteudo_detalhado", columnDefinition = "TEXT")
    private String conteudoDetalhado;

    @Column(name = "recursos_necessarios", length = 200)
    private String recursosNecessarios;

    @Column(name = "tipo_aula", length = 30)
    private String tipoAula;

    // Getters e Setters

    public Integer getIdAula() { return idAula; }
    public void setIdAula(Integer idAula) { this.idAula = idAula; }

    public PlanoDeAula getPlano() { return plano; }
    public void setPlano(PlanoDeAula plano) { this.plano = plano; }

    public Integer getNumeroAula() { return numeroAula; }
    public void setNumeroAula(Integer numeroAula) { this.numeroAula = numeroAula; }

    public LocalDate getDataAula() { return dataAula; }
    public void setDataAula(LocalDate dataAula) { this.dataAula = dataAula; }

    public String getTopico() { return topico; }
    public void setTopico(String topico) { this.topico = topico; }

    public String getConteudoDetalhado() { return conteudoDetalhado; }
    public void setConteudoDetalhado(String conteudoDetalhado) { this.conteudoDetalhado = conteudoDetalhado; }

    public String getRecursosNecessarios() { return recursosNecessarios; }
    public void setRecursosNecessarios(String recursosNecessarios) { this.recursosNecessarios = recursosNecessarios; }

    public String getTipoAula() { return tipoAula; }
    public void setTipoAula(String tipoAula) { this.tipoAula = tipoAula; }
}