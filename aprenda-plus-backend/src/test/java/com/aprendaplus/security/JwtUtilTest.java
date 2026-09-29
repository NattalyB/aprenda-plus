package com.aprendaplus.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private final JwtUtil jwtUtil = new JwtUtil();

    @Test
    void deveGerarTokenValido() {
        String token = jwtUtil.gerarToken("teste@teste.com");

        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void deveExtrairEmailCorretoDoToken() {
        String email = "aluno@aprendaplus.com";
        String token = jwtUtil.gerarToken(email);

        String emailExtraido = jwtUtil.extrairEmail(token);

        assertEquals(email, emailExtraido);
    }
}