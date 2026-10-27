package com.aprendaplus.security;

import com.aprendaplus.service.AtividadeService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AtividadeInterceptorTest {

    private final AtividadeService atividadeService = mock(AtividadeService.class);
    private final AtividadeInterceptor interceptor = new AtividadeInterceptor(atividadeService);

    private void depois(String metodo, String caminho, int status, Exception erro, Object id, Object papel) {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, caminho);
        request.setQueryString("confirmar=true");
        request.setAttribute("usuarioId", id);
        request.setAttribute("usuarioPapel", papel);
        request.setAttribute(AtividadeInterceptor.CORPO_DA_RESPOSTA, "corpo");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(status);
        interceptor.afterCompletion(request, response, new Object(), erro);
    }

    @Test
    void registraQuandoDeuCerto() {
        depois("PUT", "/alunos/12", 200, null, 2, "ADMIN");
        verify(atividadeService).registrar("PUT", "/alunos/12", "confirmar=true", 2, "ADMIN", "corpo");

        depois("POST", "/alunos", 201, null, "x", 5);
        verify(atividadeService).registrar("POST", "/alunos", "confirmar=true", null, null, "corpo");
    }

    @Test
    void ignoraErrosEConsultas() {
        depois("PUT", "/alunos/12", 400, null, 2, "ADMIN");
        depois("PUT", "/alunos/12", 199, null, 2, "ADMIN");
        depois("PUT", "/alunos/12", 200, new RuntimeException("x"), 2, "ADMIN");
        depois("GET", "/alunos", 200, null, 2, "ADMIN");
        depois("OPTIONS", "/alunos", 200, null, 2, "ADMIN");
        depois("HEAD", "/alunos", 200, null, 2, "ADMIN");
        verify(atividadeService, never()).registrar(any(), any(), any(), any(), any(), any());
    }
}
