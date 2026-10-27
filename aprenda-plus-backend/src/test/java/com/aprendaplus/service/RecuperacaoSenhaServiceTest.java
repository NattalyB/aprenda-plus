package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.entity.RedefinicaoSenha;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.RedefinicaoSenhaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecuperacaoSenhaServiceTest {

    @Mock private RedefinicaoSenhaRepository redefinicaoRepository;
    @Mock private AlunoRepository alunoRepository;
    @Mock private FuncionarioRepository funcionarioRepository;
    @Mock private ProfessorRepository professorRepository;
    @Mock private EmailService emailService;

    @InjectMocks
    private RecuperacaoSenhaService service;

    private static Aluno aluno(String status) {
        Aluno a = new Aluno();
        a.setIdAluno(7);
        a.setNomeCompleto("Lucas Almeida");
        a.setEmail("lucas@aluno.com");
        a.setSenhaHash("hash-antigo");
        a.setStatus(status);
        return a;
    }

    private static Funcionario funcionario(String status) {
        Funcionario f = new Funcionario();
        f.setIdFuncionario(2);
        f.setNomeCompleto("Ana Secretaria");
        f.setEmail("ana@aprendaplus.com");
        f.setStatus(status);
        return f;
    }

    private static RedefinicaoSenha pedido(String tipo, Integer usuario, LocalDateTime expira, LocalDateTime usado) {
        RedefinicaoSenha p = new RedefinicaoSenha();
        p.setTipo(tipo);
        p.setUsuarioId(usuario);
        p.setExpiraEm(expira);
        p.setUsadoEm(usado);
        return p;
    }

    // ===== Pedido do link =====

    @Test
    void alunoRecebeOLinkPorEmailEOsLinksAntigosDeixamDeValer() {
        Aluno lucas = aluno("ativo");
        RedefinicaoSenha antigo = pedido("aluno", 7, LocalDateTime.now().plusMinutes(30), null);
        when(alunoRepository.findByEmail("lucas@aluno.com")).thenReturn(lucas);
        when(redefinicaoRepository.findByTipoAndUsuarioIdAndUsadoEmIsNull("aluno", 7)).thenReturn(List.of(antigo));
        when(emailService.linkDoSite(anyString())).thenAnswer(i -> "https://site/" + i.getArgument(0));

        service.solicitar("  lucas@aluno.com ", null);

        assertNotNull(antigo.getUsadoEm());
        ArgumentCaptor<RedefinicaoSenha> salvo = ArgumentCaptor.forClass(RedefinicaoSenha.class);
        verify(redefinicaoRepository, times(2)).save(salvo.capture());
        RedefinicaoSenha novo = salvo.getAllValues().get(1);
        assertEquals("aluno", novo.getTipo());
        assertEquals(7, novo.getUsuarioId());
        assertEquals(64, novo.getTokenHash().length());
        assertTrue(novo.getExpiraEm().isAfter(novo.getCriadoEm().plusMinutes(59)));
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).redefinirSenha(eq("lucas@aluno.com"), eq("Lucas Almeida"), link.capture());
        assertTrue(link.getValue().startsWith("https://site/#/redefinir-senha?token="));
        String codigo = link.getValue().substring(link.getValue().indexOf("token=") + 6);
        // no banco fica o hash, não o código do link
        assertEquals(RecuperacaoSenhaService.hash(codigo), novo.getTokenHash());
        assertNotEquals(codigo, novo.getTokenHash());
    }

    @Test
    void funcionarioRecebeOLinkDoPainel() {
        when(funcionarioRepository.findByEmail("ana@aprendaplus.com")).thenReturn(funcionario(null));
        when(emailService.linkDoSite(anyString())).thenAnswer(i -> i.getArgument(0));

        service.solicitar("ana@aprendaplus.com", "FUNCIONARIO");

        verify(emailService).redefinirSenha(eq("ana@aprendaplus.com"), eq("Ana Secretaria"),
                org.mockito.ArgumentMatchers.startsWith("#/admin/redefinir-senha?token="));
        verifyNoInteractions(alunoRepository);
    }

    @Test
    void emailDesconhecidoOuContaBloqueadaNaoRecebeNadaMasNaoDaErro() {
        when(alunoRepository.findByEmail("x@x.com")).thenReturn(null, aluno("bloqueado"));
        when(funcionarioRepository.findByEmail("f@x.com")).thenReturn(null, funcionario("inativo"));

        service.solicitar("x@x.com", "aluno");
        service.solicitar("x@x.com", "aluno");
        service.solicitar("f@x.com", "funcionario");
        service.solicitar("f@x.com", "funcionario");

        verifyNoInteractions(emailService, redefinicaoRepository);
    }

    @Test
    void pedidoSemEmail() {
        assertEquals("Informe o seu e-mail.",
                assertThrows(RegraDeNegocioException.class, () -> service.solicitar("  ", "aluno")).getMessage());
        assertEquals("Informe o seu e-mail.",
                assertThrows(RegraDeNegocioException.class, () -> service.solicitar(null, "aluno")).getMessage());
    }

    // ===== Nova senha =====

    @Test
    void alunoTrocaASenhaEOLinkNaoPodeSerUsadoDeNovo() {
        Aluno lucas = aluno("ativo");
        RedefinicaoSenha valido = pedido("aluno", 7, LocalDateTime.now().plusHours(2), null);
        RedefinicaoSenha outro = pedido("aluno", 7, LocalDateTime.now().plusHours(2), null);
        when(redefinicaoRepository.findFirstByTokenHash(RecuperacaoSenhaService.hash("codigo-do-link"))).thenReturn(Optional.of(valido));
        when(alunoRepository.findById(7)).thenReturn(Optional.of(lucas));
        when(redefinicaoRepository.findByTipoAndUsuarioIdAndUsadoEmIsNull("aluno", 7)).thenReturn(List.of(outro));

        assertEquals("aluno", service.redefinir(" codigo-do-link ", "novaSenha1"));

        assertTrue(new BCryptPasswordEncoder().matches("novaSenha1", lucas.getSenhaHash()));
        verify(alunoRepository).save(lucas);
        assertNotNull(valido.getUsadoEm());
        assertNotNull(outro.getUsadoEm());
    }

    private static Professor professor(String status) {
        Professor p = new Professor();
        p.setIdProfessor(3);
        p.setNomeCompleto("Roberto Fagundes");
        p.setEmail("roberto@aprendaplus.com");
        p.setStatus(status);
        return p;
    }

    @Test
    void secretariaEnviaOAcessoDoProfessorComLinkDeSeteDias() {
        Professor roberto = professor("ativo");
        when(professorRepository.findById(3)).thenReturn(Optional.of(roberto));
        when(redefinicaoRepository.findByTipoAndUsuarioIdAndUsadoEmIsNull("professor", 3)).thenReturn(List.of());
        when(emailService.linkDoSite(anyString())).thenAnswer(i -> "https://site/" + i.getArgument(0));
        when(emailService.configurado()).thenReturn(true);

        RecuperacaoSenhaService.AcessoProfessor acesso = service.enviarAcessoProfessor(3);

        assertTrue(acesso.link().startsWith("https://site/#/redefinir-senha?token="));
        assertTrue(acesso.emailEnviado());
        assertEquals("roberto@aprendaplus.com", acesso.email());
        ArgumentCaptor<RedefinicaoSenha> salvo = ArgumentCaptor.forClass(RedefinicaoSenha.class);
        verify(redefinicaoRepository).save(salvo.capture());
        assertEquals("professor", salvo.getValue().getTipo());
        assertEquals(3, salvo.getValue().getUsuarioId());
        assertTrue(salvo.getValue().getExpiraEm().isAfter(LocalDateTime.now().plusDays(6)));
        verify(emailService).acessoProfessor(eq("roberto@aprendaplus.com"), eq("Roberto Fagundes"), eq(acesso.link()));
    }

    @Test
    void acessoDoProfessorExigeCadastroAtivoComEmail() {
        when(professorRepository.findById(9)).thenReturn(Optional.empty());
        when(professorRepository.findById(4)).thenReturn(Optional.of(professor("inativo")));
        Professor semEmail = professor("ativo");
        semEmail.setEmail(" ");
        when(professorRepository.findById(5)).thenReturn(Optional.of(semEmail));

        assertEquals("Professor não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> service.enviarAcessoProfessor(9)).getMessage());
        assertEquals("Ative o cadastro do professor antes de enviar o acesso.",
                assertThrows(RegraDeNegocioException.class, () -> service.enviarAcessoProfessor(4)).getMessage());
        assertEquals("Cadastre o e-mail do professor antes de enviar o acesso.",
                assertThrows(RegraDeNegocioException.class, () -> service.enviarAcessoProfessor(5)).getMessage());
        verify(redefinicaoRepository, never()).save(any());
    }

    @Test
    void professorPedeNovaSenhaETroca() {
        Professor roberto = professor("ativo");
        when(professorRepository.findFirstByEmailIgnoreCase("roberto@aprendaplus.com")).thenReturn(roberto);
        when(professorRepository.findFirstByEmailIgnoreCase("ninguem@x.com")).thenReturn(null);
        when(redefinicaoRepository.findByTipoAndUsuarioIdAndUsadoEmIsNull("professor", 3)).thenReturn(List.of());
        when(emailService.linkDoSite(anyString())).thenAnswer(i -> "https://site/" + i.getArgument(0));

        service.solicitar("roberto@aprendaplus.com", "professor");
        service.solicitar("ninguem@x.com", "Professor");
        verify(emailService).redefinirSenha(eq("roberto@aprendaplus.com"), eq("Roberto Fagundes"),
                org.mockito.ArgumentMatchers.startsWith("https://site/#/redefinir-senha?token="));

        RedefinicaoSenha valido = pedido("professor", 3, LocalDateTime.now().plusDays(2), null);
        when(redefinicaoRepository.findFirstByTokenHash(any())).thenReturn(Optional.of(valido));
        when(professorRepository.findById(3)).thenReturn(Optional.of(roberto));

        assertEquals("professor", service.redefinir("abc", "segura123"));
        verify(professorRepository).save(roberto);
        assertTrue(new BCryptPasswordEncoder().matches("segura123", roberto.getSenhaHash()));
        assertEquals("professor", RecuperacaoSenhaService.tipoValido(" PROFESSOR "));
    }

    @Test
    void funcionarioTrocaASenha() {
        Funcionario ana = funcionario("ativo");
        RedefinicaoSenha valido = pedido("funcionario", 2, LocalDateTime.now().plusHours(2), null);
        when(redefinicaoRepository.findFirstByTokenHash(any())).thenReturn(Optional.of(valido));
        when(funcionarioRepository.findById(2)).thenReturn(Optional.of(ana));

        assertEquals("funcionario", service.redefinir("abc", "segura123"));
        verify(funcionarioRepository).save(ana);
        assertTrue(new BCryptPasswordEncoder().matches("segura123", ana.getSenhaHash()));
    }

    @Test
    void linkUsadoExpiradoInexistenteOuDeContaApagada() {
        when(redefinicaoRepository.findFirstByTokenHash(any())).thenReturn(
                Optional.of(pedido("aluno", 7, LocalDateTime.now().plusHours(1), LocalDateTime.now())),
                Optional.of(pedido("aluno", 7, LocalDateTime.now().minusMinutes(1), null)),
                Optional.of(pedido("aluno", 7, null, null)),
                Optional.empty(),
                Optional.of(pedido("aluno", 7, LocalDateTime.now().plusHours(4), null)),
                Optional.of(pedido("funcionario", 2, LocalDateTime.now().plusHours(4), null)));
        when(alunoRepository.findById(7)).thenReturn(Optional.empty());
        when(funcionarioRepository.findById(2)).thenReturn(Optional.empty());

        for (int i = 0; i < 6; i++) {
            assertEquals(RecuperacaoSenhaService.LINK_INVALIDO,
                    assertThrows(RegraDeNegocioException.class, () -> service.redefinir("abc", "segura123")).getMessage());
        }
        assertEquals(RecuperacaoSenhaService.LINK_INVALIDO,
                assertThrows(RegraDeNegocioException.class, () -> service.redefinir(" ", "segura123")).getMessage());
        assertEquals(RecuperacaoSenhaService.LINK_INVALIDO,
                assertThrows(RegraDeNegocioException.class, () -> service.redefinir(null, "segura123")).getMessage());
        verify(alunoRepository, never()).save(any());
    }

    @Test
    void novaSenhaObrigatoriaComSeisCaracteres() {
        assertEquals("Digite a nova senha.",
                assertThrows(RegraDeNegocioException.class, () -> service.redefinir("abc", null)).getMessage());
        assertEquals("Digite a nova senha.",
                assertThrows(RegraDeNegocioException.class, () -> service.redefinir("abc", "  ")).getMessage());
        assertEquals("A nova senha deve ter pelo menos 6 caracteres.",
                assertThrows(RegraDeNegocioException.class, () -> service.redefinir("abc", "12345")).getMessage());
        verifyNoInteractions(redefinicaoRepository);
    }

    @Test
    void codigosSaoAleatoriosEOHashEhSha256() {
        String a = RecuperacaoSenhaService.novoCodigo();
        assertEquals(43, a.length());
        assertNotEquals(a, RecuperacaoSenhaService.novoCodigo());
        assertEquals("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", RecuperacaoSenhaService.hash("hello"));
        assertEquals("aluno", RecuperacaoSenhaService.tipoValido("qualquer"));
        assertEquals("funcionario", RecuperacaoSenhaService.tipoValido(" funcionario "));
    }
}
