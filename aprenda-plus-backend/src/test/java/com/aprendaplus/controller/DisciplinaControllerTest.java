package com.aprendaplus.controller;

import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.service.DisciplinaService;
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

@WebMvcTest(DisciplinaController.class)
class DisciplinaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DisciplinaService disciplinaService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeDisciplinas() throws Exception {
        Disciplina disciplina = new Disciplina();
        disciplina.setIdDisciplina(1);
        disciplina.setNome("Disciplina Teste");

        when(disciplinaService.listarTodos()).thenReturn(Arrays.asList(disciplina));

        mockMvc.perform(get("/disciplinas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Disciplina Teste"));
    }

    @Test
    void deveCriarDisciplinaComSucesso() throws Exception {
        Disciplina disciplina = new Disciplina();
        disciplina.setIdDisciplina(1);
        disciplina.setNome("Nova Disciplina");
        disciplina.setCargaHoraria(40);

        when(disciplinaService.salvar(any(Disciplina.class))).thenReturn(disciplina);

        mockMvc.perform(post("/disciplinas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(disciplina)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nova Disciplina"));
    }

    @Test
    void deveExcluirDisciplina() throws Exception {
        mockMvc.perform(delete("/disciplinas/1"))
                .andExpect(status().isNoContent());
    }
}