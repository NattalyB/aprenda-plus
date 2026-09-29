package com.aprendaplus.controller;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.service.CursoProfessorService;
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

@WebMvcTest(CursoProfessorController.class)
class CursoProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CursoProfessorService cursoProfessorService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        CursoProfessor vinculo = new CursoProfessor();

        when(cursoProfessorService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/curso-professor"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        CursoProfessor vinculo = new CursoProfessor();

        when(cursoProfessorService.salvar(any(CursoProfessor.class))).thenReturn(vinculo);

        mockMvc.perform(post("/curso-professor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vinculo)))
                .andExpect(status().isOk());
    }
}