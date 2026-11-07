package com.aprendaplus.service;

import com.aprendaplus.entity.Chamado;
import com.aprendaplus.entity.ChamadoMensagem;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.ChamadoMensagemRepository;
import com.aprendaplus.repository.ChamadoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.service.ChamadoService.Anexo;
import com.aprendaplus.service.ChamadoService.Atendimento;
import com.aprendaplus.service.ChamadoService.ChamadoDto;
import com.aprendaplus.service.ChamadoService.NovoChamado;
import com.aprendaplus.service.ChamadoService.Solicitante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChamadoServiceTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0};
    private static final byte[] PDF = "%PDF-1.4 x".getBytes();

    @Mock
    private ChamadoRepository chamadoRepository;

    @Mock
    private ChamadoMensagemRepository mensagemRepository;

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @Mock
    private ProfessorRepository professorRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private ChamadoService service;

    private final List<ChamadoMensagem> mensagensSalvas = new ArrayList<>();

    @BeforeEach
    void preparar() {
        Funcionario julia = new Funcionario();
        julia.setIdFuncionario(5);
        julia.setNomeCompleto("Julia Silva");
        julia.setEmail("julia@escola.com");
        Funcionario suporte = new Funcionario();
        suporte.setIdFuncionario(1);
        suporte.setNomeCompleto("Suporte/Sistema");
        Professor patricia = new Professor();
        patricia.setIdProfessor(8);
        patricia.setNomeCompleto("Patrícia Gomes");
        patricia.setEmail("patricia@escola.com");

        when(funcionarioRepository.findById(5)).thenReturn(Optional.of(julia));
        when(funcionarioRepository.findById(1)).thenReturn(Optional.of(suporte));
        when(funcionarioRepository.existsById(1)).thenReturn(true);
        when(professorRepository.findById(8)).thenReturn(Optional.of(patricia));
        when(chamadoRepository.save(any(Chamado.class))).thenAnswer(i -> {
            Chamado c = i.getArgument(0);
            if (c.getIdChamado() == null) c.setIdChamado(10);
            return c;
        });
        when(mensagemRepository.save(any(ChamadoMensagem.class))).thenAnswer(i -> {
            ChamadoMensagem m = i.getArgument(0);
            m.setIdMensagem(mensagensSalvas.size() + 1);
            mensagensSalvas.add(m);
            return m;
        });
        when(mensagemRepository.findByChamadoIdOrderByCriadoEmAscIdMensagemAsc(anyInt())).thenAnswer(i -> mensagensSalvas);
        when(emailService.linkDoSite(anyString())).thenAnswer(i -> "https://site/" + i.getArgument(0));
    }

    private static Chamado chamado(String status, Integer funcionarioId, Integer professorId) {
        Chamado c = new Chamado();
        c.setIdChamado(10);
        c.setAssunto("Erro ao salvar");
        c.setStatus(status);
        c.setPrioridade("media");
        c.setCategoria("erro");
        c.setTipoSolicitante(professorId != null ? "professor" : "funcionario");
        c.setFuncionarioId(funcionarioId);
        c.setProfessorId(professorId);
        c.setNomeSolicitante(professorId != null ? "Patrícia Gomes" : "Julia Silva");
        c.setEmailSolicitante(professorId != null ? "patricia@escola.com" : "julia@escola.com");
        c.setUltimaMensagemDe("solicitante");
        return c;
    }

    private void existe(Chamado c) {
        when(chamadoRepository.findById(c.getIdChamado())).thenReturn(Optional.of(c));
    }

    private static String erro(Runnable acao) {
        return assertThrows(RegraDeNegocioException.class, acao::run).getMessage();
    }

    // ===================== Abrir =====================

    @Test
    void funcionarioAbreChamadoComPrint() {
        ChamadoDto dto = service.abrir(Solicitante.funcionario(5),
                new NovoChamado("  Não consigo salvar a turma ", "erro", " ", "  Aparece erro 500 ao salvar.  ",
                        "Cadastro de turmas " + "x".repeat(300)),
                new Anexo("print:tela?.png", PNG));

        assertEquals(10, dto.idChamado());
        assertEquals("Não consigo salvar a turma", dto.assunto());
        assertEquals("aberto", dto.status());
        assertEquals("media", dto.prioridade());          // em branco: prioridade média
        assertEquals("erro", dto.categoria());
        assertEquals("funcionario", dto.tipoSolicitante());
        assertEquals("Julia Silva", dto.nomeSolicitante());
        assertEquals("julia@escola.com", dto.emailSolicitante());
        assertEquals("solicitante", dto.ultimaMensagemDe());
        assertEquals(200, dto.tela().length());
        assertNotNull(dto.criadoEm());

        ChamadoMensagem primeira = mensagensSalvas.get(0);
        assertEquals("Aparece erro 500 ao salvar.", primeira.getTexto());
        assertEquals("solicitante", primeira.getAutorTipo());
        assertEquals(5, primeira.getAutorId());
        assertEquals("image/png", primeira.getAnexoTipo());
        assertEquals("printtela.png", primeira.getAnexoNome());
        assertEquals(PNG.length, primeira.getAnexoTamanho());
        assertEquals(1, dto.mensagens().size());
        assertEquals("image/png", dto.mensagens().get(0).anexoTipo());
    }

    @Test
    void professorAbreChamadoSemAnexo() {
        ArgumentCaptor<Chamado> salvo = ArgumentCaptor.forClass(Chamado.class);
        ChamadoDto dto = service.abrir(Solicitante.professor(8),
                new NovoChamado("Vídeo não aparece", "duvida", "alta", "O vídeo da aula 3 não carrega.", null), null);

        verify(chamadoRepository).save(salvo.capture());
        assertEquals(8, salvo.getValue().getProfessorId());
        assertNull(salvo.getValue().getFuncionarioId());
        assertEquals("professor", dto.tipoSolicitante());
        assertEquals("alta", dto.prioridade());
        assertEquals("Patrícia Gomes", dto.nomeSolicitante());
        assertNull(mensagensSalvas.get(0).getAnexoTipo());
        assertNull(service.abrir(Solicitante.professor(8),
                new NovoChamado("A", null, null, "B", "  "), new Anexo("x", new byte[0])).tela());
    }

    @Test
    void validaOsDadosAntesDeGravar() {
        Solicitante julia = Solicitante.funcionario(5);
        assertEquals("Informe os dados do chamado.", erro(() -> service.abrir(julia, null, null)));
        assertEquals("Informe o assunto do chamado.",
                erro(() -> service.abrir(julia, new NovoChamado(" ", null, null, "x", null), null)));
        assertEquals("O assunto pode ter no máximo 150 caracteres.",
                erro(() -> service.abrir(julia, new NovoChamado("a".repeat(151), null, null, "x", null), null)));
        assertEquals("Descreva o problema.",
                erro(() -> service.abrir(julia, new NovoChamado("A", null, null, null, null), null)));
        assertEquals("A mensagem pode ter no máximo 5000 caracteres.",
                erro(() -> service.abrir(julia, new NovoChamado("A", null, null, "d".repeat(5001), null), null)));
        assertEquals("Categoria inválida.",
                erro(() -> service.abrir(julia, new NovoChamado("A", "bug", null, "x", null), null)));
        assertEquals("Prioridade inválida.",
                erro(() -> service.abrir(julia, new NovoChamado("A", null, "altissima", "x", null), null)));
        assertEquals("Anexe um print (PNG ou JPG) ou um PDF.",
                erro(() -> service.abrir(julia, new NovoChamado("A", null, null, "x", null), new Anexo("a.exe", new byte[]{1, 2, 3}))));
        assertEquals("O anexo pode ter no máximo 5 MB.", erro(() -> service.abrir(julia,
                new NovoChamado("A", null, null, "x", null), new Anexo("a.pdf", new byte[ChamadoService.TAMANHO_MAXIMO_ANEXO + 1]))));
        verify(chamadoRepository, never()).save(any());
        verify(mensagemRepository, never()).save(any());
    }

    @Test
    void precisaDeQuemEstaLogado() {
        NovoChamado dados = new NovoChamado("A", null, null, "x", null);
        assertEquals("Faça login para continuar.", erro(() -> service.abrir(null, dados, null)));
        assertEquals("Faça login para continuar.", erro(() -> service.abrir(new Solicitante("aluno", 3), dados, null)));
        assertEquals("Faça login para continuar.", erro(() -> service.meus(Solicitante.funcionario(null))));
        assertEquals("Funcionário não encontrado.", erro(() -> service.abrir(Solicitante.funcionario(99), dados, null)));
        assertEquals("Professor não encontrado.", erro(() -> service.abrir(Solicitante.professor(99), dados, null)));
    }

    // ===================== Quem abriu =====================

    @Test
    void cadaUmVeSoOsSeusChamados() {
        Chamado c = chamado("aberto", 5, null);
        c.setResponsavelId(1);
        when(chamadoRepository.findByFuncionarioIdOrderByAtualizadoEmDesc(5)).thenReturn(List.of(c, c));
        when(chamadoRepository.findByProfessorIdOrderByAtualizadoEmDesc(8)).thenReturn(List.of());

        List<ChamadoDto> meus = service.meus(Solicitante.funcionario(5));
        assertEquals(2, meus.size());
        assertEquals("Suporte/Sistema", meus.get(0).responsavelNome());
        assertNull(meus.get(0).mensagens());               // a lista não traz a conversa
        verify(funcionarioRepository, times(1)).findById(1); // nome do responsável buscado uma vez só
        assertTrue(service.meus(Solicitante.professor(8)).isEmpty());
    }

    @Test
    void chamadoDeOutraPessoaNaoAparece() {
        existe(chamado("aberto", 5, null));
        assertEquals("Chamado não encontrado.", erro(() -> service.meu(Solicitante.funcionario(6), 10)));
        assertEquals("Chamado não encontrado.", erro(() -> service.meu(Solicitante.professor(5), 10)));
        assertEquals("Chamado não encontrado.", erro(() -> service.meu(Solicitante.funcionario(5), 99)));
        assertEquals("Chamado não encontrado.", erro(() -> service.meu(Solicitante.funcionario(5), null)));
        assertEquals(10, service.meu(Solicitante.funcionario(5), 10).idChamado());
    }

    @Test
    void responderUmChamadoResolvidoReabre() {
        Chamado c = chamado("resolvido", null, 8);
        c.setResolvidoEm(LocalDateTime.now());
        c.setUltimaMensagemDe("suporte");
        existe(c);

        ChamadoDto dto = service.responderComoSolicitante(Solicitante.professor(8), 10, " Ainda dá erro ", new Anexo("e.pdf", PDF));

        assertEquals("aberto", dto.status());
        assertNull(dto.resolvidoEm());
        assertEquals("solicitante", dto.ultimaMensagemDe());
        assertEquals("Ainda dá erro", mensagensSalvas.get(0).getTexto());
        assertEquals("Patrícia Gomes", mensagensSalvas.get(0).getAutorNome());
        assertEquals("application/pdf", mensagensSalvas.get(0).getAnexoTipo());
    }

    @Test
    void responderEmAtendimentoMantemASituacao() {
        existe(chamado("em_atendimento", 5, null));
        assertEquals("em_atendimento",
                service.responderComoSolicitante(Solicitante.funcionario(5), 10, "Mais detalhes", null).status());
        assertEquals("Escreva a mensagem.",
                erro(() -> service.responderComoSolicitante(Solicitante.funcionario(5), 10, "  ", null)));
    }

    @Test
    void chamadoFechadoNaoRecebeMensagem() {
        existe(chamado("fechado", 5, null));
        assertTrue(erro(() -> service.responderComoSolicitante(Solicitante.funcionario(5), 10, "Oi", null))
                .startsWith("Este chamado está fechado"));
    }

    @Test
    void quemAbriuPodeFechar() {
        Chamado c = chamado("em_atendimento", 5, null);
        existe(c);
        ChamadoDto dto = service.fecharComoSolicitante(Solicitante.funcionario(5), 10);
        assertEquals("fechado", dto.status());
        assertNotNull(dto.resolvidoEm());

        reset(chamadoRepository);
        existe(c);
        service.fecharComoSolicitante(Solicitante.funcionario(5), 10);   // já fechado: não grava de novo
        verify(chamadoRepository, never()).save(any());

        Chamado resolvido = chamado("resolvido", 5, null);
        LocalDateTime antes = LocalDateTime.of(2026, 11, 1, 10, 0);
        resolvido.setResolvidoEm(antes);
        existe(resolvido);
        when(chamadoRepository.save(any(Chamado.class))).thenAnswer(i -> i.getArgument(0));
        assertEquals(antes, service.fecharComoSolicitante(Solicitante.funcionario(5), 10).resolvidoEm());
    }

    // ===================== Suporte =====================

    @Test
    void suporteListaTodosEVeOChamado() {
        when(chamadoRepository.findAllByOrderByAtualizadoEmDesc()).thenReturn(List.of(chamado("aberto", 5, null)));
        assertEquals(1, service.todos().size());
        existe(chamado("aberto", 5, null));
        assertEquals("Erro ao salvar", service.doSuporte(10).assunto());
    }

    @Test
    void primeiraRespostaColocaEmAtendimentoEAvisaPorEmail() {
        existe(chamado("aberto", 5, null));

        ChamadoDto dto = service.responderComoSuporte(1, 10, "Já estamos verificando.", null, null);

        assertEquals("em_atendimento", dto.status());
        assertEquals(1, dto.responsavelId());               // quem respondeu assume o chamado
        assertEquals("Suporte/Sistema", dto.responsavelNome());
        assertEquals("suporte", dto.ultimaMensagemDe());
        assertEquals("suporte", mensagensSalvas.get(0).getAutorTipo());
        verify(emailService).chamadoRespondido("julia@escola.com", "Julia Silva", 10, "Erro ao salvar",
                "Já estamos verificando.", "Em atendimento", "https://site/#/admin/suporte/10");
    }

    @Test
    void responderEResolverDeUmaVez() {
        Chamado c = chamado("em_atendimento", null, 8);
        c.setResponsavelId(5);
        existe(c);

        ChamadoDto dto = service.responderComoSuporte(1, 10, "Corrigido!", new Anexo("ok.png", PNG), "resolvido");

        assertEquals("resolvido", dto.status());
        assertNotNull(dto.resolvidoEm());
        assertEquals(5, dto.responsavelId());               // já tinha responsável: continua o mesmo
        verify(emailService).chamadoRespondido(eq("patricia@escola.com"), any(), eq(10), any(), eq("Corrigido!"),
                eq("Resolvido"), eq("https://site/#/professor/suporte/10"));
    }

    @Test
    void respostaDoSuporteValidaOsDados() {
        existe(chamado("aberto", 5, null));
        assertEquals("Escreva a resposta.", erro(() -> service.responderComoSuporte(1, 10, null, null, null)));
        assertEquals("Situação inválida.", erro(() -> service.responderComoSuporte(1, 10, "Oi", null, "pausado")));
        assertEquals("Chamado não encontrado.", erro(() -> service.responderComoSuporte(1, 77, "Oi", null, null)));
        verify(emailService, never()).chamadoRespondido(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void suporteMudaSituacaoPrioridadeEResponsavel() {
        Chamado c = chamado("resolvido", 5, null);
        c.setResolvidoEm(LocalDateTime.now());
        c.setResponsavelId(1);
        existe(c);

        ChamadoDto dto = service.atender(10, new Atendimento("em_atendimento", "urgente", 0));
        assertEquals("em_atendimento", dto.status());
        assertNull(dto.resolvidoEm());                      // reaberto: tira a data de resolução
        assertEquals("urgente", dto.prioridade());
        assertNull(dto.responsavelId());                    // 0 = sem responsável

        dto = service.atender(10, new Atendimento("fechado", null, 1));
        assertEquals("fechado", dto.status());
        assertNotNull(dto.resolvidoEm());
        assertEquals(1, dto.responsavelId());

        dto = service.atender(10, new Atendimento(null, null, null));  // nada muda
        assertEquals("fechado", dto.status());
    }

    @Test
    void atendimentoValidaOsDados() {
        existe(chamado("aberto", 5, null));
        assertEquals("Informe o que mudar no chamado.", erro(() -> service.atender(10, null)));
        assertEquals("Situação inválida.", erro(() -> service.atender(10, new Atendimento("x", null, null))));
        assertEquals("Prioridade inválida.", erro(() -> service.atender(10, new Atendimento(null, "x", null))));
        assertEquals("Funcionário responsável não encontrado.",
                erro(() -> service.atender(10, new Atendimento(null, null, 42))));
    }

    // ===================== Anexos =====================

    @Test
    void baixaOAnexoSoDoProprioChamado() {
        existe(chamado("aberto", 5, null));
        ChamadoMensagem comAnexo = new ChamadoMensagem();
        comAnexo.setIdMensagem(3);
        comAnexo.setChamadoId(10);
        comAnexo.setAnexoConteudo(PDF);
        ChamadoMensagem deOutro = new ChamadoMensagem();
        deOutro.setChamadoId(11);
        deOutro.setAnexoConteudo(PDF);
        ChamadoMensagem semAnexo = new ChamadoMensagem();
        semAnexo.setChamadoId(10);
        when(mensagemRepository.findById(3)).thenReturn(Optional.of(comAnexo));
        when(mensagemRepository.findById(4)).thenReturn(Optional.of(deOutro));
        when(mensagemRepository.findById(5)).thenReturn(Optional.of(semAnexo));

        assertSame(comAnexo, service.anexoDoSuporte(10, 3));
        assertSame(comAnexo, service.anexoDoSolicitante(Solicitante.funcionario(5), 10, 3));
        assertEquals("Anexo não encontrado.", erro(() -> service.anexoDoSuporte(10, 4)));
        assertEquals("Anexo não encontrado.", erro(() -> service.anexoDoSuporte(10, 5)));
        assertEquals("Anexo não encontrado.", erro(() -> service.anexoDoSuporte(10, 6)));
        assertEquals("Anexo não encontrado.", erro(() -> service.anexoDoSuporte(10, null)));
        assertEquals("Chamado não encontrado.",
                erro(() -> service.anexoDoSolicitante(Solicitante.funcionario(6), 10, 3)));
    }

    @Test
    void tipoDoAnexoPeloConteudo() {
        assertNull(ChamadoService.tipoDoAnexo(null));
        assertNull(ChamadoService.tipoDoAnexo(new Anexo("a", null)));
        assertEquals("image/jpeg", ChamadoService.tipoDoAnexo(
                new Anexo("foto", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})));
        verify(emailService, never()).chamadoRespondido(any(), any(), any(), any(), any(), any(), isNull());
    }
}
