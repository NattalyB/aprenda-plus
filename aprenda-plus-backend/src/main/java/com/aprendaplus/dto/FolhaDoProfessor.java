package com.aprendaplus.dto;

import java.math.BigDecimal;
import java.util.List;

// Uma linha da tela "Professores" do financeiro, para um mês (referência "2026-10"):
// valor da hora-aula, turmas em que dá aula, horas sugeridas (as do último mês pago)
// e, se já foi gerado, o pagamento do mês (conta a pagar).
public record FolhaDoProfessor(
        Integer idProfessor,
        String nome,
        String status,
        BigDecimal valorHora,
        List<String> turmas,
        BigDecimal horasSugeridas,
        Integer idConta,
        String situacaoConta,
        BigDecimal horasLancadas,
        BigDecimal valorConta) {
}
