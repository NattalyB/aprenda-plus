package com.aprendaplus.controller;

import com.aprendaplus.entity.Professor;
import com.aprendaplus.service.ProfessorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProfessorController.class)
class ProfessorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProfessorService professorService;

    // Cadastro completo e válido (passa em todas as validações da entidade Professor)
    private static final String PROFESSOR_VALIDO = """
            {
              "nomeCompleto": "Novo Professor",
              "telefone": "(51) 98888-8888",
              "email": "prof@teste.com",
              "dataNascimento": "1985-03-20",
              "cpf": "98765432100",
              "rua": "Rua das Flores",
              "numero": "50",
              "cep": "92000-000",
              "bairro": "Centro",
              "cidade": "Canoas",
              "estado": "RS"
            }
            """;

    private Professor professorSalvo() {
        Professor professor = new Professor();
        professor.setIdProfessor(1);
        professor.setNomeCompleto("Novo Professor");
        professor.setEmail("prof@teste.com");
        professor.setCpf("98765432100");
        return professor;
    }

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
    void deveBuscarProfessorPorId() throws Exception {
        when(professorService.buscarPorId(1)).thenReturn(professorSalvo());

        mockMvc.perform(get("/professores/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("prof@teste.com"));
    }

    @Test
    void deveCriarProfessorComSucesso() throws Exception {
        when(professorService.salvar(any(Professor.class))).thenReturn(professorSalvo());

        mockMvc.perform(post("/professores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PROFESSOR_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Novo Professor"));
    }

    @Test
    void deveRecusarProfessorComUfInvalida() throws Exception {
        String professorUfInvalida = PROFESSOR_VALIDO.replace("\"RS\"", "\"RS1\"");

        mockMvc.perform(post("/professores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(professorUfInvalida))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros.estado").exists());

        verify(professorService, never()).salvar(any(Professor.class));
    }

    @Test
    void deveAtualizarProfessor() throws Exception {
        when(professorService.salvar(any(Professor.class))).thenReturn(professorSalvo());

        mockMvc.perform(put("/professores/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PROFESSOR_VALIDO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProfessor").value(1));
    }

    @Test
    void deveExcluirProfessor() throws Exception {
        mockMvc.perform(delete("/professores/1"))
                .andExpect(status().isNoContent());

        verify(professorService).deletar(1);
    }
}
