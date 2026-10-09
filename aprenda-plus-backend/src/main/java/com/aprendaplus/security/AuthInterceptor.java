package com.aprendaplus.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;

    public AuthInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {

        String metodo = request.getMethod();
        String caminho = request.getRequestURI();

        // Requisição de "pré-verificação" do navegador (CORS): sempre libera
        if ("OPTIONS".equals(metodo)) {
            return true;
        }

        // Rotas abertas: não precisam de login
        if (ehRotaPublica(metodo, caminho)) {
            return true;
        }

        // Daqui pra baixo, precisa de token
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return negar(response, 401, "Faça login para continuar.");
        }

        Claims dados;
        try {
            dados = jwtUtil.validarToken(header.substring(7));
        } catch (JwtException | IllegalArgumentException e) {
            return negar(response, 401, "Sua sessão expirou. Faça login novamente.");
        }

        String papel = dados.get("papel", String.class);
        Integer id = dados.get("id", Integer.class);

        // Deixa o id e o papel disponíveis pros controllers
        request.setAttribute("usuarioId", id);
        request.setAttribute("usuarioPapel", papel);

        // Admin pode acessar tudo
        if ("ADMIN".equals(papel)) {
            return true;
        }

        // Aluno só acessa as rotas da área dele
        if ("ALUNO".equals(papel) && ehRotaDeAluno(metodo, caminho)) {
            return true;
        }

        return negar(response, 403, "Você não tem permissão para acessar este recurso.");
    }

    // Rotas que qualquer visitante pode acessar
    private boolean ehRotaPublica(String metodo, String caminho) {
        if (caminho.startsWith("/auth/")) return true;                 // login de aluno e funcionário
        if (caminho.equals("/error")) return true;                     // página de erro interna do Spring
        if (caminho.startsWith("/actuator/health")) return true;       // verificação de saúde (Render)

        if ("GET".equals(metodo)) {
            if (caminho.equals("/cursos") || caminho.startsWith("/cursos/")) return true;   // vitrine de cursos
            if (caminho.equals("/turmas") || caminho.startsWith("/turmas/")) return true;   // turmas dos cursos
        }

        return "POST".equals(metodo) && caminho.equals("/alunos");    // cadastro de novo aluno
    }

    // Rotas liberadas para aluno logado (a posse de cada recurso é conferida nos controllers)
    private boolean ehRotaDeAluno(String metodo, String caminho) {
        if ("GET".equals(metodo) && caminho.equals("/carrinhos/meu")) return true;
        if ("GET".equals(metodo) && caminho.equals("/itens-carrinho/meus")) return true;
        if ("POST".equals(metodo) && caminho.equals("/itens-carrinho")) return true;
        if ("DELETE".equals(metodo) && caminho.startsWith("/itens-carrinho/")) return true;
        return "POST".equals(metodo) && caminho.equals("/inscricoes");
    }

    // Responde com erro em JSON e interrompe a requisição
    private boolean negar(HttpServletResponse response, int status, String mensagem) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"erro\":\"" + mensagem + "\"}");
        return false;
    }
}