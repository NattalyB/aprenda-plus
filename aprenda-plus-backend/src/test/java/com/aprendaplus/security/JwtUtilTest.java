package com.aprendaplus.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private final JwtUtil jwtUtil = new JwtUtil("chave-usada-somente-nos-testes-com-mais-de-32-caracteres");

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

        assertEquals(email, jwtUtil.extrairEmail(token));
    }

    @Test
    void tokenDeveCarregarIdEPapelDoUsuario() {
        String token = jwtUtil.gerarToken("admin@aprendaplus.com", 3, "ADMIN");

        Claims dados = jwtUtil.validarToken(token);

        assertEquals("admin@aprendaplus.com", dados.getSubject());
        assertEquals(3, dados.get("id", Integer.class));
        assertEquals("ADMIN", dados.get("papel", String.class));
        assertNotNull(dados.getExpiration());
    }

    @Test
    void deveRecusarTokenAdulterado() {
        String tokenAluno = jwtUtil.gerarToken("aluno@aprendaplus.com", 7, "ALUNO");
        String tokenAdmin = jwtUtil.gerarToken("admin@aprendaplus.com", 1, "ADMIN");

        // Um token tem 3 partes: cabeçalho.dados.assinatura
        // Simula alguém trocando os dados do aluno pelos de um admin,
        // mantendo a assinatura original: a assinatura deixa de bater
        String[] partesAluno = tokenAluno.split("\\.");
        String[] partesAdmin = tokenAdmin.split("\\.");
        String adulterado = partesAluno[0] + "." + partesAdmin[1] + "." + partesAluno[2];

        assertThrows(JwtException.class, () -> jwtUtil.validarToken(adulterado));
    }

    @Test
    void deveRecusarTokenAssinadoComOutraChave() {
        JwtUtil outroServidor = new JwtUtil("uma-chave-completamente-diferente-com-mais-de-32-caracteres");
        String tokenFalso = outroServidor.gerarToken("hacker@teste.com", 1, "ADMIN");

        assertThrows(JwtException.class, () -> jwtUtil.validarToken(tokenFalso));
    }
}
