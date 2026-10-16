package com.aprendaplus.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Pedido de "esqueci minha senha": o link enviado por e-mail (só o hash do código fica no banco)
@Entity
@Table(name = "redefinicao_senha")
public class RedefinicaoSenha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idRedefinicao;

    // "aluno" ou "funcionario"
    @Column(name = "tipo", nullable = false, length = 12)
    private String tipo;

    @Column(name = "usuario_id", nullable = false)
    private Integer usuarioId;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;

    @Column(name = "usado_em")
    private LocalDateTime usadoEm;

    public Integer getIdRedefinicao() { return idRedefinicao; }
    public void setIdRedefinicao(Integer idRedefinicao) { this.idRedefinicao = idRedefinicao; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public Integer getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Integer usuarioId) { this.usuarioId = usuarioId; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public LocalDateTime getExpiraEm() { return expiraEm; }
    public void setExpiraEm(LocalDateTime expiraEm) { this.expiraEm = expiraEm; }

    public LocalDateTime getUsadoEm() { return usadoEm; }
    public void setUsadoEm(LocalDateTime usadoEm) { this.usadoEm = usadoEm; }
}
