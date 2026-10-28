package com.aprendaplus.service;

import com.aprendaplus.dto.EventoForm;
import com.aprendaplus.entity.EventoNavegacao;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.EventoNavegacaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EventoServiceTest {

    @Mock
    private EventoNavegacaoRepository eventoRepository;

    @Mock
    private CursoRepository cursoRepository;

    @InjectMocks
    private EventoService service;

    private static final LocalDateTime AGORA = LocalDateTime.of(2026, 10, 28, 15, 0);
    private static final String SESSAO = "7f3c2a10-1b2c-4d5e-8f90-a1b2c3d4e5f6";

    @BeforeEach
    void preparar() {
        service.relogio = () -> AGORA;
        when(cursoRepository.existsById(3)).thenReturn(true);
        when(cursoRepository.existsById(99)).thenReturn(false);
    }

    private EventoNavegacao salvo() {
        ArgumentCaptor<EventoNavegacao> captor = ArgumentCaptor.forClass(EventoNavegacao.class);
        verify(eventoRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void registraBuscaDeVisitante() {
        service.registrar(new EventoForm("busca", SESSAO.toUpperCase(), null, "  Ciência   de dados ", 2), null);

        EventoNavegacao evento = salvo();
        assertEquals("BUSCA", evento.getTipo());
        assertEquals(SESSAO, evento.getSessao());
        assertEquals("Ciência de dados", evento.getTermo());
        assertEquals(2, evento.getResultados());
        assertNull(evento.getAlunoId());
        assertNull(evento.getCursoId());
        assertEquals(AGORA, evento.getQuando());
    }

    @Test
    void registraCursoVistoPeloAlunoLogado() {
        service.registrar(new EventoForm("VISUALIZACAO", SESSAO, 3, "ignorado", 5), 7);

        EventoNavegacao evento = salvo();
        assertEquals("VISUALIZACAO", evento.getTipo());
        assertEquals(3, evento.getCursoId());
        assertEquals(7, evento.getAlunoId());
        assertNull(evento.getTermo());
        assertNull(evento.getResultados());
    }

    @Test
    void registraCursoPostoNoCarrinho() {
        service.registrar(new EventoForm("CARRINHO", SESSAO, 3, null, null), 7);
        assertEquals("CARRINHO", salvo().getTipo());
    }

    @Test
    void resultadosFicamDentroDoLimite() {
        service.registrar(new EventoForm("BUSCA", SESSAO, null, "web", -4), null);
        assertEquals(0, salvo().getResultados());
    }

    @Test
    void termoMuitoLongoEhCortado() {
        assertEquals(100, EventoService.limparTermo("a".repeat(250)).length());
        assertEquals("", EventoService.limparTermo(null));
    }

    @Test
    void recusaEventosInvalidos() {
        assertThrows(RegraDeNegocioException.class, () -> service.registrar(null, null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm("BUSCA", "nao-e-uuid", null, "web", 1), null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm("BUSCA", null, null, "web", 1), null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm("BUSCA", SESSAO, null, " a ", 1), null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm("VISUALIZACAO", SESSAO, 99, null, null), null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm("CARRINHO", SESSAO, null, null, null), null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm("CLIQUE", SESSAO, 3, null, null), null));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrar(new EventoForm(null, SESSAO, 3, null, null), null));
        verify(eventoRepository, never()).save(any());
    }
}
