package com.aprendaplus.controller;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.service.CursoProfessorService;
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

@WebMvcTest(CursoProfessorController.class)
class CursoProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CursoProfessorService cursoProfessorService;

    // Um vínculo precisa dos dois lados preenchidos (com o id de cada um)
    private static final String VINCULO_VALIDO = """
            { "curso": { "idCurso": 1 }, "professor": { "idProfessor": 2 } }
            """;

    @Test
    void deveRetornarListaDeVinculos() throws Exception {
        CursoProfessor vinculo = new CursoProfessor();

        when(cursoProfessorService.listarTodos()).thenReturn(Arrays.asList(vinculo));

        mockMvc.perform(get("/curso-professor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void deveCriarVinculoComSucesso() throws Exception {
        CursoProfessor vinculo = new CursoProfessor();

        when(cursoProfessorService.salvar(any(CursoProfessor.class))).thenReturn(vinculo);

        mockMvc.perform(post("/curso-professor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VINCULO_VALIDO))
                .andExpect(status().isOk());

        verify(cursoProfessorService).salvar(any(CursoProfessor.class));
    }
}
