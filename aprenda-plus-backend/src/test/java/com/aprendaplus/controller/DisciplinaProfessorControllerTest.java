package com.aprendaplus.controller;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.service.DisciplinaProfessorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DisciplinaProfessorController.class)
class DisciplinaProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DisciplinaProfessorService disciplinaProfessorService;

    // Um vínculo precisa dos dois lados preenchidos (com o id de cada um)
    private static final String VINCULO_VALIDO = """
            { "disciplina": { "idDisciplina": 1 }, "professor": { "idProfessor": 2 } }
            """;

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        DisciplinaProfessor vinculo = new DisciplinaProfessor();

        when(disciplinaProfessorService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/disciplina-professor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        DisciplinaProfessor vinculo = new DisciplinaProfessor();

        when(disciplinaProfessorService.salvar(any(DisciplinaProfessor.class))).thenReturn(vinculo);

        mockMvc.perform(post("/disciplina-professor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VINCULO_VALIDO))
                .andExpect(status().isOk());

        verify(disciplinaProfessorService).salvar(any(DisciplinaProfessor.class));
    }
}
