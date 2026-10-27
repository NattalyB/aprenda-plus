package com.aprendaplus.service;

import com.aprendaplus.dto.AndamentoAluno;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.dto.TurmaDoProfessor;
import com.aprendaplus.entity.*;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.PlanoDeAulaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.TurmaProfessorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocenteServiceTest {

    @Mock private ProfessorRepository professorRepository;
    @Mock private PlanoDeAulaRepository planoRepository;
    @Mock private TurmaProfessorRepository turmaProfessorRepository;
    @Mock private DisciplinaRepository disciplinaRepository;
    @Mock private ConteudoEadService conteudoEadService;

    @InjectMocks
    private DocenteService service;

    private static Curso curso(int id, String nome) {
        Curso c = new Curso();
        c.setIdCurso(id);
        c.setNome(nome);
        return c;
    }

    private static Turma turma(int id, String nome) {
        Turma t = new Turma();
        t.setIdTurma(id);
        t.setNome(nome);
        t.setCurso(curso(1, "Engenharia de Software"));
        t.setModalidade("EAD");
        t.setDiasHorarios("Seg 19h");
        return t;
    }

    private static PlanoDeAula plano(Turma t) {
        PlanoDeAula p = new PlanoDeAula();
        p.setTurma(t);
        return p;
    }

    private static TurmaProfessor vinculo(Turma t) {
        TurmaProfessor v = new TurmaProfessor();
        v.setTurma(t);
        return v;
    }

    private static AndamentoAluno andamento(int percentual) {
        return new AndamentoAluno(1, "Aluno", "a@a.com", "ativa", 1, 2, percentual, null, false);
    }

    @Test
    void juntaAsTurmasResponsavelEVinculadas() {
        Turma b = turma(5, "Turma ESI-B");
        Turma a = turma(4, "Turma ESI-A");
        Turma semSala = turma(6, "Turma FST-A");
        semSala.setCurso(null);
        semSala.setPeriodoLetivo(null);
        when(planoRepository.findByProfessorResponsavel_IdProfessor(3)).thenReturn(List.of(plano(b), plano(null)));
        when(turmaProfessorRepository.findByProfessor_IdProfessor(3))
                .thenReturn(List.of(vinculo(b), vinculo(a), vinculo(semSala), vinculo(null)));
        when(conteudoEadService.planoDaTurma(5)).thenReturn(new PlanoDaTurma(9, 5, "B", 1, "ES", 3, "Roberto", List.of(), List.of()));
        when(conteudoEadService.planoDaTurma(4)).thenReturn(new PlanoDaTurma(8, 4, "A", 1, "ES", 3, "Roberto", null, List.of()));
        when(conteudoEadService.planoDaTurma(6)).thenReturn(new PlanoDaTurma(null, 6, "F", null, null, null, null, List.of(), List.of()));
        when(conteudoEadService.andamento(5)).thenReturn(List.of(andamento(50), andamento(100)));
        when(conteudoEadService.andamento(4)).thenReturn(List.of());

        List<TurmaDoProfessor> turmas = service.turmas(3);

        assertEquals(List.of("Turma ESI-A", "Turma ESI-B", "Turma FST-A"), turmas.stream().map(TurmaDoProfessor::nome).toList());
        TurmaDoProfessor esiB = turmas.get(1);
        assertTrue(esiB.responsavel());
        assertTrue(esiB.salaCriada());
        assertEquals(2, esiB.alunos());
        assertEquals(75, esiB.progressoMedio());
        assertEquals("Engenharia de Software", esiB.curso());
        assertFalse(turmas.get(0).responsavel());
        assertEquals(0, turmas.get(0).aulas());
        assertEquals(0, turmas.get(0).progressoMedio());
        assertFalse(turmas.get(2).salaCriada());
        assertNull(turmas.get(2).curso());
        verify(conteudoEadService, never()).andamento(6);
    }

    @Test
    void confereSeATurmaEhDoProfessor() {
        Turma a = turma(4, "A");
        when(planoRepository.findByProfessorResponsavel_IdProfessor(3)).thenReturn(List.of());
        when(turmaProfessorRepository.findByProfessor_IdProfessor(3)).thenReturn(List.of(vinculo(a)));

        assertTrue(service.ehTurmaDoProfessor(3, 4));
        assertFalse(service.ehTurmaDoProfessor(3, 99));
        assertFalse(service.ehTurmaDoProfessor(3, null));
        assertEquals(Map.of(), service.idsDasTurmas(null));
    }

    @Test
    void disciplinasDoCursoDaTurma() {
        when(conteudoEadService.planoDaTurma(4)).thenReturn(new PlanoDaTurma(8, 4, "A", 1, "ES", 3, "R", List.of(), List.of()));
        Disciplina banco = new Disciplina();
        banco.setIdDisciplina(2);
        banco.setNome("Banco de Dados");
        banco.setCursos(List.of(curso(1, "ES")));
        Disciplina algoritmos = new Disciplina();
        algoritmos.setIdDisciplina(1);
        algoritmos.setNome("Algoritmos");
        algoritmos.setCursos(null);
        Disciplina outra = new Disciplina();
        outra.setIdDisciplina(3);
        outra.setNome("Marketing");
        outra.setCursos(List.of(curso(7, "MD")));
        when(disciplinaRepository.findAll()).thenReturn(List.of(banco, algoritmos, outra, banco));

        List<Map<String, Object>> lista = service.disciplinasDaTurma(4);

        assertEquals(List.of("Algoritmos", "Banco de Dados"), lista.stream().map(m -> m.get("nome")).toList());
    }

    @Test
    void dadosDoProfessor() {
        Professor p = new Professor();
        p.setIdProfessor(3);
        p.setNomeCompleto("Roberto");
        p.setEmail("r@x.com");
        when(professorRepository.findById(3)).thenReturn(Optional.of(p));
        when(professorRepository.findById(9)).thenReturn(Optional.empty());

        assertEquals(new DocenteService.MeusDados(3, "Roberto", "r@x.com"), service.meusDados(3));
        assertEquals("Roberto", service.nome(3));
        assertNull(service.nome(9));
        assertThrows(RegraDeNegocioException.class, () -> service.meusDados(9));
        assertThrows(RegraDeNegocioException.class, () -> service.meusDados(null));
    }
}
