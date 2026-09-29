package com.aprendaplus.controller;

import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.service.PeriodoLetivoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PeriodoLetivoController.class)
class PeriodoLetivoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PeriodoLetivoService periodoLetivoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDePeriodos() throws Exception {
        PeriodoLetivo periodo = new PeriodoLetivo();
        periodo.setIdPeriodoLetivo(1);
        periodo.setNome("2º Semestre 2026");

        when(periodoLetivoService.listarTodos()).thenReturn(Arrays.asList(periodo));

        mockMvc.perform(get("/periodos-letivos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("2º Semestre 2026"));
    }

    @Test
    void deveCriarPeriodoComSucesso() throws Exception {
        PeriodoLetivo periodo = new PeriodoLetivo();
        periodo.setIdPeriodoLetivo(1);
        periodo.setNome("1º Semestre 2027");

        when(periodoLetivoService.salvar(any(PeriodoLetivo.class))).thenReturn(periodo);

        mockMvc.perform(post("/periodos-letivos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(periodo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("1º Semestre 2027"));
    }

    @Test
    void deveExcluirPeriodo() throws Exception {
        mockMvc.perform(delete("/periodos-letivos/1"))
                .andExpect(status().isNoContent());
    }
}