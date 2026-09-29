package com.aprendaplus.controller;

import com.aprendaplus.entity.PeriodoLetivoCurso;
import com.aprendaplus.service.PeriodoLetivoCursoService;
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

@WebMvcTest(PeriodoLetivoCursoController.class)
class PeriodoLetivoCursoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PeriodoLetivoCursoService periodoLetivoCursoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        PeriodoLetivoCurso vinculo = new PeriodoLetivoCurso();

        when(periodoLetivoCursoService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/periodo-letivo-curso"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        PeriodoLetivoCurso vinculo = new PeriodoLetivoCurso();

        when(periodoLetivoCursoService.salvar(any(PeriodoLetivoCurso.class))).thenReturn(vinculo);

        mockMvc.perform(post("/periodo-letivo-curso")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vinculo)))
                .andExpect(status().isOk());
    }
}