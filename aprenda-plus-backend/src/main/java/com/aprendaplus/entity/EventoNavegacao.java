package com.aprendaplus.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

// Algo que alguém fez no site: buscou um termo, abriu os detalhes de um curso
// ou colocou um curso no carrinho. Alimenta os relatórios do módulo Comercial.
// Visitante não logado é anônimo: só tem o código de sessão gerado no navegador.
@Entity
@Table(name = "evento_navegacao")
public class EventoNavegacao {

    public static final String BUSCA = "BUSCA";
    public static final String VISUALIZACAO = "VISUALIZACAO";
    public static final String CARRINHO = "CARRINHO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long idEvento;

    @Column(name = "quando", nullable = false)
    private LocalDateTime quando;

    // BUSCA | VISUALIZACAO | CARRINHO
    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo;

    // Código aleatório (UUID) que o navegador guarda: liga os eventos da mesma pessoa
    @Column(name = "sessao", nullable = false, length = 36)
    private String sessao;

    // Só quando a pessoa está logada como aluno
    @Column(name = "aluno_id")
    private Integer alunoId;

    @Column(name = "curso_id")
    private Integer cursoId;

    @Column(name = "termo", length = 100)
    private String termo;

    @Column(name = "resultados")
    private Integer resultados;

    public EventoNavegacao() {
    }

    public EventoNavegacao(LocalDateTime quando, String tipo, String sessao, Integer alunoId,
                           Integer cursoId, String termo, Integer resultados) {
        this.quando = quando;
        this.tipo = tipo;
        this.sessao = sessao;
        this.alunoId = alunoId;
        this.cursoId = cursoId;
        this.termo = termo;
        this.resultados = resultados;
    }

    public Long getIdEvento() { return idEvento; }
    public void setIdEvento(Long idEvento) { this.idEvento = idEvento; }

    public LocalDateTime getQuando() { return quando; }
    public void setQuando(LocalDateTime quando) { this.quando = quando; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getSessao() { return sessao; }
    public void setSessao(String sessao) { this.sessao = sessao; }

    public Integer getAlunoId() { return alunoId; }
    public void setAlunoId(Integer alunoId) { this.alunoId = alunoId; }

    public Integer getCursoId() { return cursoId; }
    public void setCursoId(Integer cursoId) { this.cursoId = cursoId; }

    public String getTermo() { return termo; }
    public void setTermo(String termo) { this.termo = termo; }

    public Integer getResultados() { return resultados; }
    public void setResultados(Integer resultados) { this.resultados = resultados; }
}
