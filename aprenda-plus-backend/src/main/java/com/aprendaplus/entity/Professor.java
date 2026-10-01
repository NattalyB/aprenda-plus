package com.aprendaplus.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "professor")
public class Professor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer idProfessor;

    @NotBlank(message = "O nome completo é obrigatório.")
    @Size(max = 150, message = "O nome completo deve ter no máximo 150 caracteres.")
    @Column(name = "nome_completo", nullable = false, length = 150)
    private String nomeCompleto;

    @NotBlank(message = "O telefone é obrigatório.")
    @Size(max = 20, message = "O telefone deve ter no máximo 20 caracteres.")
    @Column(name = "telefone", length = 20)
    private String telefone;

    @NotBlank(message = "O e-mail é obrigatório.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 150, message = "O e-mail deve ter no máximo 150 caracteres.")
    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @NotNull(message = "A data de nascimento é obrigatória.")
    @Past(message = "A data de nascimento deve ser uma data no passado.")
    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @NotBlank(message = "O CPF é obrigatório.")
    @Pattern(regexp = "\\d{11}", message = "O CPF deve conter exatamente 11 números.")
    @Column(name = "cpf", nullable = false, unique = true, length = 11)
    private String cpf;

    @NotBlank(message = "A rua é obrigatória.")
    @Size(max = 150, message = "A rua deve ter no máximo 150 caracteres.")
    @Column(name = "rua", length = 150)
    private String rua;

    @NotBlank(message = "O número é obrigatório.")
    @Size(max = 10, message = "O número deve ter no máximo 10 caracteres.")
    @Column(name = "numero", length = 10)
    private String numero;

    @Size(max = 100, message = "O complemento deve ter no máximo 100 caracteres.")
    @Column(name = "complemento", length = 100)
    private String complemento;

    @NotBlank(message = "O CEP é obrigatório.")
    @Pattern(regexp = "\\d{5}-?\\d{3}", message = "Informe um CEP válido (ex: 00000-000).")
    @Column(name = "cep", length = 9)
    private String cep;

    @NotBlank(message = "O bairro é obrigatório.")
    @Size(max = 100, message = "O bairro deve ter no máximo 100 caracteres.")
    @Column(name = "bairro", length = 100)
    private String bairro;

    @NotBlank(message = "A cidade é obrigatória.")
    @Size(max = 100, message = "A cidade deve ter no máximo 100 caracteres.")
    @Column(name = "cidade", length = 100)
    private String cidade;

    @NotBlank(message = "A UF é obrigatória.")
    @Pattern(regexp = "[A-Za-z]{2}", message = "A UF deve ter 2 letras (ex: RS).")
    @Column(name = "estado", length = 2)
    private String estado;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ativo";

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    // Getters e Setters

    public Integer getIdProfessor() { return idProfessor; }
    public void setIdProfessor(Integer idProfessor) { this.idProfessor = idProfessor; }

    public String getNomeCompleto() { return nomeCompleto; }
    public void setNomeCompleto(String nomeCompleto) { this.nomeCompleto = nomeCompleto; }

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate dataNascimento) { this.dataNascimento = dataNascimento; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getRua() { return rua; }
    public void setRua(String rua) { this.rua = rua; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}