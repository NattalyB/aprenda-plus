package com.aprendaplus.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Treinamento do painel: vídeo do YouTube e/ou PDF explicando como usar o sistema.
// O PDF fica guardado no próprio banco (coluna bytea), igual aos documentos dos alunos.
@Entity
@Table(name = "treinamento")
public class Treinamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idTreinamento;

    @Column(name = "titulo", nullable = false, length = 150)
    private String titulo;

    @Column(name = "descricao", columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "video_url", length = 300)
    private String videoUrl;

    @Column(name = "pdf_nome", length = 200)
    private String pdfNome;

    @Column(name = "pdf_tamanho")
    private Integer pdfTamanho;

    // O arquivo em si (nunca vai junto na lista: só no download)
    @JsonIgnore
    @Column(name = "pdf_conteudo")
    private byte[] pdfConteudo;

    @Column(name = "ordem", nullable = false)
    private Integer ordem = 0;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    public Integer getIdTreinamento() { return idTreinamento; }
    public void setIdTreinamento(Integer idTreinamento) { this.idTreinamento = idTreinamento; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    public String getPdfNome() { return pdfNome; }
    public void setPdfNome(String pdfNome) { this.pdfNome = pdfNome; }

    public Integer getPdfTamanho() { return pdfTamanho; }
    public void setPdfTamanho(Integer pdfTamanho) { this.pdfTamanho = pdfTamanho; }

    public byte[] getPdfConteudo() { return pdfConteudo; }
    public void setPdfConteudo(byte[] pdfConteudo) { this.pdfConteudo = pdfConteudo; }

    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }

    // Na lista o front só precisa saber se tem PDF
    public boolean isTemPdf() { return pdfTamanho != null && pdfTamanho > 0; }
}
