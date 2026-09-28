package com.aprendaplus.service;

import com.aprendaplus.entity.Curso;
import com.aprendaplus.repository.CursoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CursoServiceTest {

    @Mock
    private CursoRepository cursoRepository;

    @InjectMocks
    private CursoService cursoService;

    private Curso curso;

    @BeforeEach
    void setUp() {
        curso = new Curso();
        curso.setIdCurso(1);
        curso.setNome("Curso Teste");
        curso.setCategoria("superior");
        curso.setCargaHoraria(40);
        curso.setModalidade("EAD");
        curso.setValor(new BigDecimal("199.90"));
    }

    @Test
    void deveListarTodosOsCursos() {
        when(cursoRepository.findAll()).thenReturn(Arrays.asList(curso));

        List<Curso> resultado = cursoService.listarTodos();

        assertEquals(1, resultado.size());
        assertEquals("Curso Teste", resultado.get(0).getNome());
        verify(cursoRepository, times(1)).findAll();
    }

    @Test
    void deveBuscarCursoPorId() {
        when(cursoRepository.findById(1)).thenReturn(Optional.of(curso));

        Curso resultado = cursoService.buscarPorId(1);

        assertNotNull(resultado);
        assertEquals("Curso Teste", resultado.getNome());
    }

    @Test
    void deveLancarExcecaoQuandoCursoNaoExiste() {
        when(cursoRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> cursoService.buscarPorId(99));
    }

    @Test
    void deveSalvarCurso() {
        when(cursoRepository.save(curso)).thenReturn(curso);

        Curso resultado = cursoService.salvar(curso);

        assertEquals("Curso Teste", resultado.getNome());
        verify(cursoRepository, times(1)).save(curso);
    }

    @Test
    void deveExcluirCurso() {
        cursoService.deletar(1);

        verify(cursoRepository, times(1)).deleteById(1);
    }
}