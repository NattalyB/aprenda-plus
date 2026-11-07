package com.aprendaplus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Chamado de suporte aberto por um funcionário do painel ou por um professor.
// A conversa (descrição e respostas) fica em ChamadoMensagem.
@Entity
@Table(name = "chamado")
public class Chamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idChamado;

    @Column(name = "assunto", nullable = false, length = 150)
    private String assunto;

    @Column(name = "categoria", nullable = false, length = 20)
    private String categoria;

    @Column(name = "prioridade", nullable = false, length = 10)
    private String prioridade;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "tela", length = 200)
    private String tela;

    @Column(name = "tipo_solicitante", nullable = false, length = 12)
    private String tipoSolicitante;

    @Column(name = "funcionario_id")
    private Integer funcionarioId;

    @Column(name = "professor_id")
    private Integer professorId;

    @Column(name = "nome_solicitante", nullable = false, length = 150)
    private String nomeSolicitante;

    @Column(name = "email_solicitante", length = 150)
    private String emailSolicitante;

    @Column(name = "responsavel_id")
    private Integer responsavelId;

    @Column(name = "ultima_mensagem_de", nullable = false, length = 12)
    private String ultimaMensagemDe;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @Column(name = "resolvido_em")
    private LocalDateTime resolvidoEm;

    public Integer getIdChamado() { return idChamado; }
    public void setIdChamado(Integer idChamado) { this.idChamado = idChamado; }

    public String getAssunto() { return assunto; }
    public void setAssunto(String assunto) { this.assunto = assunto; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public String getPrioridade() { return prioridade; }
    public void setPrioridade(String prioridade) { this.prioridade = prioridade; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTela() { return tela; }
    public void setTela(String tela) { this.tela = tela; }

    public String getTipoSolicitante() { return tipoSolicitante; }
    public void setTipoSolicitante(String tipoSolicitante) { this.tipoSolicitante = tipoSolicitante; }

    public Integer getFuncionarioId() { return funcionarioId; }
    public void setFuncionarioId(Integer funcionarioId) { this.funcionarioId = funcionarioId; }

    public Integer getProfessorId() { return professorId; }
    public void setProfessorId(Integer professorId) { this.professorId = professorId; }

    public String getNomeSolicitante() { return nomeSolicitante; }
    public void setNomeSolicitante(String nomeSolicitante) { this.nomeSolicitante = nomeSolicitante; }

    public String getEmailSolicitante() { return emailSolicitante; }
    public void setEmailSolicitante(String emailSolicitante) { this.emailSolicitante = emailSolicitante; }

    public Integer getResponsavelId() { return responsavelId; }
    public void setResponsavelId(Integer responsavelId) { this.responsavelId = responsavelId; }

    public String getUltimaMensagemDe() { return ultimaMensagemDe; }
    public void setUltimaMensagemDe(String ultimaMensagemDe) { this.ultimaMensagemDe = ultimaMensagemDe; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }

    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }

    public LocalDateTime getResolvidoEm() { return resolvidoEm; }
    public void setResolvidoEm(LocalDateTime resolvidoEm) { this.resolvidoEm = resolvidoEm; }
}
