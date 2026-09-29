package com.aprendaplus.service;

import com.aprendaplus.entity.Professor;
import com.aprendaplus.repository.ProfessorRepository;
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
class ProfessorServiceTest {

    @Mock
    private ProfessorRepository professorRepository;

    @InjectMocks
    private ProfessorService professorService;

    private Professor professor;

    @BeforeEach
    void setUp() {
        professor = new Professor();
        professor.setIdProfessor(1);
        professor.setNomeCompleto("Professor Teste");
        professor.setEmail("professor@teste.com");
        professor.setCpf("12345678900");
    }

    @Test
    void deveListarTodosOsProfessores() {
        when(professorRepository.findAll()).thenReturn(Arrays.asList(professor));

        List<Professor> resultado = professorService.listarTodos();

        assertEquals(1, resultado.size());
        verify(professorRepository, times(1)).findAll();
    }

    @Test
    void deveBuscarProfessorPorId() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));

        Professor resultado = professorService.buscarPorId(1);

        assertEquals("Professor Teste", resultado.getNomeCompleto());
    }

    @Test
    void deveLancarExcecaoQuandoProfessorNaoExiste() {
        when(professorRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> professorService.buscarPorId(99));
    }

    @Test
    void deveSalvarProfessor() {
        when(professorRepository.save(professor)).thenReturn(professor);

        Professor resultado = professorService.salvar(professor);

        assertEquals("Professor Teste", resultado.getNomeCompleto());
    }

    @Test
    void deveExcluirProfessor() {
        professorService.deletar(1);

        verify(professorRepository, times(1)).deleteById(1);
    }
}