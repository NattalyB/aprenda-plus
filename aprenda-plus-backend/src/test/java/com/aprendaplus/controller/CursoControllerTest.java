package com.aprendaplus.controller;

import com.aprendaplus.entity.Curso;
import com.aprendaplus.service.CursoService;
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

@WebMvcTest(CursoController.class)
class CursoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CursoService cursoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeCursos() throws Exception {
        Curso curso = new Curso();
        curso.setIdCurso(1);
        curso.setNome("Curso Teste");
        curso.setValor(new BigDecimal("100.00"));

        when(cursoService.listarTodos()).thenReturn(Arrays.asList(curso));

        mockMvc.perform(get("/cursos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Curso Teste"));
    }

    @Test
    void deveCriarCursoComSucesso() throws Exception {
        Curso curso = new Curso();
        curso.setIdCurso(1);
        curso.setNome("Novo Curso");
        curso.setCategoria("superior");
        curso.setCargaHoraria(40);
        curso.setModalidade("EAD");
        curso.setValor(new BigDecimal("199.90"));

        when(cursoService.salvar(any(Curso.class))).thenReturn(curso);

        mockMvc.perform(post("/cursos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(curso)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Novo Curso"));
    }
}