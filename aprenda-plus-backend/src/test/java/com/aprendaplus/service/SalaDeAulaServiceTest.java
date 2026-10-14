package com.aprendaplus.service;

import com.aprendaplus.dto.AvisoDaTurma;
import com.aprendaplus.dto.CertificadoEmitido;
import com.aprendaplus.dto.MinhaTurmaEad;
import com.aprendaplus.dto.SalaDoAluno;
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
import java.util.List;
import java.util.Optional;

import static com.aprendaplus.service.ConteudoEadServiceTest.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalaDeAulaServiceTest {

    @Mock private MatriculaRepository matriculaRepository;
    @Mock private PlanoDeAulaRepository planoRepository;
    @Mock private AulaRepository aulaRepository;
    @Mock private AulaConcluidaRepository aulaConcluidaRepository;
    @Mock private CertificadoRepository certificadoRepository;
    @Mock private AlunoRepository alunoRepository;
    @Mock private ConteudoEadService conteudoEadService;

    @InjectMocks
    private SalaDeAulaService service;

    private final Aluno lucas = aluno(7, "Lucas Almeida");
    private final Turma turma = turma(5);
    private final PlanoDeAula plano = plano(9, turma, professor(3, "Carla Mendes"));

    private Matricula matriculaDoLucas(String status) {
        Matricula m = matricula(lucas, turma, status);
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.of(m));
        return m;
    }

    private static AulaConcluida concluida(Aluno aluno, Aula aula) {
        AulaConcluida c = new AulaConcluida();
        c.setAluno(aluno);
        c.setAula(aula);
        c.setConcluidaEm(LocalDateTime.now());
        return c;
    }

    private Certificado certificado(String codigo) {
        Certificado c = new Certificado();
        c.setAluno(lucas);
        c.setTurma(turma);
        c.setCodigo(codigo);
        c.setCargaHoraria(360);
        c.setEmitidoEm(LocalDateTime.of(2026, 10, 13, 21, 0));
        return c;
    }

    // ===== Minhas turmas =====

    @Test
    void listaAsTurmasDoAlunoComOProgresso() {
        Turma outra = turma(6);
        Matricula ativa = matricula(lucas, turma, "ativa");
        ativa.setIdMatricula(1);
        Matricula trancada = matricula(lucas, outra, "trancada");
        trancada.setIdMatricula(2);
        Matricula cancelada = matricula(lucas, turma(8), "cancelada");
        cancelada.setIdMatricula(3);
        Matricula semTurma = matricula(lucas, null, "ativa");
        when(matriculaRepository.findByAluno_IdAluno(7)).thenReturn(List.of(ativa, trancada, cancelada, semTurma));
        Aula a1 = aula(1, plano, 1);
        Aula a2 = aula(2, plano, 2);
        Aula rascunho = aula(3, plano, 3);
        rascunho.setPublicada(false);
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(plano));
        when(planoRepository.findFirstByTurma_IdTurma(6)).thenReturn(Optional.empty());
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(a1, a2, rascunho));
        when(aulaConcluidaRepository.findByAluno_IdAlunoAndAula_Plano_IdPlano(7, 9))
                .thenReturn(List.of(concluida(lucas, a1), concluida(lucas, rascunho), concluida(lucas, null)));
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.empty());
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 6)).thenReturn(Optional.of(certificado("X")));

        List<MinhaTurmaEad> lista = service.minhasTurmas(7);

        assertEquals(2, lista.size());
        MinhaTurmaEad primeira = lista.get(0); // matrícula mais nova primeiro
        assertEquals(6, primeira.idTurma());
        assertFalse(primeira.podeAcessar());
        assertEquals("trancada", primeira.statusMatricula());
        assertEquals(0, primeira.totalAulas());
        assertNull(primeira.professor());
        assertTrue(primeira.temCertificado());
        MinhaTurmaEad segunda = lista.get(1);
        assertTrue(segunda.podeAcessar());
        assertEquals(2, segunda.totalAulas());
        assertEquals(1, segunda.concluidas());
        assertEquals(50, segunda.percentual());
        assertEquals("Carla Mendes", segunda.professor());
        assertEquals("Administração", segunda.curso());
        assertFalse(segunda.temCertificado());
    }

    @Test
    void turmaSemCursoNaLista() {
        Turma semCurso = turma(6);
        semCurso.setCurso(null);
        when(matriculaRepository.findByAluno_IdAluno(7)).thenReturn(List.of(matricula(lucas, semCurso, "concluida")));

        MinhaTurmaEad turmaDaLista = service.minhasTurmas(7).get(0);
        assertNull(turmaDaLista.curso());
        assertTrue(turmaDaLista.podeAcessar());
    }

    // ===== Acesso =====

    @Test
    void soEntraQuemTemMatriculaAtiva() {
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(
                Optional.empty(),
                Optional.of(matricula(lucas, turma, "trancada")),
                Optional.of(matricula(lucas, turma, "cancelada")));

        assertEquals("Você não está matriculado nesta turma.",
                assertThrows(RegraDeNegocioException.class, () -> service.sala(7, 5)).getMessage());
        assertEquals("Sua matrícula nesta turma está trancada. Fale com a secretaria.",
                assertThrows(RegraDeNegocioException.class, () -> service.sala(7, 5)).getMessage());
        assertEquals("Sua matrícula nesta turma não está ativa.",
                assertThrows(RegraDeNegocioException.class, () -> service.sala(7, 5)).getMessage());
    }

    // ===== Sala =====

    @Test
    void salaMostraAsAulasEEscondeOConteudoDasAindaNaoLiberadas() {
        matriculaDoLucas("ativa");
        Aula liberada = aula(1, plano, 1);
        Aula futura = aula(2, plano, 2);
        futura.setDataAula(LocalDate.now().plusDays(7));
        futura.setMaterialUrl("https://drive.google.com/x");
        Aula rascunho = aula(3, plano, 3);
        rascunho.setPublicada(false);
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(plano));
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(liberada, futura, rascunho));
        when(aulaConcluidaRepository.findByAluno_IdAlunoAndAula_Plano_IdPlano(7, 9)).thenReturn(List.of(concluida(lucas, liberada)));
        List<AvisoDaTurma> avisos = List.of(new AvisoDaTurma(1, "Bem-vindos", "Oi", "Ana", true, null));
        when(conteudoEadService.avisosDaTurma(5)).thenReturn(avisos);
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.empty());

        SalaDoAluno sala = service.sala(7, 5);

        assertEquals(2, sala.totalAulas());
        assertEquals(1, sala.concluidas());
        assertEquals(50, sala.percentual());
        assertEquals("Carla Mendes", sala.professor());
        assertEquals(360, sala.cargaHoraria()); // a turma não tem carga própria: vale a do curso
        assertTrue(sala.aulas().get(0).concluida());
        assertNotNull(sala.aulas().get(0).videoUrl());
        assertFalse(sala.aulas().get(1).liberada());
        assertNull(sala.aulas().get(1).videoUrl());
        assertNull(sala.aulas().get(1).materialUrl());
        assertNull(sala.aulas().get(1).conteudo());
        assertEquals("Aula 2", sala.aulas().get(1).titulo());
        assertSame(avisos, sala.avisos());
        assertNull(sala.certificado());
    }

    @Test
    void salaAindaSemAulasEComCertificadoJaEmitido() {
        matriculaDoLucas("concluida");
        turma.setCargaHoraria(40);
        turma.setCurso(null);
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.empty());
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.of(certificado("ABCD-EFGH-JKLM")));

        SalaDoAluno sala = service.sala(7, 5);

        assertEquals(0, sala.totalAulas());
        assertEquals(0, sala.percentual());
        assertNull(sala.professor());
        assertNull(sala.curso());
        assertEquals(40, sala.cargaHoraria());
        assertEquals("ABCD-EFGH-JKLM", sala.certificado().codigo());
        assertNull(sala.certificado().curso());
        assertNull(sala.certificado().professor());
    }

    // ===== Marcar aula =====

    private Aula prepararAula(Aula aula) {
        when(aulaRepository.findById(aula.getIdAula())).thenReturn(Optional.of(aula));
        return aula;
    }

    @Test
    void concluirAulaGravaUmaVez() {
        matriculaDoLucas("ativa");
        Aula a1 = prepararAula(aula(1, plano, 1));
        when(aulaConcluidaRepository.findFirstByAluno_IdAlunoAndAula_IdAula(7, 1))
                .thenReturn(Optional.empty(), Optional.of(concluida(lucas, a1)));
        when(alunoRepository.findById(7)).thenReturn(Optional.of(lucas));

        service.marcarAula(7, 1, true);
        service.marcarAula(7, 1, true); // de novo: já estava concluída

        ArgumentCaptor<AulaConcluida> salva = ArgumentCaptor.forClass(AulaConcluida.class);
        verify(aulaConcluidaRepository).save(salva.capture());
        assertSame(lucas, salva.getValue().getAluno());
        assertSame(a1, salva.getValue().getAula());
        assertNotNull(salva.getValue().getConcluidaEm());
    }

    @Test
    void desmarcarAulaApagaAConclusao() {
        matriculaDoLucas("ativa");
        Aula a1 = prepararAula(aula(1, plano, 1));
        AulaConcluida feita = concluida(lucas, a1);
        when(aulaConcluidaRepository.findFirstByAluno_IdAlunoAndAula_IdAula(7, 1))
                .thenReturn(Optional.of(feita), Optional.empty());

        service.marcarAula(7, 1, false);
        service.marcarAula(7, 1, false); // nada para apagar

        verify(aulaConcluidaRepository, times(1)).delete(feita);
        verify(aulaConcluidaRepository, never()).save(any());
    }

    @Test
    void naoConcluiAulaAindaNaoLiberadaRascunhoOuInexistente() {
        matriculaDoLucas("ativa");
        Aula futura = aula(1, plano, 1);
        futura.setDataAula(LocalDate.now().plusDays(3));
        prepararAula(futura);
        Aula rascunho = aula(2, plano, 2);
        rascunho.setPublicada(false);
        prepararAula(rascunho);
        when(aulaRepository.findById(3)).thenReturn(Optional.empty());
        when(aulaConcluidaRepository.findFirstByAluno_IdAlunoAndAula_IdAula(7, 1)).thenReturn(Optional.empty());

        assertEquals("Esta aula ainda não foi liberada.",
                assertThrows(RegraDeNegocioException.class, () -> service.marcarAula(7, 1, true)).getMessage());
        assertEquals("Aula não encontrada.",
                assertThrows(RegraDeNegocioException.class, () -> service.marcarAula(7, 2, true)).getMessage());
        assertEquals("Aula não encontrada.",
                assertThrows(RegraDeNegocioException.class, () -> service.marcarAula(7, 3, true)).getMessage());
        verify(aulaConcluidaRepository, never()).save(any());
    }

    @Test
    void alunoDeOutraTurmaNaoMarcaAula() {
        prepararAula(aula(1, plano, 1));
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(8, 5)).thenReturn(Optional.empty());

        assertThrows(RegraDeNegocioException.class, () -> service.marcarAula(8, 1, true));
        verifyNoInteractions(aulaConcluidaRepository);
    }

    @Test
    void alunoQueSumiuDoBancoNaoMarcaAula() {
        matriculaDoLucas("ativa");
        prepararAula(aula(1, plano, 1));
        when(aulaConcluidaRepository.findFirstByAluno_IdAlunoAndAula_IdAula(7, 1)).thenReturn(Optional.empty());
        when(alunoRepository.findById(7)).thenReturn(Optional.empty());

        assertEquals("Aluno não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> service.marcarAula(7, 1, true)).getMessage());
    }

    // ===== Certificado =====

    @Test
    void emiteOCertificadoQuandoTodasAsAulasForamConcluidas() {
        matriculaDoLucas("ativa");
        Aula a1 = aula(1, plano, 1);
        Aula a2 = aula(2, plano, 2);
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(plano));
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.empty());
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(a1, a2));
        when(aulaConcluidaRepository.findByAluno_IdAlunoAndAula_Plano_IdPlano(7, 9))
                .thenReturn(List.of(concluida(lucas, a1), concluida(lucas, a2)));
        when(certificadoRepository.existsByCodigo(anyString())).thenReturn(false);
        when(certificadoRepository.save(any(Certificado.class))).thenAnswer(i -> i.getArgument(0));

        CertificadoEmitido certificado = service.emitirCertificado(7, 5);

        assertTrue(certificado.codigo().matches("[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}"));
        assertEquals("Lucas Almeida", certificado.aluno());
        assertEquals("Administração", certificado.curso());
        assertEquals("Turma ADM-5", certificado.turma());
        assertEquals(360, certificado.cargaHoraria());
        assertEquals("Carla Mendes", certificado.professor());
        assertNotNull(certificado.emitidoEm());
    }

    @Test
    void certificadoJaEmitidoEhDevolvidoSemCriarOutro() {
        matriculaDoLucas("ativa");
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(plano));
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.of(certificado("ABCD-EFGH-JKLM")));

        assertEquals("ABCD-EFGH-JKLM", service.emitirCertificado(7, 5).codigo());
        verify(certificadoRepository, never()).save(any());
    }

    @Test
    void naoEmiteComAulasPendentesOuSemAulas() {
        matriculaDoLucas("ativa");
        Aula a1 = aula(1, plano, 1);
        Aula a2 = aula(2, plano, 2);
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(plano), Optional.empty());
        when(certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 5)).thenReturn(Optional.empty());
        when(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(9)).thenReturn(List.of(a1, a2));
        when(aulaConcluidaRepository.findByAluno_IdAlunoAndAula_Plano_IdPlano(7, 9)).thenReturn(List.of(concluida(lucas, a1)));

        assertEquals("Conclua todas as aulas para emitir o certificado (1 de 2 concluídas).",
                assertThrows(RegraDeNegocioException.class, () -> service.emitirCertificado(7, 5)).getMessage());
        assertEquals("Conclua todas as aulas para emitir o certificado (0 de 0 concluídas).",
                assertThrows(RegraDeNegocioException.class, () -> service.emitirCertificado(7, 5)).getMessage());
        verify(certificadoRepository, never()).save(any());
    }

    @Test
    void codigoDoCertificadoNaoSeRepete() {
        when(certificadoRepository.existsByCodigo(anyString())).thenReturn(true, true, false);
        assertNotNull(service.novoCodigo());
        verify(certificadoRepository, times(3)).existsByCodigo(anyString());
    }

    @Test
    void desisteDeGerarCodigoDepoisDeDezTentativas() {
        when(certificadoRepository.existsByCodigo(anyString())).thenReturn(true);
        assertEquals("Não foi possível gerar o código do certificado. Tente novamente.",
                assertThrows(RegraDeNegocioException.class, () -> service.novoCodigo()).getMessage());
    }

    // ===== Validação pública =====

    @Test
    void validaPeloCodigoSemLigarParaMaiusculasEEspacos() {
        when(certificadoRepository.findFirstByCodigo("ABCD-EFGH-JKLM")).thenReturn(Optional.of(certificado("ABCD-EFGH-JKLM")));
        when(planoRepository.findFirstByTurma_IdTurma(5)).thenReturn(Optional.of(plano));

        CertificadoEmitido certificado = service.validar("  abcd-efgh-jklm ");

        assertEquals("Lucas Almeida", certificado.aluno());
        assertEquals("Carla Mendes", certificado.professor());
    }

    @Test
    void codigoInexistenteOuCertificadoSemTurma() {
        when(certificadoRepository.findFirstByCodigo("")).thenReturn(Optional.empty());
        assertEquals("Certificado não encontrado. Confira o código.",
                assertThrows(RegraDeNegocioException.class, () -> service.validar(null)).getMessage());

        Certificado semTurma = certificado("ZZZZ-ZZZZ-ZZZZ");
        semTurma.setTurma(null);
        semTurma.setAluno(null);
        when(certificadoRepository.findFirstByCodigo("ZZZZ-ZZZZ-ZZZZ")).thenReturn(Optional.of(semTurma));
        CertificadoEmitido certificado = service.validar("ZZZZ-ZZZZ-ZZZZ");
        assertNull(certificado.turma());
        assertNull(certificado.aluno());
        assertNull(certificado.curso());
    }
}
