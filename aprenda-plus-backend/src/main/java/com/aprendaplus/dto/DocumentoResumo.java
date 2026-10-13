package com.aprendaplus.dto;

import java.time.LocalDateTime;

// Dados de um documento SEM o arquivo (para as listas: o arquivo só vem no download)
public record DocumentoResumo(
        Integer idDocumento,
        Integer idAluno,
        String nomeArquivo,
        String contentType,
        Integer tamanho,
        String status,
        String observacao,
        LocalDateTime enviadoEm,
        LocalDateTime revisadoEm) {
}
