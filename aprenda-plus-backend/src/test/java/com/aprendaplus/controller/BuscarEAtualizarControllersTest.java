package com.aprendaplus.controller;

import com.aprendaplus.entity.Aula;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.service.AulaService;
import com.aprendaplus.service.CursoService;
import com.aprendaplus.service.DisciplinaService;
import com.aprendaplus.service.FuncionarioService;
import com.aprendaplus.service.InscricaoService;
import com.aprendaplus.service.MatriculaService;
import com.aprendaplus.service.PagamentoService;
import com.aprendaplus.service.PeriodoLetivoService;
import com.aprendaplus.service.PlanoDeAulaService;
import com.aprendaplus.service.TurmaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Completa os testes dos controllers de cadastro com as rotas que faltavam:
// buscar por id (GET /rota/{id}) e atualizar (PUT /rota/{id}).
// No atualizar, confere também que o id da URL é o que vai para o registro salvo.
@WebMvcTest({
        AulaController.class,
        CursoController.class,
        DisciplinaController.class,
        FuncionarioController.class,
        InscricaoController.class,
        MatriculaController.class,
        PagamentoController.class,
        PeriodoLetivoController.class,
        PlanoDeAulaController.class,
        TurmaController.class
})
class BuscarEAtualizarControllersTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AulaService aulaService;

    @MockitoBean
    private CursoService cursoService;

    @MockitoBean
    private DisciplinaService disciplinaService;

    @MockitoBean
    private FuncionarioService funcionarioService;

    @MockitoBean
    private InscricaoService inscricaoService;

    @MockitoBean
    private MatriculaService matriculaService;

    @MockitoBean
    private PagamentoService pagamentoService;

    @MockitoBean
    private PeriodoLetivoService periodoLetivoService;

    @MockitoBean
    private PlanoDeAulaService planoDeAulaService;

    @MockitoBean
    private TurmaService turmaService;

    // ===== Aula (/aulas) =====

    @Test
    void deveBuscarAulaPorId() throws Exception {
        Aula registro = new Aula();
        registro.setIdAula(1);
        when(aulaService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/aulas/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idAula").value(1));
    }

    @Test
    void deveAtualizarAula() throws Exception {
        when(aulaService.salvar(any(Aula.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/aulas/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idAula").value(1));
    }

    // ===== Curso (/cursos) =====

    @Test
    void deveBuscarCursoPorId() throws Exception {
        Curso registro = new Curso();
        registro.setIdCurso(1);
        when(cursoService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/cursos/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCurso").value(1));
    }

    @Test
    void deveAtualizarCurso() throws Exception {
        when(cursoService.salvar(any(Curso.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/cursos/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCurso").value(1));
    }

    // ===== Disciplina (/disciplinas) =====

    @Test
    void deveBuscarDisciplinaPorId() throws Exception {
        Disciplina registro = new Disciplina();
        registro.setIdDisciplina(1);
        when(disciplinaService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/disciplinas/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idDisciplina").value(1));
    }

    @Test
    void deveAtualizarDisciplina() throws Exception {
        when(disciplinaService.salvar(any(Disciplina.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/disciplinas/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idDisciplina").value(1));
    }

    // ===== Funcionario (/funcionarios) =====

    @Test
    void deveBuscarFuncionarioPorId() throws Exception {
        Funcionario registro = new Funcionario();
        registro.setIdFuncionario(1);
        when(funcionarioService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/funcionarios/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idFuncionario").value(1));
    }

    @Test
    void deveAtualizarFuncionario() throws Exception {
        when(funcionarioService.salvar(any(Funcionario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/funcionarios/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idFuncionario").value(1));
    }

    // ===== Inscricao (/inscricoes) =====

    @Test
    void deveBuscarInscricaoPorId() throws Exception {
        Inscricao registro = new Inscricao();
        registro.setIdInscricao(1);
        when(inscricaoService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/inscricoes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idInscricao").value(1));
    }

    @Test
    void deveAtualizarInscricao() throws Exception {
        when(inscricaoService.salvar(any(Inscricao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/inscricoes/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idInscricao").value(1));
    }

    // ===== Matricula (/matriculas) =====

    @Test
    void deveBuscarMatriculaPorId() throws Exception {
        Matricula registro = new Matricula();
        registro.setIdMatricula(1);
        when(matriculaService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/matriculas/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idMatricula").value(1));
    }

    @Test
    void deveAtualizarMatricula() throws Exception {
        when(matriculaService.salvar(any(Matricula.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/matriculas/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idMatricula").value(1));
    }

    // ===== Pagamento (/pagamentos) =====

    @Test
    void deveBuscarPagamentoPorId() throws Exception {
        Pagamento registro = new Pagamento();
        registro.setIdPagamento(1);
        when(pagamentoService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/pagamentos/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPagamento").value(1));
    }

    @Test
    void deveAtualizarPagamento() throws Exception {
        when(pagamentoService.salvar(any(Pagamento.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/pagamentos/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPagamento").value(1));
    }

    // ===== PeriodoLetivo (/periodos-letivos) =====

    @Test
    void deveBuscarPeriodoLetivoPorId() throws Exception {
        PeriodoLetivo registro = new PeriodoLetivo();
        registro.setIdPeriodoLetivo(1);
        when(periodoLetivoService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/periodos-letivos/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPeriodoLetivo").value(1));
    }

    @Test
    void deveAtualizarPeriodoLetivo() throws Exception {
        when(periodoLetivoService.salvar(any(PeriodoLetivo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/periodos-letivos/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPeriodoLetivo").value(1));
    }

    // ===== PlanoDeAula (/planos-de-aula) =====

    @Test
    void deveBuscarPlanoDeAulaPorId() throws Exception {
        PlanoDeAula registro = new PlanoDeAula();
        registro.setIdPlano(1);
        when(planoDeAulaService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/planos-de-aula/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPlano").value(1));
    }

    @Test
    void deveAtualizarPlanoDeAula() throws Exception {
        when(planoDeAulaService.salvar(any(PlanoDeAula.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/planos-de-aula/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPlano").value(1));
    }

    // ===== Turma (/turmas) =====

    @Test
    void deveBuscarTurmaPorId() throws Exception {
        Turma registro = new Turma();
        registro.setIdTurma(1);
        when(turmaService.buscarPorId(1)).thenReturn(registro);

        mockMvc.perform(get("/turmas/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idTurma").value(1));
    }

    @Test
    void deveAtualizarTurma() throws Exception {
        when(turmaService.salvar(any(Turma.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/turmas/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idTurma").value(1));
    }

    // ===== Curso: exclusão (não tinha teste) =====

    @Test
    void deveExcluirCurso() throws Exception {
        mockMvc.perform(delete("/cursos/1"))
                .andExpect(status().isNoContent());

        verify(cursoService).deletar(1);
    }
}
