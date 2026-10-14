package com.aprendaplus.controller;

import com.aprendaplus.dto.CertificadoEmitido;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.SalaDeAulaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CertificadoController.class)
class CertificadoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SalaDeAulaService salaDeAulaService;

    @Test
    void certificadoVerdadeiro() throws Exception {
        when(salaDeAulaService.validar("ABCD-EFGH-JKLM")).thenReturn(new CertificadoEmitido("ABCD-EFGH-JKLM",
                "Lucas Almeida", "Administração", "Turma A", 360, "Carla", LocalDateTime.of(2026, 10, 13, 21, 0)));

        mockMvc.perform(get("/certificados/ABCD-EFGH-JKLM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aluno").value("Lucas Almeida"))
                .andExpect(jsonPath("$.curso").value("Administração"));
    }

    @Test
    void codigoQueNaoExisteDevolve404() throws Exception {
        when(salaDeAulaService.validar("XXXX")).thenThrow(new RegraDeNegocioException("Certificado não encontrado. Confira o código."));

        mockMvc.perform(get("/certificados/XXXX"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensagem").value("Certificado não encontrado. Confira o código."));
    }
}
