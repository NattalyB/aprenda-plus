package com.aprendaplus.controller;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.service.DisciplinaProfessorService;
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

@WebMvcTest(DisciplinaProfessorController.class)
class DisciplinaProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DisciplinaProfessorService disciplinaProfessorService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        DisciplinaProfessor vinculo = new DisciplinaProfessor();

        when(disciplinaProfessorService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/disciplina-professor"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        DisciplinaProfessor vinculo = new DisciplinaProfessor();

        when(disciplinaProfessorService.salvar(any(DisciplinaProfessor.class))).thenReturn(vinculo);

        mockMvc.perform(post("/disciplina-professor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vinculo)))
                .andExpect(status().isOk());
    }
}