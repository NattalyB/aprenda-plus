package com.aprendaplus.service;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.entity.TurmaProfessorId;
import com.aprendaplus.repository.TurmaProfessorRepository;
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
class TurmaProfessorServiceTest {

    @Mock
    private TurmaProfessorRepository turmaProfessorRepository;

    @InjectMocks
    private TurmaProfessorService turmaProfessorService;

    @Test
    void deveListarTodosOsVinculos() {
        TurmaProfessor vinculo = new TurmaProfessor();
        when(turmaProfessorRepository.findAll()).thenReturn(Arrays.asList(vinculo));

        List<TurmaProfessor> resultado = turmaProfessorService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveSalvarVinculo() {
        TurmaProfessor vinculo = new TurmaProfessor();
        when(turmaProfessorRepository.save(vinculo)).thenReturn(vinculo);

        TurmaProfessor resultado = turmaProfessorService.salvar(vinculo);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirVinculo() {
        TurmaProfessorId id = new TurmaProfessorId(1, 1);

        turmaProfessorService.deletar(id);

        verify(turmaProfessorRepository, times(1)).deleteById(id);
    }
}