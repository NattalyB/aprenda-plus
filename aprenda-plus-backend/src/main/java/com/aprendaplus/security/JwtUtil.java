package com.aprendaplus.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    // Chave secreta usada pra assinar os tokens.
    // Em produção isso viria de uma variável de ambiente, não fixo no código.
    private final SecretKey chave = Keys.hmacShaKeyFor(
            "aprenda-plus-chave-secreta-para-jwt-com-pelo-menos-32-caracteres".getBytes()
    );

    public String gerarToken(String email) {
        long agora = System.currentTimeMillis();
        long expiracao = agora + (1000 * 60 * 60 * 2); // token válido por 2 horas

        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(agora))
                .expiration(new Date(expiracao))
                .signWith(chave)
                .compact();
    }

    public String extrairEmail(String token) {
        return Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
}