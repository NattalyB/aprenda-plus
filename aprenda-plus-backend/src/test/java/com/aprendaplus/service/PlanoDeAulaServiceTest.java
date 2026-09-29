package com.aprendaplus.service;

import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.repository.PlanoDeAulaRepository;
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
class PlanoDeAulaServiceTest {

    @Mock
    private PlanoDeAulaRepository planoDeAulaRepository;

    @InjectMocks
    private PlanoDeAulaService planoDeAulaService;

    @Test
    void deveListarTodosOsPlanos() {
        PlanoDeAula plano = new PlanoDeAula();
        plano.setIdPlano(1);
        when(planoDeAulaRepository.findAll()).thenReturn(Arrays.asList(plano));

        List<PlanoDeAula> resultado = planoDeAulaService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarPlanoPorId() {
        PlanoDeAula plano = new PlanoDeAula();
        plano.setIdPlano(1);
        when(planoDeAulaRepository.findById(1)).thenReturn(Optional.of(plano));

        PlanoDeAula resultado = planoDeAulaService.buscarPorId(1);

        assertEquals(1, resultado.getIdPlano());
    }

    @Test
    void deveSalvarPlano() {
        PlanoDeAula plano = new PlanoDeAula();
        when(planoDeAulaRepository.save(plano)).thenReturn(plano);

        PlanoDeAula resultado = planoDeAulaService.salvar(plano);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirPlano() {
        planoDeAulaService.deletar(1);

        verify(planoDeAulaRepository, times(1)).deleteById(1);
    }
}