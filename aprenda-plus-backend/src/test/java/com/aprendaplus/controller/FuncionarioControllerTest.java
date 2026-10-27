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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    private static Funcionario comNivel(int id, String nome, boolean master) {
        Funcionario f = new Funcionario();
        f.setIdFuncionario(id);
        f.setNomeCompleto(nome);
        com.aprendaplus.entity.NivelAcesso nivel = new com.aprendaplus.entity.NivelAcesso();
        nivel.setMaster(master);
        f.setNivel(nivel);
        return f;
    }

    @Test
    void contasMasterFicamEscondidasDeQuemNaoEhMaster() throws Exception {
        Funcionario master = comNivel(3, "Suporte/Sistema", true);
        Funcionario dono = comNivel(9, "Pedro Proprietário", false);
        when(funcionarioService.listarTodos()).thenReturn(Arrays.asList(master, dono));
        when(funcionarioService.buscarPorId(3)).thenReturn(master);
        when(funcionarioService.podeVerContasMaster(9)).thenReturn(false);
        when(funcionarioService.podeVerContasMaster(3)).thenReturn(true);

        mockMvc.perform(get("/funcionarios").requestAttr("usuarioId", 9))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nomeCompleto").value("Pedro Proprietário"));
        mockMvc.perform(get("/funcionarios/3").requestAttr("usuarioId", 9))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/funcionarios").requestAttr("usuarioId", 3))
                .andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/funcionarios/3").requestAttr("usuarioId", 3))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarFuncionarioComSucesso() throws Exception {
        Funcionario funcionario = new Funcionario();
        funcionario.setIdFuncionario(1);
        funcionario.setNomeCompleto("Novo Funcionario");

        when(funcionarioService.salvar(any(Funcionario.class), any())).thenReturn(funcionario);

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

        verify(funcionarioService).deletar(1, null);
    }

    @Test
    void criarPassaQuemEstaLogadoEIgnoraIdEnviado() throws Exception {
        when(funcionarioService.salvar(any(Funcionario.class), any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/funcionarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"idFuncionario\": 9, \"nomeCompleto\": \"Nova\", \"nivel\": { \"idNivel\": 3 } }")
                        .requestAttr("usuarioId", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idFuncionario").doesNotExist())
                .andExpect(jsonPath("$.nivel.idNivel").value(3));

        verify(funcionarioService).salvar(any(Funcionario.class), org.mockito.ArgumentMatchers.eq(1));
    }

    // ===== Proteção da própria conta =====

    @Test
    void adminNaoExcluiAPropriaConta() throws Exception {
        mockMvc.perform(delete("/funcionarios/1").requestAttr("usuarioId", 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Você não pode excluir a sua própria conta."));

        verify(funcionarioService, never()).deletar(any(), any());
    }

    @Test
    void adminExcluiOutroFuncionario() throws Exception {
        mockMvc.perform(delete("/funcionarios/2").requestAttr("usuarioId", 1))
                .andExpect(status().isNoContent());

        verify(funcionarioService).deletar(2, 1);
    }

    @Test
    void adminNaoInativaAPropriaConta() throws Exception {
        mockMvc.perform(put("/funcionarios/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nomeCompleto\": \"Eu\", \"status\": \"inativo\" }")
                        .requestAttr("usuarioId", 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Você não pode inativar ou bloquear a sua própria conta."));

        verify(funcionarioService, never()).salvar(any(Funcionario.class), any());
    }

    @Test
    void adminEditaAPropriaContaMantendoAtiva() throws Exception {
        when(funcionarioService.salvar(any(Funcionario.class), any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/funcionarios/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nomeCompleto\": \"Eu\", \"status\": \"ativo\" }")
                        .requestAttr("usuarioId", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Eu"));
    }

    @Test
    void adminInativaOutroFuncionario() throws Exception {
        when(funcionarioService.salvar(any(Funcionario.class), any())).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/funcionarios/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nomeCompleto\": \"Outro\", \"status\": \"inativo\" }")
                        .requestAttr("usuarioId", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("inativo"));
    }
}
