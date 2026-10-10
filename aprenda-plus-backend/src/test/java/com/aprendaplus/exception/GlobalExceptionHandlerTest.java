package com.aprendaplus.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Testa as respostas de erro "traduzidas" para o usuário
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private final DataIntegrityViolationException erroDoBanco =
            new DataIntegrityViolationException("violates foreign key constraint");

    @Test
    void excluirRegistroEmUsoDevolve409ComMensagemClara() {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/turmas/2");

        ResponseEntity<Map<String, Object>> resposta = handler.tratarConflitoNoBanco(erroDoBanco, request);

        assertEquals(409, resposta.getStatusCode().value());
        assertEquals(GlobalExceptionHandler.MENSAGEM_REGISTRO_EM_USO, resposta.getBody().get("mensagem"));
    }

    @Test
    void salvarDadoRepetidoDevolve409ComOutraMensagem() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/alunos");

        ResponseEntity<Map<String, Object>> resposta = handler.tratarConflitoNoBanco(erroDoBanco, request);

        assertEquals(409, resposta.getStatusCode().value());
        assertEquals(GlobalExceptionHandler.MENSAGEM_DADO_REPETIDO, resposta.getBody().get("mensagem"));
    }

    @Test
    void regraDeNegocioDevolve400ComAMensagemDoErro() {
        ResponseEntity<Map<String, Object>> resposta =
                handler.tratarRegraDeNegocio(new RegraDeNegocioException("Turma não encontrada."));

        assertEquals(400, resposta.getStatusCode().value());
        assertEquals("Turma não encontrada.", resposta.getBody().get("mensagem"));
    }
}
