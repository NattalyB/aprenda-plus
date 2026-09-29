package com.aprendaplus.controller;

import com.aprendaplus.entity.Professor;
import com.aprendaplus.service.ProfessorService;
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

@WebMvcTest(ProfessorController.class)
class ProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfessorService professorService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeProfessores() throws Exception {
        Professor professor = new Professor();
        professor.setIdProfessor(1);
        professor.setNomeCompleto("Professor Teste");

        when(professorService.listarTodos()).thenReturn(Arrays.asList(professor));

        mockMvc.perform(get("/professores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nomeCompleto").value("Professor Teste"));
    }

    @Test
    void deveCriarProfessorComSucesso() throws Exception {
        Professor professor = new Professor();
        professor.setIdProfessor(1);
        professor.setNomeCompleto("Novo Professor");
        professor.setEmail("prof@teste.com");
        professor.setCpf("98765432100");

        when(professorService.salvar(any(Professor.class))).thenReturn(professor);

        mockMvc.perform(post("/professores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(professor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Novo Professor"));
    }

    @Test
    void deveExcluirProfessor() throws Exception {
        mockMvc.perform(delete("/professores/1"))
                .andExpect(status().isNoContent());
    }
}