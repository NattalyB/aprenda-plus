package com.aprendaplus.dto;

// Novo aviso do mural (enviarEmail = avisar os alunos da turma por e-mail)
public record AvisoForm(String titulo, String mensagem, Boolean fixado, Boolean enviarEmail) {
}
