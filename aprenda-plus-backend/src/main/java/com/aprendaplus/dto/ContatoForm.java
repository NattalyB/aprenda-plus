package com.aprendaplus.dto;

// Registro de contato do Comercial com um aluno.
// canal: whatsapp | telefone | email
// resultado: sem_resposta | interessado | retornar_depois | sem_interesse | matriculou
public record ContatoForm(Integer idAluno, String canal, String resultado, String observacao) {
}
