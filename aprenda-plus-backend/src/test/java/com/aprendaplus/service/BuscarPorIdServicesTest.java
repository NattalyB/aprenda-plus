package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Aula;
import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.AulaRepository;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import com.aprendaplus.repository.PagamentoRepository;
import com.aprendaplus.repository.PeriodoLetivoRepository;
import com.aprendaplus.repository.PlanoDeAulaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.TurmaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

// Testa a busca por id de todos os services, nos dois cenários:
// quando o registro existe (devolve o registro) e quando não existe
// (lança uma exceção com a mensagem "não encontrado").
@ExtendWith(MockitoExtension.class)
class BuscarPorIdServicesTest {

    @Mock
    private AlunoRepository alunoRepository;

    @InjectMocks
    private AlunoService alunoService;

    @Mock
    private AulaRepository aulaRepository;

    @InjectMocks
    private AulaService aulaService;

    @Mock
    private CarrinhoRepository carrinhoRepository;

    @InjectMocks
    private CarrinhoService carrinhoService;

    @Mock
    private CursoRepository cursoRepository;

    @InjectMocks
    private CursoService cursoService;

    @Mock
    private DisciplinaRepository disciplinaRepository;

    @InjectMocks
    private DisciplinaService disciplinaService;

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @InjectMocks
    private FuncionarioService funcionarioService;

    @Mock
    private InscricaoRepository inscricaoRepository;

    @InjectMocks
    private InscricaoService inscricaoService;

    @Mock
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @InjectMocks
    private ItemCarrinhoService itemCarrinhoService;

    @Mock
    private MatriculaRepository matriculaRepository;

    @InjectMocks
    private MatriculaService matriculaService;

    @Mock
    private PagamentoRepository pagamentoRepository;

    @InjectMocks
    private PagamentoService pagamentoService;

    @Mock
    private PeriodoLetivoRepository periodoLetivoRepository;

    @InjectMocks
    private PeriodoLetivoService periodoLetivoService;

    @Mock
    private PlanoDeAulaRepository planoDeAulaRepository;

    @InjectMocks
    private PlanoDeAulaService planoDeAulaService;

    @Mock
    private ProfessorRepository professorRepository;

    @InjectMocks
    private ProfessorService professorService;

    @Mock
    private TurmaRepository turmaRepository;

    @InjectMocks
    private TurmaService turmaService;

    // ===== Aluno =====

    @Test
    void deveBuscarAlunoPorId() {
        Aluno registro = new Aluno();
        registro.setIdAluno(1);
        when(alunoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, alunoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoAlunoNaoExiste() {
        when(alunoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> alunoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Aula =====

    @Test
    void deveBuscarAulaPorId() {
        Aula registro = new Aula();
        registro.setIdAula(1);
        when(aulaRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, aulaService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoAulaNaoExiste() {
        when(aulaRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> aulaService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Carrinho =====

    @Test
    void deveBuscarCarrinhoPorId() {
        Carrinho registro = new Carrinho();
        registro.setIdCarrinho(1);
        when(carrinhoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, carrinhoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoCarrinhoNaoExiste() {
        when(carrinhoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> carrinhoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Curso =====

    @Test
    void deveBuscarCursoPorId() {
        Curso registro = new Curso();
        registro.setIdCurso(1);
        when(cursoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, cursoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoCursoNaoExiste() {
        when(cursoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> cursoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Disciplina =====

    @Test
    void deveBuscarDisciplinaPorId() {
        Disciplina registro = new Disciplina();
        registro.setIdDisciplina(1);
        when(disciplinaRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, disciplinaService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoDisciplinaNaoExiste() {
        when(disciplinaRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> disciplinaService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Funcionario =====

    @Test
    void deveBuscarFuncionarioPorId() {
        Funcionario registro = new Funcionario();
        registro.setIdFuncionario(1);
        when(funcionarioRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, funcionarioService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoFuncionarioNaoExiste() {
        when(funcionarioRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> funcionarioService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Inscricao =====

    @Test
    void deveBuscarInscricaoPorId() {
        Inscricao registro = new Inscricao();
        registro.setIdInscricao(1);
        when(inscricaoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, inscricaoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoInscricaoNaoExiste() {
        when(inscricaoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> inscricaoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== ItemCarrinho =====

    @Test
    void deveBuscarItemCarrinhoPorId() {
        ItemCarrinho registro = new ItemCarrinho();
        registro.setIdItem(1);
        when(itemCarrinhoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, itemCarrinhoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoItemCarrinhoNaoExiste() {
        when(itemCarrinhoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> itemCarrinhoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Matricula =====

    @Test
    void deveBuscarMatriculaPorId() {
        Matricula registro = new Matricula();
        registro.setIdMatricula(1);
        when(matriculaRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, matriculaService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoMatriculaNaoExiste() {
        when(matriculaRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> matriculaService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Pagamento =====

    @Test
    void deveBuscarPagamentoPorId() {
        Pagamento registro = new Pagamento();
        registro.setIdPagamento(1);
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, pagamentoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoPagamentoNaoExiste() {
        when(pagamentoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> pagamentoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== PeriodoLetivo =====

    @Test
    void deveBuscarPeriodoLetivoPorId() {
        PeriodoLetivo registro = new PeriodoLetivo();
        registro.setIdPeriodoLetivo(1);
        when(periodoLetivoRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, periodoLetivoService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoPeriodoLetivoNaoExiste() {
        when(periodoLetivoRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> periodoLetivoService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== PlanoDeAula =====

    @Test
    void deveBuscarPlanoDeAulaPorId() {
        PlanoDeAula registro = new PlanoDeAula();
        registro.setIdPlano(1);
        when(planoDeAulaRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, planoDeAulaService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoPlanoDeAulaNaoExiste() {
        when(planoDeAulaRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> planoDeAulaService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Professor =====

    @Test
    void deveBuscarProfessorPorId() {
        Professor registro = new Professor();
        registro.setIdProfessor(1);
        when(professorRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, professorService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoProfessorNaoExiste() {
        when(professorRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> professorService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }

    // ===== Turma =====

    @Test
    void deveBuscarTurmaPorId() {
        Turma registro = new Turma();
        registro.setIdTurma(1);
        when(turmaRepository.findById(1)).thenReturn(Optional.of(registro));

        assertSame(registro, turmaService.buscarPorId(1));
    }

    @Test
    void deveLancarExcecaoQuandoTurmaNaoExiste() {
        when(turmaRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException erro = assertThrows(RuntimeException.class, () -> turmaService.buscarPorId(99));
        assertTrue(erro.getMessage().contains("99"));
    }
}
