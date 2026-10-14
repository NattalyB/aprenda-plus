package com.aprendaplus.dto;

import java.time.LocalDate;

// Dados de uma aula enviados pelo painel
public record AulaForm(
        String titulo,
        Integer idDisciplina,
        String tipo,
        LocalDate dataLiberacao,
        String videoUrl,
        String materialUrl,
        String conteudo,
        Integer duracaoMinutos,
        Boolean publicada) {
}
