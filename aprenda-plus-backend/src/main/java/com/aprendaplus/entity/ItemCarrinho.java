package com.aprendaplus.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "item_carrinho")
public class ItemCarrinho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carrinho_id", nullable = false)
    private Carrinho carrinho;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "curso_id", nullable = false)
    private Curso curso;

    // Quando o curso entrou no carrinho (preenchido pelo banco).
    // O Comercial usa para saber há quanto tempo a compra está parada.
    @Column(name = "adicionado_em", insertable = false, updatable = false)
    private java.time.LocalDateTime adicionadoEm;

    // Getters e Setters

    public Integer getIdItem() { return idItem; }
    public void setIdItem(Integer idItem) { this.idItem = idItem; }

    public Carrinho getCarrinho() { return carrinho; }
    public void setCarrinho(Carrinho carrinho) { this.carrinho = carrinho; }

    public Curso getCurso() { return curso; }
    public void setCurso(Curso curso) { this.curso = curso; }

    public java.time.LocalDateTime getAdicionadoEm() { return adicionadoEm; }
    public void setAdicionadoEm(java.time.LocalDateTime adicionadoEm) { this.adicionadoEm = adicionadoEm; }
}
