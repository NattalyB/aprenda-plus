package com.aprendaplus.service;

import com.aprendaplus.dto.AndamentoAluno;
import com.aprendaplus.dto.AulaDaSala;
import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.AvisoForm;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.entity.*;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConteudoEadServiceTest {

    @Mock private PlanoDeAulaRepository planoRepository;
    @Mock private AulaRepository aulaRepository;
    @Mock private AvisoTurmaRepository avisoRepository;
    @Mock private TurmaRepository turmaRepository;
    @Mock private ProfessorRepository professorRepository;
    @Mock private DisciplinaRepository disciplinaRepository;
    @Mock private TurmaProfessorRepository turmaProfessorRepository;
    @Mock private FuncionarioRepository funcionarioRepository;
    @Mock private MatriculaRepository matriculaRepository;
    @Mock private AulaConcluidaRepository aulaConcluidaRepository;
    @Mock private CertificadoRepository certificadoRepository;
    @Mock private EmailService emailService;

    @InjectMocks
    private ConteudoEadService service;

    // ===== Dados de exemplo =====

    static Curso curso(int id) {
        Curso c = new Curso();
        c.setIdCurso(id);
        c.setNome("Administração");
        c.setCargaHoraria(360);
        return c;
    }

    static Turma turma(int id) {
        Turma t = new Turma();
        t.setIdTurma(id);
        t.setNome("Turma ADM-" + id);
        t.setCurso(curso(1));
        return t;
    }

    static Professor professor(int id, String nome) {
        Professor p = new Professor();
        p.setIdProfessor(id);
        p.setNomeCompleto(nome);
        p.setStatus("ativo");
        return p;
    }

    static PlanoDeAula plano(int id, Turma turma, Professor professor) {
        PlanoDeAula p = new PlanoDeAula();
        p.setIdPlano(id);
        p.setTurma(turma);
        p.setProfessorResponsavel(professor);
        return p;
    }

    static Aula aula(int id, PlanoDeAula plano, int numero) {
        Aula a = new Aula();
        a.setIdAula(id);
        a.setPlano(plano);
        a.setNumeroAula(numero);
        a.setTopico("Aula " + numero);
        a.setTipoAula("video");
        a.setVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        a.setConteudoDetalhado("Conteúdo " + numero);
        return a;
    }

    static Disciplina disciplina(int id, Curso... cursos) {
        Disciplina d = new Disciplina();
        d.setIdDisciplina(id);
        d.setNome("Marketing");
        d.setCursos(new ArrayList<>(List.of(cursos)));
        return d;
    }

    static Aluno aluno(int id, String nome) {
        Aluno a = new Aluno();
        a.setIdAluno(id);
        a.setNomeCompleto(nome);
        a.setEmail(nome.split(" ")[0].toLowerCase() + "@aluno.com");
        return a;
    }

    static Matricula matricula(Aluno aluno, Turma turma, String status) {
        Matricula m = new Matricula();
        m.setAluno(aluno);
        m.setTurma(turma);
        m.setStatus(status);
        return m;
    }

    static AulaForm form(String titulo) {
        return new AulaForm(titulo, null, null, null, null, null, null, null, null);
    }

    private void saveDevolveOProprio() {
        when(aulaRepository.save(any(Aula.class))).thenAnswer(i -> i.getArgument(0));
    }

    // ===== Consulta =====

    @Test
    void salaAindaNaoCriadaSugereOProfessorPrincipalDaTurma() {
        Turma t = turma(5);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        TurmaProfessor auxiliar = new TurmaProfessor();
        auxiliar.setPapel("auxiliar");
        auxiliar.setProfessor(professor(2, "Bruno"));
        TurmaProfessor principal = new TurmaProfessor();
        principal.setPapel("principal");
        principal.setProfessor(professor(3, "Carla"));
        when(turmaProfessorRepository.findByTurma_IdTurma(5)).thenReturn(List.of(auxiliar, principal));

        PlanoDaTurma resultado = service.planoDaTurma(5);

        assertNull(resultado.idPlano());
        assertEquals(3, resultado.idProfessor());
        assertEquals("Carla", resultado.professor());
        assertEquals("Administração", resultado.curso());
        assertTrue(resultado.aulas().isEmpty());
    }

    @Test
    void semPrincipalUsaOPrimeiroProfessorESemNenhumFicaVazio() {
        Turma t = turma(5);
        t.setCurso(null);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        TurmaProfessor auxiliar = new TurmaProfessor();
        auxiliar.setPapel("auxiliar");
        auxiliar.setProfessor(professor(2, "Bruno"));
        when(turmaProfessorRepository.findByTurma_IdTurma(5)).thenReturn(List.of(auxiliar), List.of());

        assertEquals("Bruno", service.planoDaTurma(5).professor());
        PlanoDaTurma vazio = service.planoDaTurma(5);
        assertNull(vazio.idProfessor());
        assertNull(vazio.professor());
        assertNull(vazio.curso());
        assertNull(vazio.idCurso());
    }

    @Test
    void painelVeTodasAsAulasCompletasEOsAvisos() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        Aula futura = aula(1, p, 1);
        futura.setDataAula(LocalDate.now().plusDays(10));
        futura.setDisciplina(disciplina(4, t.getCurso()));
        Aula rascunho = aula(2, p, 2);
        rascunho.setPublicada(false);
        rascunho.setTipoAula(null);
        AvisoTurma aviso = new AvisoTurma();
        aviso.setIdAviso(1);
        aviso.setTitulo("Bem-vindos");
        aviso.setMensagem("Começamos segunda");
        aviso.setFixado(null);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(futura, rascunho));
        when(avisoRepository.findByTurma_IdTurmaOrderByFixadoDescCriadoEmDesc(5)).thenReturn(List.of(aviso));

        PlanoDaTurma resultado = service.planoDaTurma(5);

        assertEquals(9, resultado.idPlano());
        AulaDaSala primeira = resultado.aulas().get(0);
        assertFalse(primeira.liberada());
        assertNotNull(primeira.videoUrl()); // o painel vê tudo, mesmo antes da liberação
        assertEquals("Marketing", primeira.disciplina());
        assertEquals(4, primeira.idDisciplina());
        AulaDaSala segunda = resultado.aulas().get(1);
        assertFalse(segunda.publicada());
        assertEquals("video", segunda.tipo());
        assertTrue(segunda.liberada());
        assertEquals("Bem-vindos", resultado.avisos().get(0).titulo());
        assertFalse(resultado.avisos().get(0).fixado());
    }

    @Test
    void turmaInexistente() {
        when(turmaRepository.findById(99)).thenReturn(Optional.empty());
        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> service.planoDaTurma(99));
        assertEquals("Turma não encontrada.", erro.getMessage());
    }

    @Test
    void quantidadeDeAulasPorTurma() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, null);
        PlanoDeAula semTurma = plano(10, null, null);
        when(planoRepository.findAll()).thenReturn(List.of(p, semTurma));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(aula(1, p, 1), aula(2, p, 2)));

        assertEquals(Map.of(5, 2), service.quantidadeDeAulasPorTurma());
    }

    // ===== Professor responsável =====

    @Test
    void definirProfessorCriaASalaDaTurma() {
        Turma t = turma(5);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(professorRepository.findById(3)).thenReturn(Optional.of(professor(3, "Carla")));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.empty());
        when(planoRepository.save(any(PlanoDeAula.class))).thenAnswer(i -> {
            PlanoDeAula salvo = i.getArgument(0);
            salvo.setIdPlano(9);
            return salvo;
        });

        PlanoDaTurma resultado = service.definirProfessor(5, 3);

        assertEquals(9, resultado.idPlano());
        assertEquals("Carla", resultado.professor());
        ArgumentCaptor<PlanoDeAula> salvo = ArgumentCaptor.forClass(PlanoDeAula.class);
        verify(planoRepository).save(salvo.capture());
        assertSame(t, salvo.getValue().getTurma());
    }

    @Test
    void definirProfessorTrocaOResponsavelDaSalaExistente() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(2, "Bruno"));
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(professorRepository.findById(3)).thenReturn(Optional.of(professor(3, "Carla")));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        when(planoRepository.save(p)).thenReturn(p);

        assertEquals("Carla", service.definirProfessor(5, 3).professor());
        assertEquals(3, p.getProfessorResponsavel().getIdProfessor());
    }

    @Test
    void definirProfessorRecusaVazioInexistenteOuInativo() {
        when(turmaRepository.findById(5)).thenReturn(Optional.of(turma(5)));
        Professor inativo = professor(4, "Dora");
        inativo.setStatus("inativo");
        when(professorRepository.findById(3)).thenReturn(Optional.empty());
        when(professorRepository.findById(4)).thenReturn(Optional.of(inativo));

        assertEquals("Escolha o professor responsável pela sala de aula.",
                assertThrows(RegraDeNegocioException.class, () -> service.definirProfessor(5, null)).getMessage());
        assertEquals("Professor não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> service.definirProfessor(5, 3)).getMessage());
        assertEquals("Esse professor não está ativo. Escolha outro.",
                assertThrows(RegraDeNegocioException.class, () -> service.definirProfessor(5, 4)).getMessage());
        verify(planoRepository, never()).save(any());
    }

    // ===== Aulas =====

    @Test
    void novaAulaSemSalaCriadaPedeOProfessorAntes() {
        when(turmaRepository.findById(5)).thenReturn(Optional.of(turma(5)));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> service.adicionarAula(5, form("Introdução")));
        assertEquals("Escolha o professor responsável antes de cadastrar as aulas.", erro.getMessage());
        verify(aulaRepository, never()).save(any());
    }

    @Test
    void novaAulaEntraNoFimComOVideoNormalizado() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(aula(1, p, 1), aula(2, p, 4)));
        when(disciplinaRepository.findById(4)).thenReturn(Optional.of(disciplina(4, curso(2), curso(1))));
        saveDevolveOProprio();

        LocalDate data = LocalDate.of(2026, 11, 3);
        service.adicionarAula(5, new AulaForm("  Marketing digital  ", 4, "LEITURA", data,
                "https://youtu.be/dQw4w9WgXcQ?t=42", " https://drive.google.com/arquivo ", "  Leia o capítulo 2 ", 45, null));

        ArgumentCaptor<Aula> salva = ArgumentCaptor.forClass(Aula.class);
        verify(aulaRepository).save(salva.capture());
        Aula nova = salva.getValue();
        assertEquals(5, nova.getNumeroAula());
        assertEquals("Marketing digital", nova.getTopico());
        assertEquals("leitura", nova.getTipoAula());
        assertEquals("https://www.youtube.com/watch?v=dQw4w9WgXcQ", nova.getVideoUrl());
        assertEquals("https://drive.google.com/arquivo", nova.getMaterialUrl());
        assertEquals("Leia o capítulo 2", nova.getConteudoDetalhado());
        assertEquals(45, nova.getDuracaoMinutos());
        assertEquals(data, nova.getDataAula());
        assertEquals(4, nova.getDisciplina().getIdDisciplina());
        assertTrue(nova.getPublicada());
        assertSame(p, nova.getPlano());
    }

    @Test
    void primeiraAulaRecebeONumeroUmEPodeFicarComoRascunho() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        saveDevolveOProprio();

        service.adicionarAula(5, new AulaForm("Abertura", null, " ", null, " ", "", null, null, false));

        ArgumentCaptor<Aula> salva = ArgumentCaptor.forClass(Aula.class);
        verify(aulaRepository).save(salva.capture());
        assertEquals(1, salva.getValue().getNumeroAula());
        assertEquals("video", salva.getValue().getTipoAula());
        assertNull(salva.getValue().getVideoUrl());
        assertNull(salva.getValue().getMaterialUrl());
        assertFalse(salva.getValue().getPublicada());
    }

    @Test
    void validaOsDadosDaAula() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        when(disciplinaRepository.findById(7)).thenReturn(Optional.empty());
        when(disciplinaRepository.findById(8)).thenReturn(Optional.of(disciplina(8, curso(2))));

        Map<AulaForm, String> casos = new java.util.LinkedHashMap<>();
        casos.put(form("  "), "Informe o título da aula.");
        casos.put(form("x".repeat(201)), "O título pode ter no máximo 200 caracteres.");
        casos.put(new AulaForm("Aula", null, "podcast", null, null, null, null, null, null), "Tipo de aula inválido.");
        casos.put(new AulaForm("Aula", null, null, null, "https://vimeo.com/123", null, null, null, null),
                "Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...).");
        casos.put(new AulaForm("Aula", null, null, null, null, "drive.google.com/x", null, null, null),
                "O link do material precisa começar com https:// (ex.: Google Drive).");
        casos.put(new AulaForm("Aula", null, null, null, null, "https://x.com/" + "a".repeat(300), null, null, null),
                "O link do material precisa começar com https:// (ex.: Google Drive).");
        casos.put(new AulaForm("Aula", null, null, null, null, null, "x".repeat(20001), null, null),
                "O conteúdo pode ter no máximo 20.000 caracteres.");
        casos.put(new AulaForm("Aula", null, null, null, null, null, null, 0, null), "A duração deve ficar entre 1 e 600 minutos.");
        casos.put(new AulaForm("Aula", null, null, null, null, null, null, 601, null), "A duração deve ficar entre 1 e 600 minutos.");
        casos.put(new AulaForm("Aula", 7, null, null, null, null, null, null, null), "Disciplina não encontrada.");
        casos.put(new AulaForm("Aula", 8, null, null, null, null, null, null, null), "Essa disciplina não faz parte do curso da turma.");

        casos.forEach((dados, mensagem) -> assertEquals(mensagem,
                assertThrows(RegraDeNegocioException.class, () -> service.adicionarAula(5, dados)).getMessage()));
        assertEquals("Informe os dados da aula.",
                assertThrows(RegraDeNegocioException.class, () -> service.adicionarAula(5, null)).getMessage());
        verify(aulaRepository, never()).save(any());
    }

    @Test
    void disciplinaVaiSemConferirQuandoATurmaNaoTemCurso() {
        Turma t = turma(5);
        t.setCurso(null);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        Disciplina semCursos = disciplina(8);
        semCursos.setCursos(null);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        when(disciplinaRepository.findById(8)).thenReturn(Optional.of(semCursos));
        saveDevolveOProprio();

        service.adicionarAula(5, new AulaForm("Aula", 8, null, null, null, null, null, null, true));

        verify(aulaRepository).save(argThatTopico("Aula"));
    }

    private static Aula argThatTopico(String topico) {
        return org.mockito.ArgumentMatchers.argThat(a -> topico.equals(a.getTopico()));
    }

    @Test
    void reconheceOsFormatosDeLinkDoYoutube() {
        String id = "dQw4w9WgXcQ";
        assertEquals(id, ConteudoEadService.idDoYoutube("https://www.youtube.com/watch?v=" + id));
        assertEquals(id, ConteudoEadService.idDoYoutube("https://www.youtube.com/watch?feature=share&v=" + id + "&t=10s"));
        assertEquals(id, ConteudoEadService.idDoYoutube("youtube.com/embed/" + id));
        assertEquals(id, ConteudoEadService.idDoYoutube("https://m.youtube.com/shorts/" + id));
        assertEquals(id, ConteudoEadService.idDoYoutube("https://youtu.be/" + id));
        assertEquals(id, ConteudoEadService.idDoYoutube(" https://www.youtube.com/live/" + id + "?si=abc "));
        assertNull(ConteudoEadService.idDoYoutube("https://vimeo.com/1234"));
        assertNull(ConteudoEadService.idDoYoutube("https://www.youtube.com/watch?v=curto"));
        assertNull(ConteudoEadService.idDoYoutube(null));
    }

    @Test
    void editarAulaAtualizaOsCampos() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        Aula existente = aula(1, p, 1);
        when(aulaRepository.findById(1)).thenReturn(Optional.of(existente));
        saveDevolveOProprio();

        service.atualizarAula(1, new AulaForm("Novo título", null, "ao_vivo", null, null, null, null, null, true));

        assertEquals("Novo título", existente.getTopico());
        assertEquals("ao_vivo", existente.getTipoAula());
        assertNull(existente.getVideoUrl());
        assertEquals(1, existente.getNumeroAula());
    }

    @Test
    void aulaInexistente() {
        when(aulaRepository.findById(1)).thenReturn(Optional.empty());
        assertEquals("Aula não encontrada.",
                assertThrows(RegraDeNegocioException.class, () -> service.excluirAula(1)).getMessage());
    }

    @Test
    void excluirAulaRenumeraAsQueSobram() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        Aula a1 = aula(10, p, 1);
        Aula a2 = aula(11, p, 2);
        Aula a3 = aula(12, p, 3);
        when(aulaRepository.findById(11)).thenReturn(Optional.of(a2));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(a1, a2, a3), List.of(a1, a3));

        PlanoDaTurma resultado = service.excluirAula(11);

        verify(aulaRepository).delete(a2);
        verify(aulaRepository).save(a3);
        verify(aulaRepository, never()).save(a1);
        assertEquals(2, a3.getNumeroAula());
        assertEquals(2, resultado.aulas().size());
    }

    @Test
    void moverAulaTrocaDeLugarComAVizinha() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        Aula a1 = aula(10, p, 1);
        Aula a2 = aula(11, p, 2);
        when(aulaRepository.findById(11)).thenReturn(Optional.of(a2));
        when(aulaRepository.findById(10)).thenReturn(Optional.of(a1));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(a1, a2));

        service.moverAula(11, "cima");
        assertEquals(1, a2.getNumeroAula());
        assertEquals(2, a1.getNumeroAula());

        // na lista do banco (simulada) a2 continua por último: descer não muda nada
        service.moverAula(11, "baixo");
        // a primeira da lista não sobe mais
        service.moverAula(10, "cima");
        assertEquals(1, a2.getNumeroAula());
        assertEquals(2, a1.getNumeroAula());

        assertEquals("Use \"cima\" ou \"baixo\" para mover a aula.",
                assertThrows(RegraDeNegocioException.class, () -> service.moverAula(10, "lado")).getMessage());
    }

    // ===== Copiar aulas =====

    @Test
    void copiarDaMesmaTurmaOuDeTurmaSemAulas() {
        assertEquals("Escolha outra turma para copiar as aulas.",
                assertThrows(RegraDeNegocioException.class, () -> service.copiarAulas(5, 5)).getMessage());
        assertEquals("Escolha outra turma para copiar as aulas.",
                assertThrows(RegraDeNegocioException.class, () -> service.copiarAulas(5, null)).getMessage());

        when(turmaRepository.findById(5)).thenReturn(Optional.of(turma(5)));
        when(planoRepository.findFirstByTurma_IdTurma(2)).thenReturn(Optional.empty());
        assertEquals("A turma escolhida não tem aulas para copiar.",
                assertThrows(RegraDeNegocioException.class, () -> service.copiarAulas(5, 2)).getMessage());
    }

    @Test
    void copiaAsAulasSemAsDatasECriaASalaComOProfessorDaOrigem() {
        Turma destino = turma(5);
        Turma origemTurma = turma(2);
        Professor carla = professor(3, "Carla");
        PlanoDeAula origem = plano(8, origemTurma, carla);
        Aula a1 = aula(1, origem, 1);
        a1.setDataAula(LocalDate.of(2026, 3, 1));
        a1.setDisciplina(disciplina(4, curso(1)));
        a1.setMaterialUrl("https://drive.google.com/x");
        a1.setDuracaoMinutos(30);
        a1.setPublicada(false);
        Aula a2 = aula(2, origem, 2);
        a2.setDisciplina(disciplina(6, curso(2))); // de outro curso: não vai junto

        when(turmaRepository.findById(5)).thenReturn(Optional.of(destino));
        when(planoRepository.findFirstByTurma_IdTurma(2)).thenReturn(Optional.of(origem));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.empty());
        when(planoRepository.save(any(PlanoDeAula.class))).thenAnswer(i -> {
            PlanoDeAula novo = i.getArgument(0);
            novo.setIdPlano(9);
            return novo;
        });
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(8)).thenReturn(List.of(a1, a2));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of());
        saveDevolveOProprio();

        assertEquals(2, service.copiarAulas(5, 2));

        ArgumentCaptor<PlanoDeAula> plano = ArgumentCaptor.forClass(PlanoDeAula.class);
        verify(planoRepository).save(plano.capture());
        assertSame(carla, plano.getValue().getProfessorResponsavel());
        ArgumentCaptor<Aula> copias = ArgumentCaptor.forClass(Aula.class);
        verify(aulaRepository, times(2)).save(copias.capture());
        Aula primeira = copias.getAllValues().get(0);
        assertEquals(1, primeira.getNumeroAula());
        assertNull(primeira.getDataAula());
        assertEquals(4, primeira.getDisciplina().getIdDisciplina());
        assertEquals("https://drive.google.com/x", primeira.getMaterialUrl());
        assertEquals(30, primeira.getDuracaoMinutos());
        assertFalse(primeira.getPublicada());
        assertNotSame(a1, primeira);
        assertNull(copias.getAllValues().get(1).getDisciplina());
        assertEquals(2, copias.getAllValues().get(1).getNumeroAula());
    }

    @Test
    void copiaParaODepoisDasAulasQueJaExistem() {
        Turma destino = turma(5);
        PlanoDeAula origem = plano(8, turma(2), professor(3, "Carla"));
        PlanoDeAula atual = plano(9, destino, professor(4, "Dora"));
        when(turmaRepository.findById(5)).thenReturn(Optional.of(destino));
        when(planoRepository.findFirstByTurma_IdTurma(2)).thenReturn(Optional.of(origem));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(atual));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(8)).thenReturn(List.of(aula(1, origem, 1)));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(aula(5, atual, 1), aula(6, atual, 2)));
        saveDevolveOProprio();

        assertEquals(1, service.copiarAulas(5, 2));

        ArgumentCaptor<Aula> copia = ArgumentCaptor.forClass(Aula.class);
        verify(aulaRepository).save(copia.capture());
        assertEquals(3, copia.getValue().getNumeroAula());
        assertSame(atual, copia.getValue().getPlano());
        verify(planoRepository, never()).save(any());
    }

    // ===== Mural =====

    @Test
    void publicaAvisoComONomeDeQuemEscreveuEAvisaOsAlunosPorEmail() {
        Turma t = turma(5);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        Funcionario ana = new Funcionario();
        ana.setNomeCompleto("Ana Coordenação");
        when(funcionarioRepository.findById(1)).thenReturn(Optional.of(ana));
        when(matriculaRepository.findByTurma_IdTurma(5)).thenReturn(List.of(
                matricula(aluno(1, "Lucas Almeida"), t, "ativa"),
                matricula(aluno(2, "Maria Souza"), t, "concluida"),
                matricula(aluno(3, "Pedro Lima"), t, "trancada"),
                matricula(aluno(4, "Rita Dias"), t, "cancelada"),
                matricula(null, t, "ativa")));

        service.publicarAviso(5, new AvisoForm("  Prova dia 10  ", " Estudem os capítulos 1 a 3. ", true, true), 1);

        ArgumentCaptor<AvisoTurma> salvo = ArgumentCaptor.forClass(AvisoTurma.class);
        verify(avisoRepository).save(salvo.capture());
        assertEquals("Prova dia 10", salvo.getValue().getTitulo());
        assertEquals("Estudem os capítulos 1 a 3.", salvo.getValue().getMensagem());
        assertEquals("Ana Coordenação", salvo.getValue().getAutor());
        assertTrue(salvo.getValue().getFixado());
        assertNotNull(salvo.getValue().getCriadoEm());
        verify(emailService).novoAviso("lucas@aluno.com", "Lucas Almeida", "Turma ADM-5", "Prova dia 10", "Estudem os capítulos 1 a 3.");
        verify(emailService).novoAviso(eq("maria@aluno.com"), anyString(), anyString(), anyString(), anyString());
        verify(emailService, times(2)).novoAviso(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void avisoSemEmailEComAutorPadrao() {
        when(turmaRepository.findById(5)).thenReturn(Optional.of(turma(5)));
        when(funcionarioRepository.findById(1)).thenReturn(Optional.empty());

        service.publicarAviso(5, new AvisoForm("Aviso", "Texto", null, false), 1);
        service.publicarAviso(5, new AvisoForm("Aviso", "Texto", false, null), null);

        ArgumentCaptor<AvisoTurma> salvo = ArgumentCaptor.forClass(AvisoTurma.class);
        verify(avisoRepository, times(2)).save(salvo.capture());
        salvo.getAllValues().forEach(a -> {
            assertEquals("Equipe AprendaPlus", a.getAutor());
            assertFalse(a.getFixado());
        });
        verifyNoInteractions(emailService, matriculaRepository);
    }

    @Test
    void validaOAviso() {
        when(turmaRepository.findById(5)).thenReturn(Optional.of(turma(5)));

        assertEquals("Preencha o título e a mensagem do aviso.",
                assertThrows(RegraDeNegocioException.class, () -> service.publicarAviso(5, null, 1)).getMessage());
        assertEquals("Preencha o título e a mensagem do aviso.",
                assertThrows(RegraDeNegocioException.class,
                        () -> service.publicarAviso(5, new AvisoForm("Título", " ", false, false), 1)).getMessage());
        assertEquals("O título do aviso pode ter no máximo 120 caracteres.",
                assertThrows(RegraDeNegocioException.class,
                        () -> service.publicarAviso(5, new AvisoForm("x".repeat(121), "Texto", false, false), 1)).getMessage());
        assertEquals("A mensagem pode ter no máximo 4.000 caracteres.",
                assertThrows(RegraDeNegocioException.class,
                        () -> service.publicarAviso(5, new AvisoForm("Título", "x".repeat(4001), false, false), 1)).getMessage());
        verify(avisoRepository, never()).save(any());
    }

    @Test
    void excluirAviso() {
        Turma t = turma(5);
        AvisoTurma aviso = new AvisoTurma();
        aviso.setTurma(t);
        when(avisoRepository.findById(3)).thenReturn(Optional.of(aviso));
        when(avisoRepository.findById(4)).thenReturn(Optional.empty());

        assertEquals(5, service.excluirAviso(3).idTurma());
        verify(avisoRepository).delete(aviso);
        assertEquals("Aviso não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> service.excluirAviso(4)).getMessage());
    }

    // ===== Andamento =====

    @Test
    void andamentoMostraOProgressoDeCadaAluno() {
        Turma t = turma(5);
        PlanoDeAula p = plano(9, t, professor(3, "Carla"));
        Aula a1 = aula(1, p, 1);
        Aula a2 = aula(2, p, 2);
        Aula a3 = aula(3, p, 3);
        Aula rascunho = aula(4, p, 4);
        rascunho.setPublicada(false);
        Aluno lucas = aluno(1, "Lucas Almeida");
        Aluno ana = aluno(2, "ana Souza");
        Aluno rita = aluno(3, "Rita Dias");
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(p));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(a1, a2, a3, rascunho));
        LocalDateTime ontem = LocalDateTime.of(2026, 10, 12, 20, 0);
        LocalDateTime hoje = LocalDateTime.of(2026, 10, 13, 9, 30);
        when(aulaConcluidaRepository.findByAula_Plano_IdPlano(9)).thenReturn(List.of(
                concluida(lucas, a1, ontem), concluida(lucas, a2, hoje), concluida(lucas, a3, null),
                concluida(lucas, rascunho, hoje.plusDays(1)), concluida(ana, a1, ontem), concluida(null, a1, ontem)));
        Certificado certificado = new Certificado();
        certificado.setAluno(lucas);
        Certificado semAluno = new Certificado();
        when(certificadoRepository.findByTurma_IdTurma(5)).thenReturn(List.of(certificado, semAluno));
        when(matriculaRepository.findByTurma_IdTurma(5)).thenReturn(List.of(
                matricula(lucas, t, "ativa"), matricula(ana, t, "trancada"),
                matricula(rita, t, "cancelada"), matricula(null, t, "ativa")));

        List<AndamentoAluno> andamento = service.andamento(5);

        assertEquals(2, andamento.size());
        AndamentoAluno primeiro = andamento.get(0);
        assertEquals("ana Souza", primeiro.nome()); // ordem alfabética, sem ligar para maiúsculas
        assertEquals("trancada", primeiro.statusMatricula());
        assertEquals(1, primeiro.concluidas());
        assertEquals(33, primeiro.percentual());
        assertFalse(primeiro.certificado());
        AndamentoAluno segundo = andamento.get(1);
        assertEquals(3, segundo.concluidas());
        assertEquals(3, segundo.totalAulas());
        assertEquals(100, segundo.percentual());
        assertEquals(hoje, segundo.ultimaAtividade());
        assertTrue(segundo.certificado());
    }

    @Test
    void andamentoDeTurmaSemSalaDeAula() {
        Turma t = turma(5);
        when(turmaRepository.findById(5)).thenReturn(Optional.of(t));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.empty());
        Aluno semNome = aluno(1, "X");
        semNome.setNomeCompleto(null);
        when(matriculaRepository.findByTurma_IdTurma(5)).thenReturn(List.of(matricula(semNome, t, "ativa"), matricula(aluno(2, "Bia"), t, "ativa")));

        List<AndamentoAluno> andamento = service.andamento(5);

        assertEquals(0, andamento.get(0).totalAulas());
        assertEquals(0, andamento.get(0).percentual());
        assertNull(andamento.get(0).ultimaAtividade());
        assertNull(andamento.get(0).nome());
        verifyNoInteractions(aulaConcluidaRepository);
    }

    private static AulaConcluida concluida(Aluno aluno, Aula aula, LocalDateTime quando) {
        AulaConcluida c = new AulaConcluida();
        c.setAluno(aluno);
        c.setAula(aula);
        c.setConcluidaEm(quando);
        return c;
    }

    @Test
    void percentualArredondado() {
        assertEquals(0, ConteudoEadService.percentual(0, 0));
        assertEquals(67, ConteudoEadService.percentual(2, 3));
        assertEquals(100, ConteudoEadService.percentual(3, 3));
    }

    @Test
    void textoVazioViraNulo() {
        assertNull(ConteudoEadService.texto(null));
        assertNull(ConteudoEadService.texto("   "));
        assertEquals("a b", ConteudoEadService.texto(" a b "));
    }

    @Test
    void editarAvisoTrocaOTextoEOFixado() {
        Turma t = turma(5);
        AvisoTurma aviso = new AvisoTurma();
        aviso.setTurma(t);
        aviso.setTitulo("Antigo");
        aviso.setMensagem("Texto antigo");
        aviso.setAutor("Ana");
        aviso.setFixado(true);
        when(avisoRepository.findById(3)).thenReturn(Optional.of(aviso));

        service.editarAviso(3, new AvisoForm(" Prova adiada ", " Agora é dia 12. ", false, true));
        assertEquals("Prova adiada", aviso.getTitulo());
        assertEquals("Agora é dia 12.", aviso.getMensagem());
        assertFalse(aviso.getFixado());
        assertEquals("Ana", aviso.getAutor());

        // sem informar o fixado, mantém como estava; e editar nunca manda e-mail
        service.editarAviso(3, new AvisoForm("Prova", "Dia 12", null, true));
        assertFalse(aviso.getFixado());
        verify(avisoRepository, times(2)).save(aviso);
        verifyNoInteractions(emailService);
    }

    @Test
    void editarAvisoValidaETemQueExistir() {
        when(avisoRepository.findById(3)).thenReturn(Optional.of(new AvisoTurma()));
        when(avisoRepository.findById(4)).thenReturn(Optional.empty());

        assertEquals("Preencha o título e a mensagem do aviso.",
                assertThrows(RegraDeNegocioException.class, () -> service.editarAviso(3, new AvisoForm("", "x", null, null))).getMessage());
        assertEquals("Preencha o título e a mensagem do aviso.",
                assertThrows(RegraDeNegocioException.class, () -> service.editarAviso(3, null)).getMessage());
        assertEquals("Aviso não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> service.editarAviso(4, new AvisoForm("a", "b", null, null))).getMessage());
        verify(avisoRepository, never()).save(any());
    }
}
