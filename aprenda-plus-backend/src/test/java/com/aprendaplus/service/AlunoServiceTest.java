package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.repository.AlunoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlunoServiceTest {

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private DocumentoService documentoService;

    @InjectMocks
    private AlunoService alunoService;

    // Faz o "save" do repositório devolver o próprio aluno recebido
    private void saveDevolveOProprioAluno() {
        when(alunoRepository.save(any(Aluno.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void deveCriptografarSenhaAoCriarAluno() {
        Aluno aluno = new Aluno();
        aluno.setNomeCompleto("Teste");
        aluno.setEmail("teste@teste.com");
        aluno.setSenhaHash("123456");
        saveDevolveOProprioAluno();

        Aluno resultado = alunoService.salvar(aluno);

        assertNotEquals("123456", resultado.getSenhaHash());
        assertTrue(resultado.getSenhaHash().startsWith("$2"));
    }

    @Test
    void naoDeveRecriptografarSenhaJaCriptografada() {
        Aluno aluno = new Aluno();
        String hashExistente = "$2a$10$abcdefghijklmnopqrstuv";
        aluno.setSenhaHash(hashExistente);
        saveDevolveOProprioAluno();

        Aluno resultado = alunoService.salvar(aluno);

        assertEquals(hashExistente, resultado.getSenhaHash());
    }

    @Test
    void edicaoSemSenhaNovaDeveManterASenhaAtual() {
        Aluno salvoNoBanco = new Aluno();
        salvoNoBanco.setIdAluno(1);
        salvoNoBanco.setSenhaHash("$2a$10$senhaAtualDoAluno");
        when(alunoRepository.findById(1)).thenReturn(Optional.of(salvoNoBanco));
        saveDevolveOProprioAluno();

        Aluno edicao = new Aluno();
        edicao.setIdAluno(1);
        edicao.setNomeCompleto("Nome Atualizado");
        edicao.setSenhaHash(null); // o admin não digitou senha nova

        Aluno resultado = alunoService.salvar(edicao);

        assertEquals("$2a$10$senhaAtualDoAluno", resultado.getSenhaHash());
    }

    @Test
    void edicaoComSenhaEmBrancoDeveManterASenhaAtual() {
        Aluno salvoNoBanco = new Aluno();
        salvoNoBanco.setIdAluno(1);
        salvoNoBanco.setSenhaHash("$2a$10$senhaAtualDoAluno");
        when(alunoRepository.findById(1)).thenReturn(Optional.of(salvoNoBanco));
        saveDevolveOProprioAluno();

        Aluno edicao = new Aluno();
        edicao.setIdAluno(1);
        edicao.setSenhaHash("   ");

        Aluno resultado = alunoService.salvar(edicao);

        assertEquals("$2a$10$senhaAtualDoAluno", resultado.getSenhaHash());
    }

    @Test
    void edicaoComSenhaNovaDeveCriptografarASenhaNova() {
        saveDevolveOProprioAluno();

        Aluno edicao = new Aluno();
        edicao.setIdAluno(1);
        edicao.setSenhaHash("novaSenha123");

        Aluno resultado = alunoService.salvar(edicao);

        assertNotEquals("novaSenha123", resultado.getSenhaHash());
        assertTrue(resultado.getSenhaHash().startsWith("$2"));
        // Com senha nova, não precisa buscar a senha antiga no banco
        verify(alunoRepository, never()).findById(any());
    }

    @Test
    void cadastroSemSenhaNaoBuscaSenhaNoBanco() {
        saveDevolveOProprioAluno();

        Aluno novo = new Aluno(); // sem id: é um cadastro novo
        novo.setSenhaHash(null);

        alunoService.salvar(novo);

        verify(alunoRepository, never()).findById(any());
    }

    @Test
    void deveListarTodosOsAlunos() {
        when(alunoRepository.findAll()).thenReturn(Arrays.asList(new Aluno(), new Aluno()));

        assertEquals(2, alunoService.listarTodos().size());
    }

    @Test
    void deveExcluirAluno() {
        alunoService.deletar(1);

        verify(alunoRepository).deleteById(1);
    }

    // ===== Cadastro pelo site, com o certificado de conclusão =====

    @Test
    void cadastroComDocumentoConfereOArquivoAntesESalvaOsDois() {
        byte[] pdf = "%PDF-1.4".getBytes();
        when(alunoRepository.save(any(Aluno.class))).thenAnswer(invocation -> {
            Aluno a = invocation.getArgument(0);
            a.setIdAluno(15);
            return a;
        });
        Aluno novo = new Aluno();
        novo.setSenhaHash("segredo1");

        Aluno salvo = alunoService.cadastrarComDocumento(novo, "certificado.pdf", pdf);

        assertEquals(15, salvo.getIdAluno());
        org.mockito.InOrder ordem = org.mockito.Mockito.inOrder(documentoService, alunoRepository);
        ordem.verify(documentoService).validarArquivo("certificado.pdf", pdf);
        ordem.verify(alunoRepository).save(novo);
        ordem.verify(documentoService).salvar(15, "certificado.pdf", pdf);
    }

    @Test
    void cadastroComArquivoInvalidoNemCriaOAluno() {
        when(documentoService.validarArquivo(any(), any()))
                .thenThrow(new com.aprendaplus.exception.RegraDeNegocioException("Envie o documento em PDF, JPG ou PNG."));

        assertThrows(com.aprendaplus.exception.RegraDeNegocioException.class,
                () -> alunoService.cadastrarComDocumento(new Aluno(), "x.exe", new byte[]{1}));
        verify(alunoRepository, never()).save(any());
    }

    // ===== Consentimento para ofertas (módulo Comercial) =====

    @Test
    void cadastroNovoSemRespostaNaoAceitaOfertas() {
        Aluno aluno = new Aluno();
        aluno.setSenhaHash("123456");
        saveDevolveOProprioAluno();

        assertFalse(alunoService.salvar(aluno).getAceitaMarketing());
    }

    @Test
    void cadastroNovoGuardaQuemAceitouOfertas() {
        Aluno aluno = new Aluno();
        aluno.setSenhaHash("123456");
        aluno.setAceitaMarketing(true);
        saveDevolveOProprioAluno();

        assertTrue(alunoService.salvar(aluno).getAceitaMarketing());
    }

    @Test
    void edicaoSemOCampoMantemOConsentimentoSalvo() {
        Aluno salvo = new Aluno();
        salvo.setIdAluno(5);
        salvo.setSenhaHash("$2a$10$hashantigo");
        salvo.setAceitaMarketing(true);
        when(alunoRepository.findById(5)).thenReturn(Optional.of(salvo));
        saveDevolveOProprioAluno();

        Aluno edicao = new Aluno();
        edicao.setIdAluno(5);
        assertTrue(alunoService.salvar(edicao).getAceitaMarketing());

        Aluno comSenhaNova = new Aluno();
        comSenhaNova.setIdAluno(5);
        comSenhaNova.setSenhaHash("novaSenha");
        assertTrue(alunoService.salvar(comSenhaNova).getAceitaMarketing());
    }

    @Test
    void edicaoPodeRetirarOConsentimento() {
        Aluno salvo = new Aluno();
        salvo.setIdAluno(5);
        salvo.setSenhaHash("$2a$10$hashantigo");
        salvo.setAceitaMarketing(true);
        when(alunoRepository.findById(5)).thenReturn(Optional.of(salvo));
        saveDevolveOProprioAluno();

        Aluno edicao = new Aluno();
        edicao.setIdAluno(5);
        edicao.setAceitaMarketing(false);
        assertFalse(alunoService.salvar(edicao).getAceitaMarketing());
    }
}
