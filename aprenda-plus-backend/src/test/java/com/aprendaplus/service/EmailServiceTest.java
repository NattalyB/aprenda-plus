package com.aprendaplus.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailServiceTest {

    private final HttpClient cliente = mock(HttpClient.class);

    @AfterEach
    void limparTransacao() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @SuppressWarnings("unchecked")
    private void brevoResponde(int status) {
        HttpResponse<String> resposta = mock(HttpResponse.class);
        lenient().when(resposta.statusCode()).thenReturn(status);
        lenient().when(resposta.body()).thenReturn("{}");
        when(cliente.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(CompletableFuture.completedFuture(resposta));
    }

    private EmailService configurado() {
        return new EmailService("chave-teste", "nao-responda@aprendaplus.com", "https://site/", cliente);
    }

    @Test
    void semChaveNaoEnviaNada() {
        EmailService semChave = new EmailService(null, null, "https://site/", cliente);

        semChave.matriculaConfirmada("lucas@aluno.com", "Lucas", "Redes", "Turma A");

        assertFalse(semChave.configurado());
        verifyNoInteractions(cliente);
        assertFalse(new EmailService("chave", " ", "x", cliente).configurado());
        assertNotNull(new EmailService("", "", "https://site/"));
    }

    @Test
    void semEmailDoAlunoNaoEnvia() {
        EmailService servico = configurado();

        servico.vagaLiberada(null, "Lucas", "Redes", "Turma A");
        servico.vagaLiberada(" ", "Lucas", "Redes", "Turma A");

        verifyNoInteractions(cliente);
    }

    @Test
    void enviaPelaApiDoBrevoComAChaveEOTextoCerto() throws Exception {
        brevoResponde(201);

        configurado().matriculaConfirmada("lucas@aluno.com", "Lucas \"Luke\" Almeida", "Redes <Noite>", "Turma A");

        ArgumentCaptor<HttpRequest> captor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(cliente).sendAsync(captor.capture(), any());
        HttpRequest requisicao = captor.getValue();
        assertEquals(EmailService.URL_BREVO, requisicao.uri().toString());
        assertEquals("chave-teste", requisicao.headers().firstValue("api-key").orElseThrow());
        assertEquals("POST", requisicao.method());
    }

    @Test
    void falhasDoBrevoSoViramAvisoNoLog() {
        brevoResponde(400);
        configurado().documentoRecusado("lucas@aluno.com", null, "Ilegível");

        reset(cliente);
        when(cliente.sendAsync(any(HttpRequest.class), any())).thenReturn(CompletableFuture.failedFuture(new IOException("sem rede")));
        configurado().documentoRecusado("lucas@aluno.com", "Lucas", " ");

        verify(cliente).sendAsync(any(HttpRequest.class), any());
    }

    @Test
    void dentroDeUmaTransacaoSoEnviaDepoisDeGravar() {
        brevoResponde(201);
        TransactionSynchronizationManager.initSynchronization();

        configurado().vagaLiberada("lucas@aluno.com", "Lucas", "Redes", "Turma A");

        verifyNoInteractions(cliente);
        for (TransactionSynchronization s : TransactionSynchronizationManager.getSynchronizations()) {
            s.afterCommit();
        }
        verify(cliente).sendAsync(any(HttpRequest.class), any());
    }

    @Test
    void textosProtegidosNoHtmlENoJson() {
        assertEquals("&lt;b&gt;&quot;A&quot; &amp; B&lt;/b&gt;", EmailService.html("<b>\"A\" & B</b>"));
        assertEquals("", EmailService.html(null));
        assertEquals("a\\\"b\\\\c\\nd\\re\\tf\\u0001", EmailService.json("a\"b\\c\nd\re\tf\u0001"));
        assertEquals("Lucas", EmailService.primeiroNome("  Lucas Almeida "));
        assertEquals("aluno(a)", EmailService.primeiroNome(" "));
        assertEquals("aluno(a)", EmailService.primeiroNome(null));
        String html = configurado().modelo("Olá", "<p>corpo</p>", "Entrar");
        assertTrue(html.contains("https://site/"));
        assertTrue(html.contains("<p>corpo</p>"));
    }
}
