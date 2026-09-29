package com.aprendaplus.service;

import com.aprendaplus.entity.Aula;
import com.aprendaplus.repository.AulaRepository;
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
class AulaServiceTest {

    @Mock
    private AulaRepository aulaRepository;

    @InjectMocks
    private AulaService aulaService;

    @Test
    void deveListarTodasAsAulas() {
        Aula aula = new Aula();
        aula.setIdAula(1);
        when(aulaRepository.findAll()).thenReturn(Arrays.asList(aula));

        List<Aula> resultado = aulaService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarAulaPorId() {
        Aula aula = new Aula();
        aula.setIdAula(1);
        aula.setTopico("Introdução");
        when(aulaRepository.findById(1)).thenReturn(Optional.of(aula));

        Aula resultado = aulaService.buscarPorId(1);

        assertEquals("Introdução", resultado.getTopico());
    }

    @Test
    void deveSalvarAula() {
        Aula aula = new Aula();
        when(aulaRepository.save(aula)).thenReturn(aula);

        Aula resultado = aulaService.salvar(aula);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirAula() {
        aulaService.deletar(1);

        verify(aulaRepository, times(1)).deleteById(1);
    }
}