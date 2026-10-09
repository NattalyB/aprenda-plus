package com.aprendaplus.controller;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.service.TurmaProfessorService;
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

@WebMvcTest(TurmaProfessorController.class)
class TurmaProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TurmaProfessorService turmaProfessorService;

    // Um vínculo precisa dos dois lados preenchidos (com o id de cada um)
    private static final String VINCULO_VALIDO = """
            { "turma": { "idTurma": 1 }, "professor": { "idProfessor": 2 }, "papel": "principal" }
            """;

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        TurmaProfessor vinculo = new TurmaProfessor();

        when(turmaProfessorService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/turma-professor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        TurmaProfessor vinculo = new TurmaProfessor();

        when(turmaProfessorService.salvar(any(TurmaProfessor.class))).thenReturn(vinculo);

        mockMvc.perform(post("/turma-professor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VINCULO_VALIDO))
                .andExpect(status().isOk());

        verify(turmaProfessorService).salvar(any(TurmaProfessor.class));
    }
}
