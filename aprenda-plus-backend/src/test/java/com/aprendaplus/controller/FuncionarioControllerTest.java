package com.aprendaplus.controller;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.service.FuncionarioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

@WebMvcTest(FuncionarioController.class)
class FuncionarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FuncionarioService funcionarioService;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void deveRetornarListaDeFuncionarios() throws Exception {
        Funcionario funcionario = new Funcionario();
        funcionario.setIdFuncionario(1);
        funcionario.setNomeCompleto("Funcionario Teste");

        when(funcionarioService.listarTodos()).thenReturn(Arrays.asList(funcionario));

        mockMvc.perform(get("/funcionarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nomeCompleto").value("Funcionario Teste"));
    }

    @Test
    void deveCriarFuncionarioComSucesso() throws Exception {
        Funcionario funcionario = new Funcionario();
        funcionario.setIdFuncionario(1);
        funcionario.setNomeCompleto("Novo Funcionario");

        when(funcionarioService.salvar(any(Funcionario.class))).thenReturn(funcionario);

        mockMvc.perform(post("/funcionarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(funcionario)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Novo Funcionario"));
    }

    @Test
    void deveExcluirFuncionario() throws Exception {
        mockMvc.perform(delete("/funcionarios/1"))
                .andExpect(status().isNoContent());
    }
}