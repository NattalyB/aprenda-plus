package com.aprendaplus.service;

import com.aprendaplus.entity.PeriodoLetivoCurso;
import com.aprendaplus.entity.PeriodoLetivoCursoId;
import com.aprendaplus.repository.PeriodoLetivoCursoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PeriodoLetivoCursoServiceTest {

    @Mock
    private PeriodoLetivoCursoRepository periodoLetivoCursoRepository;

    @InjectMocks
    private PeriodoLetivoCursoService periodoLetivoCursoService;

    @Test
    void deveListarTodosOsVinculos() {
        PeriodoLetivoCurso vinculo = new PeriodoLetivoCurso();
        when(periodoLetivoCursoRepository.findAll()).thenReturn(Arrays.asList(vinculo));

        List<PeriodoLetivoCurso> resultado = periodoLetivoCursoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveSalvarVinculo() {
        PeriodoLetivoCurso vinculo = new PeriodoLetivoCurso();
        when(periodoLetivoCursoRepository.save(vinculo)).thenReturn(vinculo);

        PeriodoLetivoCurso resultado = periodoLetivoCursoService.salvar(vinculo);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirVinculo() {
        PeriodoLetivoCursoId id = new PeriodoLetivoCursoId(1, 1);

        periodoLetivoCursoService.deletar(id);

        verify(periodoLetivoCursoRepository, times(1)).deleteById(id);
    }
}