package com.aprendaplus.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Mensagem da conversa de um chamado. A primeira é a descrição do problema.
// O anexo (print ou PDF) fica no próprio banco, igual aos documentos dos alunos.
@Entity
@Table(name = "chamado_mensagem")
public class ChamadoMensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idMensagem;

    @Column(name = "chamado_id", nullable = false)
    private Integer chamadoId;

    @Column(name = "autor_tipo", nullable = false, length = 12)
    private String autorTipo;

    @Column(name = "autor_id")
    private Integer autorId;

    @Column(name = "autor_nome", nullable = false, length = 150)
    private String autorNome;

    @Column(name = "texto", nullable = false, columnDefinition = "TEXT")
    private String texto;

    @Column(name = "anexo_nome", length = 200)
    private String anexoNome;

    @Column(name = "anexo_tipo", length = 40)
    private String anexoTipo;

    @Column(name = "anexo_tamanho")
    private Integer anexoTamanho;

    // O arquivo em si (nunca vai junto na conversa: só no download)
    @JsonIgnore
    @Column(name = "anexo_conteudo")
    private byte[] anexoConteudo;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    public Integer getIdMensagem() { return idMensagem; }
    public void setIdMensagem(Integer idMensagem) { this.idMensagem = idMensagem; }

    public Integer getChamadoId() { return chamadoId; }
    public void setChamadoId(Integer chamadoId) { this.chamadoId = chamadoId; }

    public String getAutorTipo() { return autorTipo; }
    public void setAutorTipo(String autorTipo) { this.autorTipo = autorTipo; }

    public Integer getAutorId() { return autorId; }
    public void setAutorId(Integer autorId) { this.autorId = autorId; }

    public String getAutorNome() { return autorNome; }
    public void setAutorNome(String autorNome) { this.autorNome = autorNome; }

    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }

    public String getAnexoNome() { return anexoNome; }
    public void setAnexoNome(String anexoNome) { this.anexoNome = anexoNome; }

    public String getAnexoTipo() { return anexoTipo; }
    public void setAnexoTipo(String anexoTipo) { this.anexoTipo = anexoTipo; }

    public Integer getAnexoTamanho() { return anexoTamanho; }
    public void setAnexoTamanho(Integer anexoTamanho) { this.anexoTamanho = anexoTamanho; }

    public byte[] getAnexoConteudo() { return anexoConteudo; }
    public void setAnexoConteudo(byte[] anexoConteudo) { this.anexoConteudo = anexoConteudo; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}
