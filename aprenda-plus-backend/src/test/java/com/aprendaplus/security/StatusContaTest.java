package com.aprendaplus.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StatusContaTest {

    @Test
    void contaAtivaPodeSerUsada() {
        assertNull(StatusConta.motivoDoBloqueio("ativo"));
        assertNull(StatusConta.motivoDoBloqueio(" ATIVO "));
    }

    @Test
    void contaSemStatusEhConsideradaAtiva() {
        assertNull(StatusConta.motivoDoBloqueio(null));
        assertNull(StatusConta.motivoDoBloqueio("  "));
    }

    @Test
    void contaInativaPedeParaReativarComOSuporte() {
        assertEquals("Sua conta está inativa. Entre em contato com o suporte para reativá-la.",
                StatusConta.motivoDoBloqueio("inativo"));
    }

    @Test
    void contaBloqueadaPedeParaFalarComOSuporte() {
        assertEquals("Sua conta está bloqueada. Entre em contato com o suporte.",
                StatusConta.motivoDoBloqueio("Bloqueado"));
    }

    @Test
    void statusDesconhecidoTambemBloqueia() {
        assertTrue(StatusConta.motivoDoBloqueio("suspenso").contains("suporte"));
    }
}
