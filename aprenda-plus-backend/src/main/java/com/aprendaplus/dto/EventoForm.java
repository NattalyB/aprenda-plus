package com.aprendaplus.dto;

// O que o site manda quando alguém busca, abre um curso ou põe um curso no carrinho.
// tipo: BUSCA | VISUALIZACAO | CARRINHO; sessao: código aleatório (UUID) guardado no navegador.
public record EventoForm(String tipo, String sessao, Integer idCurso, String termo, Integer resultados) {
}
