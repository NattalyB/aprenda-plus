package com.aprendaplus.controller;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.service.TurmaProfessorService;
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

@WebMvcTest(TurmaProfessorController.class)
class TurmaProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TurmaProfessorService turmaProfessorService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        TurmaProfessor vinculo = new TurmaProfessor();

        when(turmaProfessorService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/turma-professor"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        TurmaProfessor vinculo = new TurmaProfessor();

        when(turmaProfessorService.salvar(any(TurmaProfessor.class))).thenReturn(vinculo);

        mockMvc.perform(post("/turma-professor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vinculo)))
                .andExpect(status().isOk());
    }
}