package com.aprendaplus.service;

import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.repository.PeriodoLetivoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PeriodoLetivoServiceTest {

    @Mock
    private PeriodoLetivoRepository periodoLetivoRepository;

    @InjectMocks
    private PeriodoLetivoService periodoLetivoService;

    private PeriodoLetivo periodo;

    @BeforeEach
    void setUp() {
        periodo = new PeriodoLetivo();
        periodo.setIdPeriodoLetivo(1);
        periodo.setNome("2º Semestre 2026");
        periodo.setStatus("ativo");
    }

    @Test
    void deveListarTodosOsPeriodos() {
        when(periodoLetivoRepository.findAll()).thenReturn(Arrays.asList(periodo));

        List<PeriodoLetivo> resultado = periodoLetivoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarPeriodoPorId() {
        when(periodoLetivoRepository.findById(1)).thenReturn(Optional.of(periodo));

        PeriodoLetivo resultado = periodoLetivoService.buscarPorId(1);

        assertEquals("2º Semestre 2026", resultado.getNome());
    }

    @Test
    void deveSalvarPeriodo() {
        when(periodoLetivoRepository.save(periodo)).thenReturn(periodo);

        PeriodoLetivo resultado = periodoLetivoService.salvar(periodo);

        assertEquals("ativo", resultado.getStatus());
    }

    @Test
    void deveExcluirPeriodo() {
        periodoLetivoService.deletar(1);

        verify(periodoLetivoRepository, times(1)).deleteById(1);
    }
}