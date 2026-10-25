package com.aprendaplus.service;

import com.aprendaplus.dto.ChatPergunta;
import com.aprendaplus.dto.ChatResposta;
import com.aprendaplus.dto.TurmaDisponivel;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.exception.RegraDeNegocioException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ChatServiceTest {

    private final CursoService cursoService = mock(CursoService.class);
    private final TurmaService turmaService = mock(TurmaService.class);
    private final HttpClient cliente = mock(HttpClient.class);
    private final AtomicLong agora = new AtomicLong(1_000_000L);

    private static Curso curso(int id, String nome, String modalidade) {
        Curso c = new Curso();
        c.setIdCurso(id);
        c.setNome(nome);
        c.setCategoria("superior");
        c.setModalidade(modalidade);
        c.setCargaHoraria(2400);
        c.setValor(new BigDecimal("12000"));
        c.setNumeroParcelas(24);
        c.setDescricao("Curso de " + nome);
        return c;
    }

    private ChatService servico(String chave) {
        when(cursoService.listarTodos()).thenReturn(List.of(curso(1, "Engenharia de Software", "Presencial"),
                curso(2, "Ciência de Dados", "EAD")));
        when(turmaService.listarDisponiveisDoCurso(1)).thenReturn(List.of(
                new TurmaDisponivel(10, "Turma ESI-A", "Presencial", "Seg a Sex 8h", "2026/2", 30, 12)));
        when(turmaService.listarDisponiveisDoCurso(2)).thenThrow(new RuntimeException("falhou"));
        return new ChatService(cursoService, turmaService, chave, " ", cliente, agora::get);
    }

    @SuppressWarnings("unchecked")
    private void geminiResponde(int status, String corpo) throws Exception {
        HttpResponse<String> resposta = mock(HttpResponse.class);
        when(resposta.statusCode()).thenReturn(status);
        when(resposta.body()).thenReturn(corpo);
        when(cliente.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(resposta);
    }

    private static ChatPergunta pergunta(String texto) {
        return new ChatPergunta(texto, null);
    }

    @Test
    @SuppressWarnings("unchecked")
    void respondeComIaEMostraOsCursosCitados() throws Exception {
        geminiResponde(200, "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Recomendo **Ciência de Dados** [[curso:2]] e [[curso:7]].\"}]}}]}");
        ChatService servico = servico("chave-teste");

        List<ChatPergunta.Mensagem> historico = new ArrayList<>();
        for (int i = 0; i < 14; i++) historico.add(new ChatPergunta.Mensagem(i % 2 == 0 ? "aluno" : "assistente", "msg " + i));
        historico.add(null);
        historico.add(new ChatPergunta.Mensagem("aluno", " "));
        ChatResposta resposta = servico.responder(new ChatPergunta("  gosto de dados  ", historico));

        assertEquals("Recomendo **Ciência de Dados** e.", resposta.resposta());
        assertEquals(List.of(2), resposta.cursos());
        assertEquals("ia", resposta.origem());
        assertTrue(servico.iaConfigurada());

        ArgumentCaptor<HttpRequest> requisicao = ArgumentCaptor.forClass(HttpRequest.class);
        verify(cliente).send(requisicao.capture(), any(HttpResponse.BodyHandler.class));
        assertEquals("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
                requisicao.getValue().uri().toString());
        assertEquals("chave-teste", requisicao.getValue().headers().firstValue("x-goog-api-key").orElse(null));
    }

    @Test
    void semChaveRespondeNoModoBasico() throws Exception {
        ChatResposta resposta = servico("").responder(pergunta("quero estudar programação"));

        assertEquals("basico", resposta.origem());
        assertEquals(List.of(1), resposta.cursos());
        assertFalse(resposta.resposta().contains("[[curso"));
        verify(cliente, never()).send(any(), any());
    }

    @Test
    void seAIaFalharUsaOModoBasico() throws Exception {
        ChatService servico = servico("chave");

        geminiResponde(429, "{\"error\":{\"code\":429}}");
        assertEquals("basico", servico.responder(pergunta("oi")).origem());

        geminiResponde(200, "{\"candidates\":[]}");
        assertEquals("basico", servico.responder(pergunta("oi")).origem());

        when(cliente.send(any(), any())).thenThrow(new IOException("sem internet"));
        assertEquals("basico", servico.responder(pergunta("oi")).origem());
    }

    @Test
    void interrupcaoTambemCaiNoModoBasico() throws Exception {
        when(cliente.send(any(), any())).thenThrow(new InterruptedException());
        assertEquals("basico", servico("chave").responder(pergunta("oi")).origem());
        assertTrue(Thread.interrupted());
    }

    @Test
    void validaAPergunta() {
        ChatService servico = servico("");
        assertEquals("Escreva a sua pergunta.",
                assertThrows(RegraDeNegocioException.class, () -> servico.responder(pergunta("  "))).getMessage());
        assertThrows(RegraDeNegocioException.class, () -> servico.responder(null));
        assertThrows(RegraDeNegocioException.class, () -> servico.responder(pergunta("a".repeat(501))));
    }

    @Test
    void catalogoFicaGuardadoPorCincoMinutos() {
        ChatService servico = servico("");
        servico.responder(pergunta("oi"));
        servico.responder(pergunta("oi"));
        verify(cursoService, times(1)).listarTodos();

        agora.addAndGet(ChatService.CATALOGO_VALIDO_POR_MS);
        servico.responder(pergunta("oi"));
        verify(cursoService, times(2)).listarTodos();
    }

    @Test
    void descreveATurmaComVagas() {
        assertEquals("Turma A (EAD, Seg 19h, 2026/2) · 3 vagas",
                ChatService.descreverTurma(new TurmaDisponivel(1, "Turma A", "EAD", "Seg 19h", "2026/2", 30, 3)));
        assertEquals("Turma · 1 vaga", ChatService.descreverTurma(new TurmaDisponivel(1, null, " ", null, "", 30, 1)));
        assertEquals("Turma B · sem vagas (lista de espera)",
                ChatService.descreverTurma(new TurmaDisponivel(1, "Turma B", null, null, null, 30, 0)));
    }

    @Test
    void historicoGuardaSoAsUltimasMensagensECortaAsLongas() {
        List<ChatPergunta.Mensagem> lista = new ArrayList<>();
        for (int i = 0; i < 12; i++) lista.add(new ChatPergunta.Mensagem("x", "m" + i));
        lista.add(new ChatPergunta.Mensagem("assistente", "a".repeat(2000)));

        var historico = ChatService.historico(new ChatPergunta("oi", lista));
        assertEquals(ChatService.MAX_MENSAGENS_HISTORICO, historico.size());
        assertEquals("aluno", historico.get(0).autor());
        assertEquals("m3", historico.get(0).texto());
        assertEquals(1500, historico.get(9).texto().length());
        assertEquals("assistente", historico.get(9).autor());
        assertTrue(ChatService.historico(new ChatPergunta("oi", null)).isEmpty());
    }
}
