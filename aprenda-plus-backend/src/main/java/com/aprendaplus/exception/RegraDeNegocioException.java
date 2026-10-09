package com.aprendaplus.exception;

// Erro "esperado" de regra do sistema (ex.: parcelas acima do permitido, turma inexistente).
// O GlobalExceptionHandler transforma este erro em uma resposta 400
// com uma mensagem clara, que o front pode mostrar direto para o usuário.
public class RegraDeNegocioException extends RuntimeException {

    public RegraDeNegocioException(String mensagem) {
        super(mensagem);
    }
}
