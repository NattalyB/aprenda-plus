package com.aprendaplus.controller;

import com.aprendaplus.entity.Aula;
import com.aprendaplus.service.AulaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

@WebMvcTest(AulaController.class)
class AulaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AulaService aulaService;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void deveRetornarListaDeAulas() throws Exception {
        Aula aula = new Aula();
        aula.setIdAula(1);
        aula.setTopico("Introdução");

        when(aulaService.listarTodos()).thenReturn(Arrays.asList(aula));

        mockMvc.perform(get("/aulas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].topico").value("Introdução"));
    }

    @Test
    void deveCriarAulaComSucesso() throws Exception {
        Aula aula = new Aula();
        aula.setIdAula(1);
        aula.setTopico("Nova Aula");
        aula.setNumeroAula(1);

        when(aulaService.salvar(any(Aula.class))).thenReturn(aula);

        mockMvc.perform(post("/aulas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aula)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirAula() throws Exception {
        mockMvc.perform(delete("/aulas/1"))
                .andExpect(status().isNoContent());
    }
}