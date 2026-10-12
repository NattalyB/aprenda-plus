package com.aprendaplus.security;

// Regras de acesso pelo status da conta (aluno ou funcionário).
// Só contas "ativo" podem entrar no sistema e fazer compras.
public final class StatusConta {

    private StatusConta() {
    }

    // Devolve null se a conta pode ser usada, ou a mensagem explicando por que não pode
    public static String motivoDoBloqueio(String status) {
        if (status == null || status.isBlank() || "ativo".equalsIgnoreCase(status.trim())) {
            return null;
        }
        return switch (status.trim().toLowerCase()) {
            case "inativo" -> "Sua conta está inativa. Entre em contato com o suporte para reativá-la.";
            case "bloqueado" -> "Sua conta está bloqueada. Entre em contato com o suporte.";
            default -> "Sua conta não está liberada para acesso. Entre em contato com o suporte.";
        };
    }
}
