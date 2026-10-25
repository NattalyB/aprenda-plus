package com.aprendaplus.controller;

import com.aprendaplus.dto.ChatPergunta;
import com.aprendaplus.dto.ChatResposta;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChatService chatService;

    @Test
    void respondeAPergunta() throws Exception {
        when(chatService.responder(any())).thenReturn(new ChatResposta("Recomendo Ciência de Dados.", List.of(2), "ia"));

        mockMvc.perform(post("/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mensagem\":\"gosto de dados\",\"historico\":[{\"autor\":\"aluno\",\"texto\":\"oi\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resposta").value("Recomendo Ciência de Dados."))
                .andExpect(jsonPath("$.cursos[0]").value(2))
                .andExpect(jsonPath("$.origem").value("ia"));

        ArgumentCaptor<ChatPergunta> pergunta = ArgumentCaptor.forClass(ChatPergunta.class);
        verify(chatService).responder(pergunta.capture());
        assertEquals("gosto de dados", pergunta.getValue().mensagem());
        assertEquals("oi", pergunta.getValue().historico().get(0).texto());
    }

    @Test
    void perguntaInvalidaVolta400() throws Exception {
        when(chatService.responder(any())).thenThrow(new RegraDeNegocioException("Escreva a sua pergunta."));

        mockMvc.perform(post("/chat").contentType(MediaType.APPLICATION_JSON).content("{\"mensagem\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Escreva a sua pergunta."));
    }

    @Test
    void limitaAsMensagensPorMinuto() throws Exception {
        when(chatService.responder(any())).thenReturn(new ChatResposta("ok", List.of(), "basico"));
        for (int i = 0; i < ChatController.LIMITE_POR_MINUTO; i++) {
            mockMvc.perform(post("/chat").header("X-Forwarded-For", "9.9.9.9, 10.0.0.1")
                    .contentType(MediaType.APPLICATION_JSON).content("{\"mensagem\":\"oi\"}")).andExpect(status().isOk());
        }
        mockMvc.perform(post("/chat").header("X-Forwarded-For", "9.9.9.9")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mensagem\":\"oi\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.mensagem").exists());
        // Outro visitante continua podendo perguntar
        mockMvc.perform(post("/chat").contentType(MediaType.APPLICATION_JSON).content("{\"mensagem\":\"oi\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void depoisDeUmMinutoLiberaDeNovo() {
        AtomicLong agora = new AtomicLong(0);
        ChatController controller = new ChatController(mock(ChatService.class), agora::get);
        for (int i = 0; i < ChatController.LIMITE_POR_MINUTO; i++) assertTrue(controller.podeEnviar("a"));
        assertFalse(controller.podeEnviar("a"));
        agora.set(60_000);
        assertTrue(controller.podeEnviar("a"));
    }

    @Test
    void limpaVisitantesAntigosQuandoAListaCresce() {
        AtomicLong agora = new AtomicLong(0);
        ChatController controller = new ChatController(mock(ChatService.class), agora::get);
        for (int i = 0; i <= 5_000; i++) controller.podeEnviar("v" + i);
        agora.set(120_000);
        assertTrue(controller.podeEnviar("novo"));
        assertTrue(controller.podeEnviar("v1"));
    }

    @Test
    void identificaOVisitante() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("1.2.3.4");
        assertEquals("1.2.3.4", ChatController.visitante(request));
        when(request.getHeader("X-Forwarded-For")).thenReturn(" ");
        assertEquals("1.2.3.4", ChatController.visitante(request));
        when(request.getRemoteAddr()).thenReturn(null);
        assertEquals("desconhecido", ChatController.visitante(request));
    }
}
