package com.aprendaplus.dto;

import java.util.List;

// Avisos do sininho para quem cuida do financeiro (só boletos: Pix e cartão caem sozinhos).
// Os ids servem para o painel saber quais avisos o funcionário já marcou como lidos.
public record AlertasFinanceiros(
        long vencendoEmBreve,
        long atrasadas,
        List<Integer> idsVencendo,
        List<Integer> idsAtrasadas) {

    public AlertasFinanceiros(long vencendoEmBreve, long atrasadas) {
        this(vencendoEmBreve, atrasadas, List.of(), List.of());
    }
}
