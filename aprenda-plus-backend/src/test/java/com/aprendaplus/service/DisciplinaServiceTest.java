package com.aprendaplus.service;

import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisciplinaServiceTest {

    @Mock
    private DisciplinaRepository disciplinaRepository;

    @Mock
    private CursoRepository cursoRepository;

    @InjectMocks
    private DisciplinaService disciplinaService;

    private Disciplina disciplina;

    // Curso só com o id, do jeito que chega do navegador
    private Curso cursoComId(Integer id) {
        Curso curso = new Curso();
        curso.setIdCurso(id);
        return curso;
    }

    // Curso completo, do jeito que vem do banco
    private Curso cursoDoBanco(Integer id, String nome) {
        Curso curso = cursoComId(id);
        curso.setNome(nome);
        return curso;
    }

    @BeforeEach
    void setUp() {
        disciplina = new Disciplina();
        disciplina.setIdDisciplina(1);
        disciplina.setNome("Disciplina Teste");
        disciplina.setCargaHoraria(40);
        disciplina.setCursos(new ArrayList<>(List.of(cursoComId(1))));
    }

    private void cursosDoBancoSao(Curso... cursos) {
        when(cursoRepository.findAllById(any())).thenReturn(Arrays.asList(cursos));
    }

    private void saveDevolveAPropriaDisciplina() {
        when(disciplinaRepository.save(any(Disciplina.class))).thenAnswer(invocation -> invocation.getArgument(0));
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
        cursosDoBancoSao(cursoDoBanco(1, "ADS"));
        saveDevolveAPropriaDisciplina();

        Disciplina resultado = disciplinaService.salvar(disciplina);

        assertEquals("Disciplina Teste", resultado.getNome());
    }

    @Test
    void deveExcluirDisciplina() {
        disciplinaService.deletar(1);

        verify(disciplinaRepository, times(1)).deleteById(1);
    }

    // ===== Vários cursos =====

    @Test
    void disciplinaPodeFazerParteDeVariosCursos() {
        disciplina.setCursos(new ArrayList<>(List.of(cursoComId(1), cursoComId(3), cursoComId(1))));
        cursosDoBancoSao(cursoDoBanco(1, "ADS"), cursoDoBanco(3, "Engenharia de Software"));
        saveDevolveAPropriaDisciplina();

        Disciplina resultado = disciplinaService.salvar(disciplina);

        // Usa os cursos completos do banco, sem repetir o curso 1
        assertEquals(List.of("ADS", "Engenharia de Software"),
                resultado.getCursos().stream().map(Curso::getNome).toList());
        verify(cursoRepository).findAllById(Set.of(1, 3));
    }

    @Test
    void disciplinaSemCursoEhRecusada() {
        disciplina.setCursos(new ArrayList<>());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> disciplinaService.salvar(disciplina));

        assertEquals("Selecione pelo menos um curso para a disciplina.", erro.getMessage());
        verify(disciplinaRepository, never()).save(any());
    }

    @Test
    void listaDeCursosNulaOuSoComVaziosEhRecusada() {
        disciplina.setCursos(null);
        assertThrows(RegraDeNegocioException.class, () -> disciplinaService.salvar(disciplina));

        disciplina.setCursos(new ArrayList<>(Arrays.asList(null, cursoComId(null))));
        assertThrows(RegraDeNegocioException.class, () -> disciplinaService.salvar(disciplina));

        verify(disciplinaRepository, never()).save(any());
    }

    @Test
    void cursoInexistenteEhRecusado() {
        disciplina.setCursos(new ArrayList<>(List.of(cursoComId(1), cursoComId(99))));
        cursosDoBancoSao(cursoDoBanco(1, "ADS"));

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> disciplinaService.salvar(disciplina));

        assertTrue(erro.getMessage().contains("não existe mais"));
        verify(disciplinaRepository, never()).save(any());
    }

    // ===== Status =====

    @Test
    void disciplinaSemStatusFicaAtiva() {
        disciplina.setStatus(null);
        cursosDoBancoSao(cursoDoBanco(1, "ADS"));
        saveDevolveAPropriaDisciplina();

        assertEquals("ativa", disciplinaService.salvar(disciplina).getStatus());
    }

    @Test
    void disciplinaComStatusEmBrancoFicaAtiva() {
        disciplina.setStatus("  ");
        cursosDoBancoSao(cursoDoBanco(1, "ADS"));
        saveDevolveAPropriaDisciplina();

        assertEquals("ativa", disciplinaService.salvar(disciplina).getStatus());
    }

    @Test
    void disciplinaInativaContinuaInativa() {
        disciplina.setStatus("inativa");
        cursosDoBancoSao(cursoDoBanco(1, "ADS"));
        saveDevolveAPropriaDisciplina();

        assertEquals("inativa", disciplinaService.salvar(disciplina).getStatus());
    }
}
