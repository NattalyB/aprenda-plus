package com.aprendaplus.controller;

import com.aprendaplus.dto.EventoForm;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.security.JwtUtil;
import com.aprendaplus.service.EventoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EventoController.class)
@Import(EventoControllerTest.ChaveDeTeste.class)
class EventoControllerTest {

    // JwtUtil de verdade, com chave só de teste: assim dá para mandar tokens válidos
    static class ChaveDeTeste {
        @org.springframework.context.annotation.Bean
        JwtUtil jwtUtil() {
            return new JwtUtil("chave-usada-somente-nos-testes-com-mais-de-32-caracteres");
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @MockitoBean
    private EventoService eventoService;

    private static final String CORPO =
            "{\"tipo\":\"VISUALIZACAO\",\"sessao\":\"7f3c2a10-1b2c-4d5e-8f90-a1b2c3d4e5f6\",\"idCurso\":3}";

    @Test
    void visitanteRegistraSemLogin() throws Exception {
        mockMvc.perform(post("/eventos").contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isNoContent());

        verify(eventoService).registrar(eq(new EventoForm("VISUALIZACAO", "7f3c2a10-1b2c-4d5e-8f90-a1b2c3d4e5f6", 3, null, null)),
                isNull());
    }

    @Test
    void alunoLogadoFicaLigadoAoEvento() throws Exception {
        String token = jwtUtil.gerarToken("ana@teste.com", 7, "ALUNO");

        mockMvc.perform(post("/eventos").contentType(MediaType.APPLICATION_JSON).content(CORPO)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        verify(eventoService).registrar(any(EventoForm.class), eq(7));
    }

    @Test
    void tokenDeFuncionarioOuInvalidoContaComoVisitante() throws Exception {
        String tokenAdmin = jwtUtil.gerarToken("adm@teste.com", 1, "ADMIN");

        mockMvc.perform(post("/eventos").contentType(MediaType.APPLICATION_JSON).content(CORPO)
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/eventos").contentType(MediaType.APPLICATION_JSON).content(CORPO)
                        .header("Authorization", "Bearer token-quebrado"))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/eventos").contentType(MediaType.APPLICATION_JSON).content(CORPO)
                        .header("Authorization", "Basic abc"))
                .andExpect(status().isNoContent());

        verify(eventoService, org.mockito.Mockito.times(3)).registrar(any(EventoForm.class), isNull());
    }

    @Test
    void eventoInvalidoVolta400() throws Exception {
        doThrow(new RegraDeNegocioException("Sessão inválida.")).when(eventoService).registrar(any(), any());

        mockMvc.perform(post("/eventos").contentType(MediaType.APPLICATION_JSON).content(CORPO))
                .andExpect(status().isBadRequest());
    }
}
