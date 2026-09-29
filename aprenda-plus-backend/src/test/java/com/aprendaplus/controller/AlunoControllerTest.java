package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.service.AlunoService;
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

@WebMvcTest(AlunoController.class)
class AlunoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlunoService alunoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeAlunos() throws Exception {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(1);
        aluno.setNomeCompleto("Aluno Teste");

        when(alunoService.listarTodos()).thenReturn(Arrays.asList(aluno));

        mockMvc.perform(get("/alunos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nomeCompleto").value("Aluno Teste"));
    }

    @Test
    void deveCriarAlunoComSucesso() throws Exception {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(1);
        aluno.setNomeCompleto("Novo Aluno");
        aluno.setEmail("aluno@teste.com");
        aluno.setCpf("12345678900");

        when(alunoService.salvar(any(Aluno.class))).thenReturn(aluno);

        mockMvc.perform(post("/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aluno)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Novo Aluno"));
    }

    @Test
    void deveExcluirAluno() throws Exception {
        mockMvc.perform(delete("/alunos/1"))
                .andExpect(status().isNoContent());
    }
}