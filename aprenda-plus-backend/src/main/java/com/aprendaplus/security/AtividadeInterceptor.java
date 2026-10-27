package com.aprendaplus.security;

import com.aprendaplus.service.AtividadeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

// Depois de cada requisição que deu certo (status 2xx), grava no histórico quem fez e o quê.
// Roda depois do AuthInterceptor, que já deixou o id e o papel do usuário na requisição.
public class AtividadeInterceptor implements HandlerInterceptor {

    // Corpo da resposta de um POST (guardado pelo RespostaParaHistorico), para pegar o id do que foi cadastrado
    public static final String CORPO_DA_RESPOSTA = "historico.corpoDaResposta";

    private final AtividadeService atividadeService;

    public AtividadeInterceptor(AtividadeService atividadeService) {
        this.atividadeService = atividadeService;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        if (ex != null || response.getStatus() < 200 || response.getStatus() >= 300) {
            return;
        }
        String metodo = request.getMethod();
        if ("GET".equals(metodo) || "OPTIONS".equals(metodo) || "HEAD".equals(metodo)) {
            return;
        }
        Object id = request.getAttribute("usuarioId");
        Object papel = request.getAttribute("usuarioPapel");
        atividadeService.registrar(metodo, request.getRequestURI(), request.getQueryString(),
                id instanceof Integer i ? i : null, papel instanceof String p ? p : null,
                request.getAttribute(CORPO_DA_RESPOSTA));
    }
}
