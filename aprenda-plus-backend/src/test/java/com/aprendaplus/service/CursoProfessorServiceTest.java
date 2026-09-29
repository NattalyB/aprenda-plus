package com.aprendaplus.service;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.entity.CursoProfessorId;
import com.aprendaplus.repository.CursoProfessorRepository;
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
class CursoProfessorServiceTest {

    @Mock
    private CursoProfessorRepository cursoProfessorRepository;

    @InjectMocks
    private CursoProfessorService cursoProfessorService;

    @Test
    void deveListarTodosOsVinculos() {
        CursoProfessor vinculo = new CursoProfessor();
        when(cursoProfessorRepository.findAll()).thenReturn(Arrays.asList(vinculo));

        List<CursoProfessor> resultado = cursoProfessorService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveSalvarVinculo() {
        CursoProfessor vinculo = new CursoProfessor();
        when(cursoProfessorRepository.save(vinculo)).thenReturn(vinculo);

        CursoProfessor resultado = cursoProfessorService.salvar(vinculo);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirVinculo() {
        CursoProfessorId id = new CursoProfessorId(1, 1);

        cursoProfessorService.deletar(id);

        verify(cursoProfessorRepository, times(1)).deleteById(id);
    }
}