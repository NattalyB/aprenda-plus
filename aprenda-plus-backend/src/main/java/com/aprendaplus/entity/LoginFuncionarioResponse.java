package com.aprendaplus.entity;

public class LoginFuncionarioResponse {
    private String token;
    private Integer idFuncionario;
    private String nome;
    private String cargo;
    // Nível de acesso e módulos liberados (o front monta o menu com isso)
    private String nivel;
    private boolean master;
    private java.util.List<String> modulos = java.util.List.of();
    private String cor;

    public LoginFuncionarioResponse(String token, Integer idFuncionario, String nome, String cargo) {
        this.token = token;
        this.idFuncionario = idFuncionario;
        this.nome = nome;
        this.cargo = cargo;
    }

    public LoginFuncionarioResponse(String token, Integer idFuncionario, String nome, String cargo,
                                    NivelAcesso nivelAcesso) {
        this(token, idFuncionario, nome, cargo);
        if (nivelAcesso != null) {
            this.nivel = nivelAcesso.getNome();
            this.master = nivelAcesso.isMaster();
            this.modulos = nivelAcesso.getModulos();
            this.cor = nivelAcesso.getCor();
        }
    }

    public String getToken() { return token; }
    public Integer getIdFuncionario() { return idFuncionario; }
    public String getNome() { return nome; }
    public String getCargo() { return cargo; }
    public String getNivel() { return nivel; }
    public boolean isMaster() { return master; }
    public java.util.List<String> getModulos() { return modulos; }
    public String getCor() { return cor; }
}