package com.aprendaplus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Um contato que a equipe comercial fez com um aluno (WhatsApp, telefone ou e-mail)
// e o que ficou combinado. Serve para ninguém ligar duas vezes para a mesma pessoa
// e para acompanhar quem está interessado.
@Entity
@Table(name = "contato_comercial")
public class ContatoComercial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idContato;

    @Column(name = "aluno_id", nullable = false)
    private Integer alunoId;

    @Column(name = "funcionario_id")
    private Integer funcionarioId;

    // Guardado junto para o histórico continuar legível mesmo se o funcionário sair
    @Column(name = "funcionario_nome", nullable = false, length = 150)
    private String funcionarioNome;

    @Column(name = "quando", nullable = false)
    private LocalDateTime quando;

    // whatsapp | telefone | email
    @Column(name = "canal", nullable = false, length = 20)
    private String canal;

    // sem_resposta | interessado | retornar_depois | sem_interesse | matriculou
    @Column(name = "resultado", nullable = false, length = 30)
    private String resultado;

    @Column(name = "observacao", length = 500)
    private String observacao;

    public Integer getIdContato() { return idContato; }
    public void setIdContato(Integer idContato) { this.idContato = idContato; }

    public Integer getAlunoId() { return alunoId; }
    public void setAlunoId(Integer alunoId) { this.alunoId = alunoId; }

    public Integer getFuncionarioId() { return funcionarioId; }
    public void setFuncionarioId(Integer funcionarioId) { this.funcionarioId = funcionarioId; }

    public String getFuncionarioNome() { return funcionarioNome; }
    public void setFuncionarioNome(String funcionarioNome) { this.funcionarioNome = funcionarioNome; }

    public LocalDateTime getQuando() { return quando; }
    public void setQuando(LocalDateTime quando) { this.quando = quando; }

    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }

    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }

    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
