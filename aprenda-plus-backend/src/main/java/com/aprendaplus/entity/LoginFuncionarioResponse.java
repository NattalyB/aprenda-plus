package com.aprendaplus.entity;

public class LoginFuncionarioResponse {
    private String token;
    private Integer idFuncionario;
    private String nome;
    private String cargo;

    public LoginFuncionarioResponse(String token, Integer idFuncionario, String nome, String cargo) {
        this.token = token;
        this.idFuncionario = idFuncionario;
        this.nome = nome;
        this.cargo = cargo;
    }

    public String getToken() { return token; }
    public Integer getIdFuncionario() { return idFuncionario; }
    public String getNome() { return nome; }
    public String getCargo() { return cargo; }
}