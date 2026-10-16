package com.aprendaplus.controller;

import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.RecuperacaoSenhaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecuperacaoSenhaController.class)
class RecuperacaoSenhaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecuperacaoSenhaService recuperacaoSenhaService;

    @Test
    void pedidoSempreDevolveAMesmaMensagem() throws Exception {
        mockMvc.perform(post("/auth/esqueci-senha").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"lucas@aluno.com\",\"tipo\":\"aluno\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagem").value(RecuperacaoSenhaController.RESPOSTA_PEDIDO));

        verify(recuperacaoSenhaService).solicitar("lucas@aluno.com", "aluno");
    }

    @Test
    void pedidoSemEmailMostraOMotivo() throws Exception {
        doThrow(new RegraDeNegocioException("Informe o seu e-mail.")).when(recuperacaoSenhaService).solicitar(null, null);

        mockMvc.perform(post("/auth/esqueci-senha").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe o seu e-mail."));
    }

    @Test
    void novaSenhaDevolveQuemFoiAtendido() throws Exception {
        when(recuperacaoSenhaService.redefinir("abc", "segura123")).thenReturn("funcionario");

        mockMvc.perform(post("/auth/redefinir-senha").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"novaSenha\":\"segura123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("funcionario"))
                .andExpect(jsonPath("$.mensagem").value("Senha alterada! Agora é só entrar com a nova senha."));
    }

    @Test
    void linkInvalido() throws Exception {
        when(recuperacaoSenhaService.redefinir("velho", "segura123"))
                .thenThrow(new RegraDeNegocioException("Este link não é mais válido."));

        mockMvc.perform(post("/auth/redefinir-senha").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"velho\",\"novaSenha\":\"segura123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Este link não é mais válido."));
    }
}
