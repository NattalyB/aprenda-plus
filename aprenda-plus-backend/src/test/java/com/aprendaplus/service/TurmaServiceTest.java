package com.aprendaplus.service;

import com.aprendaplus.dto.TurmaDisponivel;
import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.repository.InscricaoRepository;
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

    @Mock
    private InscricaoRepository inscricaoRepository;

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

    // ===== Turmas disponíveis e vagas =====

    private Turma turmaDoCurso(int id, String nome, Integer capacidade, String status) {
        Turma t = new Turma();
        t.setIdTurma(id);
        t.setNome(nome);
        t.setCapacidadeMaxima(capacidade);
        t.setStatus(status);
        t.setModalidade("Presencial");
        t.setDiasHorarios("Seg a Qua 19h-22h");
        return t;
    }

    @Test
    void listaSoAsTurmasAbertasComAsVagasQueRestam() {
        Turma noite = turmaDoCurso(1, "Turma A - Noite", 30, "inscricoes_abertas");
        PeriodoLetivo periodo = new PeriodoLetivo();
        periodo.setNome("2026/2");
        noite.setPeriodoLetivo(periodo);
        Turma manha = turmaDoCurso(2, "Turma B - Manhã", 10, "inscricoes_abertas");
        Turma encerrada = turmaDoCurso(3, "Turma C", 10, "em_andamento");
        when(turmaRepository.findByCurso_IdCursoOrderByNomeAsc(5)).thenReturn(List.of(noite, manha, encerrada));
        when(inscricaoRepository.countByTurma_IdTurmaAndStatusNot(1, "cancelada")).thenReturn(28L);
        when(inscricaoRepository.countByTurma_IdTurmaAndStatusNot(2, "cancelada")).thenReturn(12L);

        List<TurmaDisponivel> disponiveis = turmaService.listarDisponiveisDoCurso(5);

        assertEquals(2, disponiveis.size());
        assertEquals("Turma A - Noite", disponiveis.get(0).nome());
        assertEquals(2, disponiveis.get(0).vagasRestantes());
        assertEquals("2026/2", disponiveis.get(0).periodoLetivo());
        assertEquals("Seg a Qua 19h-22h", disponiveis.get(0).diasHorarios());
        // Mais inscrições do que vagas (ex.: capacidade reduzida depois): mostra 0, nunca negativo
        assertEquals(0, disponiveis.get(1).vagasRestantes());
        assertNull(disponiveis.get(1).periodoLetivo());
    }

    @Test
    void turmaSemCapacidadeCadastradaNaoTemLimite() {
        Turma semLimite = turmaDoCurso(4, "Turma Livre", null, "inscricoes_abertas");

        assertEquals(Long.MAX_VALUE, turmaService.vagasRestantes(semLimite));
    }
}
