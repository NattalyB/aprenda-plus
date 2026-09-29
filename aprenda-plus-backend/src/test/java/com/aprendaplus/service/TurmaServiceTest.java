package com.aprendaplus.service;

import com.aprendaplus.entity.Turma;
import com.aprendaplus.repository.TurmaRepository;
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
class TurmaServiceTest {

    @Mock
    private TurmaRepository turmaRepository;

    @InjectMocks
    private TurmaService turmaService;

    private Turma turma;

    @BeforeEach
    void setUp() {
        turma = new Turma();
        turma.setIdTurma(1);
        turma.setNome("Turma Teste");
        turma.setCapacidadeMaxima(30);
        turma.setStatus("inscricoes_abertas");
    }

    @Test
    void deveListarTodasAsTurmas() {
        when(turmaRepository.findAll()).thenReturn(Arrays.asList(turma));

        List<Turma> resultado = turmaService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarTurmaPorId() {
        when(turmaRepository.findById(1)).thenReturn(Optional.of(turma));

        Turma resultado = turmaService.buscarPorId(1);

        assertEquals("Turma Teste", resultado.getNome());
    }

    @Test
    void deveLancarExcecaoQuandoTurmaNaoExiste() {
        when(turmaRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> turmaService.buscarPorId(99));
    }

    @Test
    void deveSalvarTurma() {
        when(turmaRepository.save(turma)).thenReturn(turma);

        Turma resultado = turmaService.salvar(turma);

        assertEquals(30, resultado.getCapacidadeMaxima());
    }

    @Test
    void deveExcluirTurma() {
        turmaService.deletar(1);

        verify(turmaRepository, times(1)).deleteById(1);
    }
}