package com.aprendaplus.dto;

import java.util.List;

// Pergunta enviada pelo assistente virtual do site.
// historico: mensagens anteriores da conversa (autor "aluno" ou "assistente"), da mais antiga para a mais nova.
public record ChatPergunta(String mensagem, List<Mensagem> historico) {

    public record Mensagem(String autor, String texto) {
    }
}
