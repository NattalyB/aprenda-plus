package com.aprendaplus.dto;

import java.time.LocalDate;

// Uma aula da sala de aula EAD.
// Para o aluno, aula ainda não liberada vem sem vídeo, material e conteúdo.
public record AulaDaSala(
        Integer idAula,
        Integer numero,
        String titulo,
        Integer idDisciplina,
        String disciplina,
        String tipo,
        LocalDate dataLiberacao,
        boolean liberada,
        boolean publicada,
        String videoUrl,
        String materialUrl,
        String conteudo,
        Integer duracaoMinutos,
        boolean concluida) {
}
