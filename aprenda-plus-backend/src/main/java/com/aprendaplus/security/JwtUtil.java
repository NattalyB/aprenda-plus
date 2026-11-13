package com.aprendaplus.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    private static final long VALIDADE_MS = 1000L * 60 * 60 * 2; // token válido por 2 horas

    private final SecretKey chave;

    // A chave secreta vem da propriedade "jwt.secret" (application.properties),
    // que em produção é preenchida pela variável de ambiente JWT_SECRET no Render
    public JwtUtil(@Value("${jwt.secret}") String segredo) {
        this.chave = Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
    }

    // Gera o token com o e-mail, o id e o papel (ALUNO ou ADMIN) do usuário
    public String gerarToken(String email, Integer id, String papel) {
        long agora = System.currentTimeMillis();

        return Jwts.builder()
                .subject(email)
                .claim("id", id)
                .claim("papel", papel)
                .issuedAt(new Date(agora))
                .expiration(new Date(agora + VALIDADE_MS))
                .signWith(chave)
                .compact();
    }

    // Login com o Google, primeira vez do aluno: um "passe" curto que prova que o Google confirmou este e-mail.
    // Ele só serve para completar o cadastro (o papel CADASTRO_GOOGLE não abre nenhuma outra rota).
    public static final String PAPEL_CADASTRO_GOOGLE = "CADASTRO_GOOGLE";
    private static final long VALIDADE_CADASTRO_MS = 1000L * 60 * 30; // 30 minutos para preencher o formulário

    public String gerarTokenCadastroGoogle(String email, String nome) {
        long agora = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .claim("papel", PAPEL_CADASTRO_GOOGLE)
                .claim("nome", nome)
                .issuedAt(new Date(agora))
                .expiration(new Date(agora + VALIDADE_CADASTRO_MS))
                .signWith(chave)
                .compact();
    }

    // Versão antiga, mantida por compatibilidade (gera token sem papel)
    public String gerarToken(String email) {
        return gerarToken(email, null, null);
    }

    // Valida a assinatura e a validade do token e devolve os dados dele.
    // Lança exceção se o token for inválido, adulterado ou estiver expirado.
    public Claims validarToken(String token) {
        return Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extrairEmail(String token) {
        return validarToken(token).getSubject();
    }
}