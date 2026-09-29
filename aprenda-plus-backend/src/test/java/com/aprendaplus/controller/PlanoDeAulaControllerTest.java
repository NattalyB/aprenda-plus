package com.aprendaplus.controller;

import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.service.PlanoDeAulaService;
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

@WebMvcTest(PlanoDeAulaController.class)
class PlanoDeAulaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlanoDeAulaService planoDeAulaService;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void deveRetornarListaDePlanos() throws Exception {
        PlanoDeAula plano = new PlanoDeAula();
        plano.setIdPlano(1);

        when(planoDeAulaService.listarTodos()).thenReturn(Arrays.asList(plano));

        mockMvc.perform(get("/planos-de-aula"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarPlanoComSucesso() throws Exception {
        PlanoDeAula plano = new PlanoDeAula();
        plano.setIdPlano(1);

        when(planoDeAulaService.salvar(any(PlanoDeAula.class))).thenReturn(plano);

        mockMvc.perform(post("/planos-de-aula")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(plano)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirPlano() throws Exception {
        mockMvc.perform(delete("/planos-de-aula/1"))
                .andExpect(status().isNoContent());
    }
}