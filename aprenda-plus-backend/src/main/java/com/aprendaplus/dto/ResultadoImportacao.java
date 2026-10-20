package com.aprendaplus.dto;

import java.util.List;

// Resposta da importação por planilha.
// confirmado = false: só a prévia (nada foi gravado). true: as linhas sem erro foram gravadas.
public record ResultadoImportacao(
        boolean confirmado,
        int total,
        int validas,
        int comErro,
        int importadas,
        List<LinhaImportada> linhas) {

    // linha = número da linha na planilha (a 1 é o cabeçalho)
    // descricao = como a linha aparece na tela (nome do aluno, título da aula...)
    public record LinhaImportada(int linha, String descricao, List<String> erros, boolean importada) {

        public boolean valida() {
            return erros.isEmpty();
        }
    }
}
