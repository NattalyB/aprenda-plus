package com.aprendaplus.controller;

import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.service.InscricaoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InscricaoController.class)
class InscricaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InscricaoService inscricaoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeInscricoes() throws Exception {
        Inscricao inscricao = new Inscricao();
        inscricao.setIdInscricao(1);
        inscricao.setStatus("pendente_pagamento");

        when(inscricaoService.listarTodos()).thenReturn(Arrays.asList(inscricao));

        mockMvc.perform(get("/inscricoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("pendente_pagamento"));
    }

    @Test
    void deveCriarInscricaoComSucesso() throws Exception {
        Inscricao inscricao = new Inscricao();
        inscricao.setIdInscricao(1);
        inscricao.setValorTotal(new BigDecimal("199.90"));

        when(inscricaoService.salvar(any(Inscricao.class))).thenReturn(inscricao);

        mockMvc.perform(post("/inscricoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inscricao)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirInscricao() throws Exception {
        mockMvc.perform(delete("/inscricoes/1"))
                .andExpect(status().isNoContent());
    }
}