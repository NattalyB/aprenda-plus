package com.aprendaplus.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Documento enviado pelo aluno (certificado de conclusão do ensino fundamental/médio).
// O arquivo fica guardado no próprio banco (coluna bytea) para o admin consultar quando precisar.
@Entity
@Table(name = "documento_aluno")
public class DocumentoAluno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idDocumento;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Aluno aluno;

    @Column(name = "tipo", nullable = false, length = 40)
    private String tipo = "certificado_escolaridade";

    @Column(name = "nome_arquivo", nullable = false, length = 200)
    private String nomeArquivo;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "tamanho", nullable = false)
    private Integer tamanho;

    // O arquivo em si (nunca vai junto nas listas: só no download)
    @JsonIgnore
    @Column(name = "conteudo", nullable = false)
    private byte[] conteudo;

    // pendente | aprovado | recusado
    @Column(name = "status", nullable = false, length = 20)
    private String status = "pendente";

    @Column(name = "observacao", length = 500)
    private String observacao;

    @Column(name = "enviado_em", insertable = false, updatable = false)
    private LocalDateTime enviadoEm;

    @Column(name = "revisado_em")
    private LocalDateTime revisadoEm;

    public Integer getIdDocumento() { return idDocumento; }
    public void setIdDocumento(Integer idDocumento) { this.idDocumento = idDocumento; }

    public Aluno getAluno() { return aluno; }
    public void setAluno(Aluno aluno) { this.aluno = aluno; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getNomeArquivo() { return nomeArquivo; }
    public void setNomeArquivo(String nomeArquivo) { this.nomeArquivo = nomeArquivo; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Integer getTamanho() { return tamanho; }
    public void setTamanho(Integer tamanho) { this.tamanho = tamanho; }

    public byte[] getConteudo() { return conteudo; }
    public void setConteudo(byte[] conteudo) { this.conteudo = conteudo; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }

    public LocalDateTime getEnviadoEm() { return enviadoEm; }
    public void setEnviadoEm(LocalDateTime enviadoEm) { this.enviadoEm = enviadoEm; }

    public LocalDateTime getRevisadoEm() { return revisadoEm; }
    public void setRevisadoEm(LocalDateTime revisadoEm) { this.revisadoEm = revisadoEm; }
}
