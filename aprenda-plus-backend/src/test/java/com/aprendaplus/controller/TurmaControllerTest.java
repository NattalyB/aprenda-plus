package com.aprendaplus.controller;

import com.aprendaplus.entity.Turma;
import com.aprendaplus.service.TurmaService;
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

@WebMvcTest(TurmaController.class)
class TurmaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TurmaService turmaService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeTurmas() throws Exception {
        Turma turma = new Turma();
        turma.setIdTurma(1);
        turma.setNome("Turma Teste");

        when(turmaService.listarTodos()).thenReturn(Arrays.asList(turma));

        mockMvc.perform(get("/turmas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Turma Teste"));
    }

    @Test
    void deveCriarTurmaComSucesso() throws Exception {
        Turma turma = new Turma();
        turma.setIdTurma(1);
        turma.setNome("Nova Turma");
        turma.setCapacidadeMaxima(30);

        when(turmaService.salvar(any(Turma.class))).thenReturn(turma);

        mockMvc.perform(post("/turmas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(turma)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nova Turma"));
    }

    @Test
    void deveExcluirTurma() throws Exception {
        mockMvc.perform(delete("/turmas/1"))
                .andExpect(status().isNoContent());
    }
}