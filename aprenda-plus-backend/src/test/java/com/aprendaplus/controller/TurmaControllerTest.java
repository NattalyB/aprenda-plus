package com.aprendaplus.controller;

import java.util.List;
import com.aprendaplus.dto.TurmaDisponivel;
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

    @Test
    void deveListarTurmasDisponiveisDoCurso() throws Exception {
        when(turmaService.listarDisponiveisDoCurso(5)).thenReturn(List.of(
                new TurmaDisponivel(1, "Turma A - Noite", "Presencial", "Seg a Qua 19h-22h", "2026/2", 30, 12)));

        mockMvc.perform(get("/turmas/curso/5/disponiveis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Turma A - Noite"))
                .andExpect(jsonPath("$[0].vagasRestantes").value(12));
    }
}
