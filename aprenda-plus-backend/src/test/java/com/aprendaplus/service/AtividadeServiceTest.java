package com.aprendaplus.service;

import com.aprendaplus.dto.PaginaAtividades;
import com.aprendaplus.dto.UltimaAlteracao;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.RegistroAtividade;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.RegistroAtividadeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtividadeServiceTest {

    private static final LocalDateTime AGORA = LocalDateTime.of(2026, 10, 27, 18, 45);

    @Mock
    private RegistroAtividadeRepository registroRepository;

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private ProfessorRepository professorRepository;

    @InjectMocks
    private AtividadeService service;

    @BeforeEach
    void relogio() {
        service.relogio = () -> AGORA;
    }

    private RegistroAtividade gravado() {
        ArgumentCaptor<RegistroAtividade> captor = ArgumentCaptor.forClass(RegistroAtividade.class);
        verify(registroRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void registraAlteracaoFeitaPorFuncionario() {
        Funcionario f = new Funcionario();
        f.setNomeCompleto("Carla Nascimento");
        when(funcionarioRepository.findById(2)).thenReturn(Optional.of(f));

        service.registrar("PUT", "/alunos/12", null, 2, "ADMIN", null);

        RegistroAtividade r = gravado();
        assertEquals(AGORA, r.getQuando());
        assertEquals("funcionario", r.getUsuarioTipo());
        assertEquals(2, r.getUsuarioId());
        assertEquals("Carla Nascimento", r.getUsuarioNome());
        assertEquals("Alunos", r.getModulo());
        assertEquals("alterou", r.getAcao());
        assertEquals("Alterou aluno #12", r.getDescricao());
        assertEquals("alunos", r.getAlvo());
        assertEquals(12, r.getRegistroId());
        assertEquals("PUT", r.getMetodo());
        assertEquals("/alunos/12", r.getCaminho());
    }

    public static class CursoSalvo {
        public Integer getIdCurso() { return 5; }
    }

    @Test
    void cadastroNovoLeOIdDaResposta() {
        when(funcionarioRepository.findById(9)).thenReturn(Optional.empty());

        service.registrar("POST", "/cursos", null, 9, "ADMIN", new CursoSalvo());

        RegistroAtividade r = gravado();
        assertEquals("Cadastrou curso #5", r.getDescricao());
        assertEquals(5, r.getRegistroId());
        assertEquals("Funcionário #9", r.getUsuarioNome());
    }

    @Test
    void cadastroSemIdNaRespostaFicaSemNumero() {
        Funcionario f = new Funcionario();
        f.setNomeCompleto("Ana");
        when(funcionarioRepository.findById(1)).thenReturn(Optional.of(f));

        service.registrar("POST", "/cursos", null, 1, "ADMIN", "texto");

        assertEquals("Cadastrou curso", gravado().getDescricao());
    }

    @Test
    void alunoQueSeCadastraPeloSiteViraOAutor() {
        Aluno novo = mock(Aluno.class);
        when(novo.getIdAluno()).thenReturn(30);
        when(novo.getNomeCompleto()).thenReturn("Maria Silva");

        service.registrar("POST", "/alunos/com-documento", null, null, null, novo);

        RegistroAtividade r = gravado();
        assertEquals("aluno", r.getUsuarioTipo());
        assertEquals(30, r.getUsuarioId());
        assertEquals("Maria Silva", r.getUsuarioNome());
        assertEquals("Novo cadastro de aluno pelo site #30", r.getDescricao());
    }

    @Test
    void acoesDoAlunoLogado() {
        Aluno aluno = new Aluno();
        aluno.setNomeCompleto("Lucas");
        when(alunoRepository.findById(7)).thenReturn(Optional.of(aluno));
        when(alunoRepository.findById(8)).thenReturn(Optional.empty());

        service.registrar("PUT", "/inscricoes/4/turma", null, 7, "ALUNO", null);
        service.registrar("POST", "/documentos/meus", null, 8, "ALUNO", null);

        ArgumentCaptor<RegistroAtividade> captor = ArgumentCaptor.forClass(RegistroAtividade.class);
        verify(registroRepository, times(2)).save(captor.capture());
        assertEquals("Lucas", captor.getAllValues().get(0).getUsuarioNome());
        assertEquals("aluno", captor.getAllValues().get(0).getUsuarioTipo());
        assertEquals("Aluno #8", captor.getAllValues().get(1).getUsuarioNome());
    }

    @Test
    void acoesDoProfessorPeloPortal() {
        com.aprendaplus.entity.Professor roberto = new com.aprendaplus.entity.Professor();
        roberto.setNomeCompleto("Roberto Fagundes");
        when(professorRepository.findById(3)).thenReturn(Optional.of(roberto));
        when(professorRepository.findById(4)).thenReturn(Optional.empty());

        service.registrar("POST", "/docente/turmas/5/aulas", null, 3, "PROFESSOR", null);
        service.registrar("PUT", "/docente/aulas/9", null, 4, "PROFESSOR", null);

        ArgumentCaptor<RegistroAtividade> captor = ArgumentCaptor.forClass(RegistroAtividade.class);
        verify(registroRepository, times(2)).save(captor.capture());
        RegistroAtividade primeiro = captor.getAllValues().get(0);
        assertEquals("professor", primeiro.getUsuarioTipo());
        assertEquals("Roberto Fagundes", primeiro.getUsuarioNome());
        assertEquals("Cadastrou aula EAD da turma #5", primeiro.getDescricao());
        assertEquals("/docente/turmas/5/aulas", primeiro.getCaminho());
        assertEquals("Professor #4", captor.getAllValues().get(1).getUsuarioNome());
    }

    @Test
    void visitanteSemNome() {
        service.registrar("POST", "/alunos", null, null, null, null);
        RegistroAtividade r = gravado();
        assertEquals("Visitante do site", r.getUsuarioNome());
        assertEquals("visitante", r.getUsuarioTipo());
    }

    @Test
    void naoRegistraConsultasNemDerrubaAOperacaoSeOBancoFalhar() {
        service.registrar("GET", "/alunos", null, 1, "ADMIN", null);
        verify(registroRepository, never()).save(any());

        when(registroRepository.save(any())).thenThrow(new RuntimeException("banco fora"));
        assertDoesNotThrow(() -> service.registrar("DELETE", "/cursos/3", null, null, null, null));
    }

    @Test
    void cortaTextosLongos() {
        service.registrar("DELETE", "/qualquer/" + "x".repeat(300), null, null, null, null);
        RegistroAtividade r = gravado();
        assertEquals(300, r.getDescricao().length());
        assertEquals(200, r.getCaminho().length());
    }

    @Test
    void buscaComFiltrosEPaginas() {
        when(registroRepository.contar("Alunos", "", "alterou", "carla",
                LocalDateTime.of(2026, 10, 1, 0, 0), LocalDateTime.of(2026, 10, 28, 0, 0))).thenReturn(45L);
        when(registroRepository.buscar(eq("Alunos"), eq(""), eq("alterou"), eq("carla"), any(), any(), eq(20), eq(20)))
                .thenReturn(List.of(new RegistroAtividade()));

        PaginaAtividades pagina = service.buscar(" Alunos ", " ", "alterou", " carla ",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 27), 2, 20);

        assertEquals(45, pagina.total());
        assertEquals(2, pagina.pagina());
        assertEquals(3, pagina.totalPaginas());
        assertEquals(1, pagina.itens().size());
    }

    @Test
    void buscaVaziaNaoConsultaAsLinhasELimitaOTamanho() {
        when(registroRepository.contar("", "", "", "", AtividadeService.INICIO_DOS_TEMPOS, AtividadeService.FIM_DOS_TEMPOS))
                .thenReturn(0L);

        PaginaAtividades pagina = service.buscar(null, null, null, null, null, null, 0, 500);

        assertEquals(0, pagina.total());
        assertEquals(1, pagina.pagina());
        assertEquals(AtividadeService.TAMANHO_MAXIMO_PAGINA, pagina.tamanho());
        assertEquals(1, pagina.totalPaginas());
        verify(registroRepository, never()).buscar(any(), any(), any(), any(), any(), any(), anyInt(), anyInt());
    }

    private static RegistroAtividade registro(long id, String nome, String acao, String descricao) {
        RegistroAtividade r = new RegistroAtividade();
        r.setIdRegistro(id);
        r.setUsuarioNome(nome);
        r.setAcao(acao);
        r.setDescricao(descricao);
        r.setQuando(AGORA.plusMinutes(id));
        return r;
    }

    @Test
    void ultimaAlteracaoMostraQuemCadastrouEQuemAlterou() {
        RegistroAtividade criou = registro(1, "Ana", "cadastrou", "Cadastrou aluno #12");
        RegistroAtividade alterou = registro(5, "Carla", "alterou", "Alterou aluno #12");
        when(registroRepository.findFirstByAlvoAndRegistroIdAndAcaoOrderByQuandoAscIdRegistroAsc("alunos", 12, "cadastrou"))
                .thenReturn(Optional.of(criou));
        when(registroRepository.findFirstByAlvoAndRegistroIdOrderByQuandoDescIdRegistroDesc("alunos", 12))
                .thenReturn(Optional.of(alterou));

        UltimaAlteracao u = service.ultima("alunos", 12);

        assertEquals("Ana", u.criadoPor());
        assertEquals(AGORA.plusMinutes(1), u.criadoEm());
        assertEquals("Carla", u.alteradoPor());
        assertEquals(AGORA.plusMinutes(5), u.alteradoEm());
        assertEquals("Alterou aluno #12", u.ultimaAcao());
    }

    @Test
    void soCadastradoOuSemHistorico() {
        RegistroAtividade criou = registro(1, "Ana", "cadastrou", "Cadastrou curso #3");
        when(registroRepository.findFirstByAlvoAndRegistroIdAndAcaoOrderByQuandoAscIdRegistroAsc("cursos", 3, "cadastrou"))
                .thenReturn(Optional.of(criou));
        when(registroRepository.findFirstByAlvoAndRegistroIdOrderByQuandoDescIdRegistroDesc("cursos", 3))
                .thenReturn(Optional.of(criou));
        when(registroRepository.findFirstByAlvoAndRegistroIdAndAcaoOrderByQuandoAscIdRegistroAsc("cursos", 4, "cadastrou"))
                .thenReturn(Optional.empty());
        when(registroRepository.findFirstByAlvoAndRegistroIdOrderByQuandoDescIdRegistroDesc("cursos", 4))
                .thenReturn(Optional.empty());

        UltimaAlteracao so = service.ultima("cursos", 3);
        assertEquals("Ana", so.criadoPor());
        assertNull(so.alteradoPor());
        assertNull(so.alteradoEm());

        UltimaAlteracao nada = service.ultima("cursos", 4);
        assertNull(nada.criadoPor());
        assertNull(nada.ultimaAcao());

        assertNull(service.ultima(" ", 1).criadoPor());
        assertNull(service.ultima("cursos", null).criadoPor());
    }

    @Test
    void nomeNaRespostaSoQuandoTemTexto() {
        assertNull(AtividadeService.nomeNaResposta(null));
        assertNull(AtividadeService.nomeNaResposta(new Object()));
        Aluno semNome = new Aluno();
        assertNull(AtividadeService.nomeNaResposta(semNome));
    }
}
