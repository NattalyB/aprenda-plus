package com.aprendaplus.service;

import com.aprendaplus.entity.Matricula;
import com.aprendaplus.repository.MatriculaRepository;
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
class MatriculaServiceTest {

    @Mock
    private MatriculaRepository matriculaRepository;

    @InjectMocks
    private MatriculaService matriculaService;

    private Matricula matricula;

    @BeforeEach
    void setUp() {
        matricula = new Matricula();
        matricula.setIdMatricula(1);
        matricula.setStatus("ativa");
    }

    @Test
    void deveListarTodasAsMatriculas() {
        when(matriculaRepository.findAll()).thenReturn(Arrays.asList(matricula));

        List<Matricula> resultado = matriculaService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarMatriculaPorId() {
        when(matriculaRepository.findById(1)).thenReturn(Optional.of(matricula));

        Matricula resultado = matriculaService.buscarPorId(1);

        assertEquals("ativa", resultado.getStatus());
    }

    @Test
    void deveSalvarMatricula() {
        when(matriculaRepository.save(matricula)).thenReturn(matricula);

        Matricula resultado = matriculaService.salvar(matricula);

        assertEquals("ativa", resultado.getStatus());
    }

    @Test
    void deveExcluirMatricula() {
        matriculaService.deletar(1);

        verify(matriculaRepository, times(1)).deleteById(1);
    }
}