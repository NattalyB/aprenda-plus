package com.aprendaplus.service;

import com.aprendaplus.dto.VinculosProfessor;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.entity.CursoProfessorId;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.entity.DisciplinaProfessorId;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.CursoProfessorRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaProfessorRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfessorServiceTest {

    @Mock
    private ProfessorRepository professorRepository;

    @Mock
    private CursoRepository cursoRepository;

    @Mock
    private DisciplinaRepository disciplinaRepository;

    @Mock
    private CursoProfessorRepository cursoProfessorRepository;

    @Mock
    private DisciplinaProfessorRepository disciplinaProfessorRepository;

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

    // ===== Operações básicas =====

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
    void excluirProfessorRemoveOsVinculosAntes() {
        List<CursoProfessor> cursos = List.of(vinculoCurso(curso(1)));
        List<DisciplinaProfessor> disciplinas = List.of(vinculoDisciplina(disciplina(10, 1, "Java")));
        when(cursoProfessorRepository.findByIdProfessorId(1)).thenReturn(cursos);
        when(disciplinaProfessorRepository.findByIdProfessorId(1)).thenReturn(disciplinas);

        professorService.deletar(1);

        verify(cursoProfessorRepository).deleteAll(cursos);
        verify(disciplinaProfessorRepository).deleteAll(disciplinas);
        verify(professorRepository, times(1)).deleteById(1);
    }

    // ===== Montagem dos dados de teste =====

    private Curso curso(int id) {
        Curso curso = new Curso();
        curso.setIdCurso(id);
        curso.setNome("Curso " + id);
        return curso;
    }

    private Disciplina disciplina(int id, int idCurso, String nome) {
        Disciplina disciplina = new Disciplina();
        disciplina.setIdDisciplina(id);
        disciplina.setNome(nome);
        disciplina.setCurso(curso(idCurso));
        return disciplina;
    }

    private CursoProfessor vinculoCurso(Curso curso) {
        return new CursoProfessor(curso, professor);
    }

    private DisciplinaProfessor vinculoDisciplina(Disciplina disciplina) {
        return new DisciplinaProfessor(disciplina, professor);
    }

    // Guarda tudo o que foi passado para saveAll / deleteAll
    @SuppressWarnings("unchecked")
    private <T> List<T> capturado(ArgumentCaptor<Iterable> captor) {
        List<T> lista = new ArrayList<>();
        captor.getValue().forEach(item -> lista.add((T) item));
        return lista;
    }

    // ===== Buscar vínculos =====

    @Test
    void buscarVinculosDevolveOsIdsEmOrdem() {
        when(cursoProfessorRepository.findByIdProfessorId(1))
                .thenReturn(List.of(vinculoCurso(curso(3)), vinculoCurso(curso(1))));
        when(disciplinaProfessorRepository.findByIdProfessorId(1))
                .thenReturn(List.of(vinculoDisciplina(disciplina(20, 3, "B")), vinculoDisciplina(disciplina(10, 1, "A"))));

        VinculosProfessor vinculos = professorService.buscarVinculos(1);

        assertEquals(List.of(1, 3), vinculos.cursos());
        assertEquals(List.of(10, 20), vinculos.disciplinas());
    }

    // ===== Salvar vínculos =====

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void salvarVinculosCriaOsNovosERemoveOsDesmarcados() {
        // Hoje: curso 1 e disciplina 10. Novo: cursos 1 e 2, disciplinas 20 e 21.
        Curso curso1 = curso(1);
        Curso curso2 = curso(2);
        Disciplina disc10 = disciplina(10, 1, "Lógica");
        Disciplina disc20 = disciplina(20, 2, "Redes");
        Disciplina disc21 = disciplina(21, 2, "Segurança");

        CursoProfessor vinculoCurso1 = vinculoCurso(curso1);
        DisciplinaProfessor vinculoDisc10 = vinculoDisciplina(disc10);

        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));
        when(cursoRepository.findAllById(any())).thenReturn(List.of(curso1, curso2));
        when(disciplinaRepository.findAllById(any())).thenReturn(List.of(disc20, disc21));
        when(cursoProfessorRepository.findByIdProfessorId(1)).thenReturn(List.of(vinculoCurso1));
        when(disciplinaProfessorRepository.findByIdProfessorId(1)).thenReturn(List.of(vinculoDisc10));

        VinculosProfessor resultado = professorService.salvarVinculos(1,
                new VinculosProfessor(List.of(2, 1, 2), List.of(21, 20)));

        assertEquals(List.of(1, 2), resultado.cursos());
        assertEquals(List.of(20, 21), resultado.disciplinas());

        // Cursos: o 1 continua (nada a remover) e só o 2 é criado
        ArgumentCaptor<Iterable> cursosRemovidos = ArgumentCaptor.forClass(Iterable.class);
        ArgumentCaptor<Iterable> cursosCriados = ArgumentCaptor.forClass(Iterable.class);
        verify(cursoProfessorRepository).deleteAll(cursosRemovidos.capture());
        verify(cursoProfessorRepository).saveAll(cursosCriados.capture());
        assertTrue(this.<CursoProfessor>capturado(cursosRemovidos).isEmpty());
        List<CursoProfessor> novosCursos = capturado(cursosCriados);
        assertEquals(1, novosCursos.size());
        assertEquals(new CursoProfessorId(2, 1), novosCursos.get(0).getId());

        // Disciplinas: a 10 sai, a 20 e a 21 entram
        ArgumentCaptor<Iterable> discRemovidas = ArgumentCaptor.forClass(Iterable.class);
        ArgumentCaptor<Iterable> discCriadas = ArgumentCaptor.forClass(Iterable.class);
        verify(disciplinaProfessorRepository).deleteAll(discRemovidas.capture());
        verify(disciplinaProfessorRepository).saveAll(discCriadas.capture());
        assertEquals(List.of(vinculoDisc10), capturado(discRemovidas));
        List<DisciplinaProfessor> novasDisciplinas = capturado(discCriadas);
        // A ordem em que são criadas não importa, só quais são
        assertEquals(Set.of(new DisciplinaProfessorId(20, 1), new DisciplinaProfessorId(21, 1)),
                novasDisciplinas.stream().map(DisciplinaProfessor::getId).collect(Collectors.toSet()));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void salvarListasVaziasRemoveTodosOsVinculos() {
        CursoProfessor vinculoCurso1 = vinculoCurso(curso(1));
        DisciplinaProfessor vinculoDisc10 = vinculoDisciplina(disciplina(10, 1, "Lógica"));

        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));
        when(cursoRepository.findAllById(any())).thenReturn(List.of());
        when(disciplinaRepository.findAllById(any())).thenReturn(List.of());
        when(cursoProfessorRepository.findByIdProfessorId(1)).thenReturn(List.of(vinculoCurso1));
        when(disciplinaProfessorRepository.findByIdProfessorId(1)).thenReturn(List.of(vinculoDisc10));

        // null também vale como "nenhum"
        VinculosProfessor resultado = professorService.salvarVinculos(1, new VinculosProfessor(null, Arrays.asList((Integer) null)));

        assertTrue(resultado.cursos().isEmpty());
        assertTrue(resultado.disciplinas().isEmpty());

        ArgumentCaptor<Iterable> cursosRemovidos = ArgumentCaptor.forClass(Iterable.class);
        verify(cursoProfessorRepository).deleteAll(cursosRemovidos.capture());
        assertEquals(List.of(vinculoCurso1), capturado(cursosRemovidos));

        ArgumentCaptor<Iterable> discRemovidas = ArgumentCaptor.forClass(Iterable.class);
        verify(disciplinaProfessorRepository).deleteAll(discRemovidas.capture());
        assertEquals(List.of(vinculoDisc10), capturado(discRemovidas));
    }

    @Test
    void salvarVinculosDeProfessorInexistenteEhRecusado() {
        when(professorRepository.findById(99)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> professorService.salvarVinculos(99, new VinculosProfessor(List.of(), List.of())));

        assertEquals("Professor não encontrado.", erro.getMessage());
    }

    @Test
    void cursoInexistenteEhRecusado() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));
        when(cursoRepository.findAllById(any())).thenReturn(List.of(curso(1)));

        assertThrows(RegraDeNegocioException.class,
                () -> professorService.salvarVinculos(1, new VinculosProfessor(List.of(1, 2), List.of())));
        verify(cursoProfessorRepository, never()).saveAll(anyIterable());
    }

    @Test
    void disciplinaInexistenteEhRecusada() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));
        when(cursoRepository.findAllById(any())).thenReturn(List.of(curso(1)));
        when(disciplinaRepository.findAllById(any())).thenReturn(List.of());

        assertThrows(RegraDeNegocioException.class,
                () -> professorService.salvarVinculos(1, new VinculosProfessor(List.of(1), List.of(10))));
        verify(disciplinaProfessorRepository, never()).saveAll(anyIterable());
    }

    @Test
    void disciplinaDeOutroCursoEhRecusada() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));
        when(cursoRepository.findAllById(any())).thenReturn(List.of(curso(1)));
        when(disciplinaRepository.findAllById(any())).thenReturn(List.of(disciplina(20, 2, "Redes")));

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> professorService.salvarVinculos(1, new VinculosProfessor(List.of(1), List.of(20))));

        assertEquals("A disciplina \"Redes\" não pertence a nenhum dos cursos selecionados.", erro.getMessage());
        verify(cursoProfessorRepository, never()).saveAll(anyIterable());
    }

    @Test
    void disciplinaSemCursoEhRecusada() {
        Disciplina semCurso = disciplina(30, 1, "Avulsa");
        semCurso.setCurso(null);
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor));
        when(cursoRepository.findAllById(any())).thenReturn(List.of(curso(1)));
        when(disciplinaRepository.findAllById(any())).thenReturn(List.of(semCurso));

        assertThrows(RegraDeNegocioException.class,
                () -> professorService.salvarVinculos(1, new VinculosProfessor(List.of(1), List.of(30))));
    }
}
