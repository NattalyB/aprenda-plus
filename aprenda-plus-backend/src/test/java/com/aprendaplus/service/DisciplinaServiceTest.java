package com.aprendaplus.service;

import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.repository.DisciplinaRepository;
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
class DisciplinaServiceTest {

    @Mock
    private DisciplinaRepository disciplinaRepository;

    @InjectMocks
    private DisciplinaService disciplinaService;

    private Disciplina disciplina;

    @BeforeEach
    void setUp() {
        disciplina = new Disciplina();
        disciplina.setIdDisciplina(1);
        disciplina.setNome("Disciplina Teste");
        disciplina.setCargaHoraria(40);
    }

    @Test
    void deveListarTodasAsDisciplinas() {
        when(disciplinaRepository.findAll()).thenReturn(Arrays.asList(disciplina));

        List<Disciplina> resultado = disciplinaService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarDisciplinaPorId() {
        when(disciplinaRepository.findById(1)).thenReturn(Optional.of(disciplina));

        Disciplina resultado = disciplinaService.buscarPorId(1);

        assertEquals("Disciplina Teste", resultado.getNome());
    }

    @Test
    void deveLancarExcecaoQuandoDisciplinaNaoExiste() {
        when(disciplinaRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> disciplinaService.buscarPorId(99));
    }

    @Test
    void deveSalvarDisciplina() {
        when(disciplinaRepository.save(disciplina)).thenReturn(disciplina);

        Disciplina resultado = disciplinaService.salvar(disciplina);

        assertEquals("Disciplina Teste", resultado.getNome());
    }

    @Test
    void deveExcluirDisciplina() {
        disciplinaService.deletar(1);

        verify(disciplinaRepository, times(1)).deleteById(1);
    }
}