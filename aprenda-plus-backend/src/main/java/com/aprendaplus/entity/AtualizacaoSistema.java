package com.aprendaplus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Atualização do sistema: novidade, melhoria, correção ou manutenção programada.
// Aparece na área "Atualizações" do painel; as manutenções também viram uma faixa no topo.
@Entity
@Table(name = "atualizacao_sistema")
public class AtualizacaoSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idAtualizacao;

    @Column(name = "titulo", nullable = false, length = 150)
    private String titulo;

    @Column(name = "descricao", nullable = false, columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo;

    @Column(name = "versao", length = 20)
    private String versao;

    @Column(name = "publicado_em", nullable = false)
    private LocalDateTime publicadoEm;

    @Column(name = "inicio_manutencao")
    private LocalDateTime inicioManutencao;

    @Column(name = "fim_manutencao")
    private LocalDateTime fimManutencao;

    @Column(name = "criado_por_id")
    private Integer criadoPorId;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    public Integer getIdAtualizacao() { return idAtualizacao; }
    public void setIdAtualizacao(Integer idAtualizacao) { this.idAtualizacao = idAtualizacao; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getVersao() { return versao; }
    public void setVersao(String versao) { this.versao = versao; }

    public LocalDateTime getPublicadoEm() { return publicadoEm; }
    public void setPublicadoEm(LocalDateTime publicadoEm) { this.publicadoEm = publicadoEm; }

    public LocalDateTime getInicioManutencao() { return inicioManutencao; }
    public void setInicioManutencao(LocalDateTime inicioManutencao) { this.inicioManutencao = inicioManutencao; }

    public LocalDateTime getFimManutencao() { return fimManutencao; }
    public void setFimManutencao(LocalDateTime fimManutencao) { this.fimManutencao = fimManutencao; }

    public Integer getCriadoPorId() { return criadoPorId; }
    public void setCriadoPorId(Integer criadoPorId) { this.criadoPorId = criadoPorId; }

    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}
