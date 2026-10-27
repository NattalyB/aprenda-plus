package com.aprendaplus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Uma linha do histórico de alterações: quem fez, o quê e quando.
@Entity
@Table(name = "registro_atividade")
public class RegistroAtividade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long idRegistro;

    @Column(name = "quando", nullable = false)
    private LocalDateTime quando;

    // funcionario | aluno | visitante
    @Column(name = "usuario_tipo", nullable = false, length = 20)
    private String usuarioTipo;

    @Column(name = "usuario_id")
    private Integer usuarioId;

    @Column(name = "usuario_nome", nullable = false, length = 150)
    private String usuarioNome;

    @Column(name = "modulo", nullable = false, length = 40)
    private String modulo;

    // cadastrou | alterou | excluiu | importou
    @Column(name = "acao", nullable = false, length = 20)
    private String acao;

    @Column(name = "descricao", nullable = false, length = 300)
    private String descricao;

    @Column(name = "alvo", length = 40)
    private String alvo;

    @Column(name = "registro_id")
    private Integer registroId;

    @Column(name = "metodo", nullable = false, length = 10)
    private String metodo;

    @Column(name = "caminho", nullable = false, length = 200)
    private String caminho;

    public Long getIdRegistro() { return idRegistro; }
    public void setIdRegistro(Long idRegistro) { this.idRegistro = idRegistro; }

    public LocalDateTime getQuando() { return quando; }
    public void setQuando(LocalDateTime quando) { this.quando = quando; }

    public String getUsuarioTipo() { return usuarioTipo; }
    public void setUsuarioTipo(String usuarioTipo) { this.usuarioTipo = usuarioTipo; }

    public Integer getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Integer usuarioId) { this.usuarioId = usuarioId; }

    public String getUsuarioNome() { return usuarioNome; }
    public void setUsuarioNome(String usuarioNome) { this.usuarioNome = usuarioNome; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getAlvo() { return alvo; }
    public void setAlvo(String alvo) { this.alvo = alvo; }

    public Integer getRegistroId() { return registroId; }
    public void setRegistroId(Integer registroId) { this.registroId = registroId; }

    public String getMetodo() { return metodo; }
    public void setMetodo(String metodo) { this.metodo = metodo; }

    public String getCaminho() { return caminho; }
    public void setCaminho(String caminho) { this.caminho = caminho; }
}
