package com.aprendaplus.service;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.entity.DisciplinaProfessorId;
import com.aprendaplus.repository.DisciplinaProfessorRepository;
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
class DisciplinaProfessorServiceTest {

    @Mock
    private DisciplinaProfessorRepository disciplinaProfessorRepository;

    @InjectMocks
    private DisciplinaProfessorService disciplinaProfessorService;

    @Test
    void deveListarTodosOsVinculos() {
        DisciplinaProfessor vinculo = new DisciplinaProfessor();
        when(disciplinaProfessorRepository.findAll()).thenReturn(Arrays.asList(vinculo));

        List<DisciplinaProfessor> resultado = disciplinaProfessorService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveSalvarVinculo() {
        DisciplinaProfessor vinculo = new DisciplinaProfessor();
        when(disciplinaProfessorRepository.save(vinculo)).thenReturn(vinculo);

        DisciplinaProfessor resultado = disciplinaProfessorService.salvar(vinculo);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirVinculo() {
        DisciplinaProfessorId id = new DisciplinaProfessorId(1, 1);

        disciplinaProfessorService.deletar(id);

        verify(disciplinaProfessorRepository, times(1)).deleteById(id);
    }
}