package com.aprendaplus.service;

import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.repository.InscricaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InscricaoServiceTest {

    @Mock
    private InscricaoRepository inscricaoRepository;

    @InjectMocks
    private InscricaoService inscricaoService;

    private Inscricao inscricao;

    @BeforeEach
    void setUp() {
        inscricao = new Inscricao();
        inscricao.setIdInscricao(1);
        inscricao.setStatus("pendente_pagamento");
        inscricao.setValorTotal(new BigDecimal("199.90"));
    }

    @Test
    void deveListarTodasAsInscricoes() {
        when(inscricaoRepository.findAll()).thenReturn(Arrays.asList(inscricao));

        List<Inscricao> resultado = inscricaoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarInscricaoPorId() {
        when(inscricaoRepository.findById(1)).thenReturn(Optional.of(inscricao));

        Inscricao resultado = inscricaoService.buscarPorId(1);

        assertEquals("pendente_pagamento", resultado.getStatus());
    }

    @Test
    void deveAtualizarStatusDaInscricao() {
        inscricao.setStatus("confirmada");
        when(inscricaoRepository.save(inscricao)).thenReturn(inscricao);

        Inscricao resultado = inscricaoService.salvar(inscricao);

        assertEquals("confirmada", resultado.getStatus());
    }

    @Test
    void deveExcluirInscricao() {
        inscricaoService.deletar(1);

        verify(inscricaoRepository, times(1)).deleteById(1);
    }
}