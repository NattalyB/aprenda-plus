package com.aprendaplus.controller;

import com.aprendaplus.entity.Matricula;
import com.aprendaplus.service.MatriculaService;
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

@WebMvcTest(MatriculaController.class)
class MatriculaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MatriculaService matriculaService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeMatriculas() throws Exception {
        Matricula matricula = new Matricula();
        matricula.setIdMatricula(1);
        matricula.setStatus("ativa");

        when(matriculaService.listarTodos()).thenReturn(Arrays.asList(matricula));

        mockMvc.perform(get("/matriculas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ativa"));
    }

    @Test
    void deveCriarMatriculaComSucesso() throws Exception {
        Matricula matricula = new Matricula();
        matricula.setIdMatricula(1);
        matricula.setStatus("ativa");

        when(matriculaService.salvar(any(Matricula.class))).thenReturn(matricula);

        mockMvc.perform(post("/matriculas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(matricula)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirMatricula() throws Exception {
        mockMvc.perform(delete("/matriculas/1"))
                .andExpect(status().isNoContent());
    }
}