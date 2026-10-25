package com.aprendaplus.dto;

import java.util.List;

// Resposta do assistente virtual.
// cursos: ids dos cursos citados (o site mostra um botão para cada um).
// origem: "ia" (Gemini) ou "basico" (respostas automáticas, quando a IA não está disponível).
// atendente: true quando a pessoa quer falar com alguém da equipe (o site mostra os botões de contato).
public record ChatResposta(String resposta, List<Integer> cursos, String origem, boolean atendente) {
}
