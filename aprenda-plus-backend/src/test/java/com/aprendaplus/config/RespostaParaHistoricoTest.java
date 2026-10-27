package com.aprendaplus.config;

import com.aprendaplus.security.AtividadeInterceptor;
import org.junit.jupiter.api.Test;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class RespostaParaHistoricoTest {

    private final RespostaParaHistorico advice = new RespostaParaHistorico();

    private Object guardado(String metodo, Object corpo) {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, "/alunos");
        Object resposta = advice.beforeBodyWrite(corpo, null, null, null,
                new ServletServerHttpRequest(request), new ServletServerHttpResponse(new MockHttpServletResponse()));
        assertSame(corpo, resposta);
        return request.getAttribute(AtividadeInterceptor.CORPO_DA_RESPOSTA);
    }

    @Test
    void guardaOCorpoSoDosPost() {
        assertTrue(advice.supports(null, null));
        assertEquals("aluno salvo", guardado("POST", "aluno salvo"));
        assertNull(guardado("PUT", "aluno salvo"));
        assertNull(guardado("POST", null));
        assertEquals("x", advice.beforeBodyWrite("x", null, null, null, null, null));
    }
}
