package com.aprendaplus.entity;

import com.aprendaplus.security.Modulos;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

// Nível hierárquico dos funcionários do painel (Master, Administrativo, Secretaria...).
// Cada nível tem a lista de módulos que pode usar. O Master pode tudo.
@Entity
@Table(name = "nivel_acesso")
public class NivelAcesso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idNivel;

    @Column(name = "nome", nullable = false, unique = true, length = 50)
    private String nome;

    // No banco fica como texto: "alunos,cursos,turmas"
    @JsonIgnore
    @Column(name = "modulos", nullable = false, length = 500)
    private String modulosTexto = "";

    @Column(name = "master", nullable = false)
    private boolean master = false;

    public Integer getIdNivel() { return idNivel; }
    public void setIdNivel(Integer idNivel) { this.idNivel = idNivel; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getModulosTexto() { return modulosTexto; }
    public void setModulosTexto(String modulosTexto) { this.modulosTexto = modulosTexto; }

    public boolean isMaster() { return master; }
    public void setMaster(boolean master) { this.master = master; }

    // Na API os módulos aparecem como lista: ["alunos", "cursos"]
    @JsonProperty("modulos")
    public List<String> getModulos() {
        return master ? Modulos.TODOS : new ArrayList<>(Modulos.ler(modulosTexto));
    }

    @JsonProperty("modulos")
    public void setModulos(List<String> modulos) {
        this.modulosTexto = Modulos.escrever(modulos);
    }
}
