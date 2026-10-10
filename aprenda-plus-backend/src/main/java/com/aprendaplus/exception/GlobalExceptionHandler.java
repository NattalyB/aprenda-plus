package com.aprendaplus.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    static final String MENSAGEM_REGISTRO_EM_USO =
            "Não é possível excluir este registro porque existem outros cadastros ligados a ele "
            + "(por exemplo, inscrições, matrículas ou turmas). Exclua ou altere esses cadastros primeiro.";

    static final String MENSAGEM_DADO_REPETIDO =
            "Não foi possível salvar: já existe um cadastro com estes dados "
            + "(por exemplo, e-mail ou CPF repetido) ou algum vínculo informado não existe.";

    // Captura erros de validação (@Valid) e devolve quais campos falharam
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> tratarErroDeValidacao(MethodArgumentNotValidException ex) {
        Map<String, String> erros = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(erro ->
                erros.putIfAbsent(erro.getField(), erro.getDefaultMessage())
        );

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("mensagem", "Verifique os dados preenchidos.");
        resposta.put("erros", erros);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resposta);
    }

    // Captura erros de regra do sistema (ex.: forma de pagamento inválida)
    // e devolve 400 com a mensagem pronta para mostrar na tela
    @ExceptionHandler(RegraDeNegocioException.class)
    public ResponseEntity<Map<String, Object>> tratarRegraDeNegocio(RegraDeNegocioException ex) {
        return resposta(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // O banco recusou a operação por causa de um vínculo entre tabelas.
    // - Ao EXCLUIR: o registro ainda é usado por outro (ex.: turma com inscrições).
    // - Ao SALVAR: dado que não pode repetir (e-mail, CPF) ou vínculo inexistente.
    // Devolve 409 (conflito) com uma mensagem clara, em vez de um erro 500 genérico.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> tratarConflitoNoBanco(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        boolean exclusao = "DELETE".equalsIgnoreCase(request.getMethod());
        return resposta(HttpStatus.CONFLICT, exclusao ? MENSAGEM_REGISTRO_EM_USO : MENSAGEM_DADO_REPETIDO);
    }

    private ResponseEntity<Map<String, Object>> resposta(HttpStatus status, String mensagem) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("mensagem", mensagem);
        return ResponseEntity.status(status).body(corpo);
    }
}
