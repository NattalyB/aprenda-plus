package com.aprendaplus.service;

import com.aprendaplus.dto.DocumentoResumo;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.DocumentoAluno;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.DocumentoAlunoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentoServiceTest {

    private static final byte[] PDF = "%PDF-1.4 conteudo".getBytes();
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};
    private static final byte[] JPG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};

    @Mock
    private DocumentoAlunoRepository documentoRepository;

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private DocumentoService documentoService;

    private static Aluno aluno(int id) {
        Aluno a = new Aluno();
        a.setIdAluno(id);
        a.setNomeCompleto("Lucas Almeida");
        a.setEmail("lucas@aluno.com");
        return a;
    }

    private static DocumentoAluno documento(int id, Aluno aluno, String status) {
        DocumentoAluno d = new DocumentoAluno();
        d.setIdDocumento(id);
        d.setAluno(aluno);
        d.setNomeArquivo("certificado.pdf");
        d.setContentType("application/pdf");
        d.setTamanho(PDF.length);
        d.setConteudo(PDF);
        d.setStatus(status);
        return d;
    }

    private void saveDevolveOProprio() {
        when(documentoRepository.save(any(DocumentoAluno.class))).thenAnswer(invocation -> {
            DocumentoAluno d = invocation.getArgument(0);
            d.setIdDocumento(1);
            return d;
        });
    }

    // ===== Envio =====

    @Test
    void salvaUmPdfComoPendente() {
        when(alunoRepository.findById(7)).thenReturn(Optional.of(aluno(7)));
        saveDevolveOProprio();

        DocumentoResumo salvo = documentoService.salvar(7, "certificado.pdf", PDF);

        assertEquals(1, salvo.idDocumento());
        assertEquals(7, salvo.idAluno());
        assertEquals("application/pdf", salvo.contentType());
        assertEquals("pendente", salvo.status());
        assertEquals(PDF.length, salvo.tamanho());
    }

    @Test
    void reconheceImagensPeloConteudoEAcertaONome() {
        when(alunoRepository.findById(7)).thenReturn(Optional.of(aluno(7)));
        saveDevolveOProprio();

        assertEquals("foto.png", documentoService.salvar(7, "foto", PNG).nomeArquivo());
        assertEquals("Foto.JPEG", documentoService.salvar(7, "Foto.JPEG", JPG).nomeArquivo());
        assertEquals("scan.jpg", documentoService.salvar(7, "scan.jpg", JPG).nomeArquivo());
        assertEquals("pastax.jpg", documentoService.salvar(7, "pasta/x", JPG).nomeArquivo());
        assertEquals("documento.pdf", documentoService.salvar(7, null, PDF).nomeArquivo());
        assertEquals("documento.pdf", documentoService.salvar(7, " :*? ", PDF).nomeArquivo());
        assertEquals(154, documentoService.salvar(7, "a".repeat(300), PDF).nomeArquivo().length());
    }

    @Test
    void arquivosRecusados() {
        assertEquals("Anexe o certificado de conclusão (PDF, JPG ou PNG).",
                assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x.pdf", null)).getMessage());
        assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x.pdf", new byte[0]));
        assertEquals("O arquivo pode ter no máximo 5 MB.", assertThrows(RegraDeNegocioException.class,
                () -> documentoService.validarArquivo("x.pdf", new byte[DocumentoService.TAMANHO_MAXIMO + 1])).getMessage());
        // Um executável renomeado para .pdf não passa: o conteúdo é conferido
        assertEquals("Envie o documento em PDF, JPG ou PNG.", assertThrows(RegraDeNegocioException.class,
                () -> documentoService.validarArquivo("x.pdf", "MZ executavel".getBytes())).getMessage());
        assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x", new byte[]{'%', 'P'}));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x", new byte[]{(byte) 0x89, 'P', 'N', 'G'}));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x", new byte[]{(byte) 0xFF, (byte) 0xD8}));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x", new byte[]{(byte) 0xFF, 0x00, 0x00}));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.validarArquivo("x", new byte[]{(byte) 0x89, 'X', 'N', 'G', 0, 0, 0, 0}));
        verifyNoInteractions(documentoRepository);
    }

    @Test
    void alunoInexistente() {
        when(alunoRepository.findById(9)).thenReturn(Optional.empty());

        assertEquals("Aluno não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> documentoService.salvar(9, "x.pdf", PDF)).getMessage());
    }

    // ===== Consultas =====

    @Test
    void listaOsDoAlunoESituacaoDeCadaUm() {
        DocumentoResumo novoPendente = new DocumentoResumo(3, 7, "b.pdf", "application/pdf", 10, "pendente", null, null, null);
        DocumentoResumo antigoAprovado = new DocumentoResumo(2, 7, "a.pdf", "application/pdf", 10, "aprovado", null, null, null);
        DocumentoResumo outroRecusado = new DocumentoResumo(1, 8, "c.pdf", "application/pdf", 10, "recusado", "x", null, null);
        when(documentoRepository.todosOsResumos()).thenReturn(List.of(novoPendente, antigoAprovado, outroRecusado));
        when(documentoRepository.resumosDoAluno(7)).thenReturn(List.of(novoPendente, antigoAprovado));

        // Se o aluno já teve um documento aprovado, ele conta como aprovado
        assertEquals(Map.of(7, "aprovado", 8, "recusado"), documentoService.situacaoPorAluno());
        assertEquals(2, documentoService.doAluno(7).size());
    }

    @Test
    void temDocumentoAprovado() {
        when(documentoRepository.existsByAluno_IdAlunoAndStatus(7, "aprovado")).thenReturn(true);

        assertTrue(documentoService.temDocumentoAprovado(7));
        assertFalse(documentoService.temDocumentoAprovado(null));
    }

    @Test
    void arquivoSoParaODonoOuParaOPainel() {
        when(documentoRepository.findById(1)).thenReturn(Optional.of(documento(1, aluno(7), "pendente")));
        when(documentoRepository.findById(2)).thenReturn(Optional.of(documento(2, null, "pendente")));
        when(documentoRepository.findById(9)).thenReturn(Optional.empty());

        assertEquals("certificado.pdf", documentoService.arquivo(1, 7).getNomeArquivo());
        assertNotNull(documentoService.arquivo(1, null));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.arquivo(1, 8));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.arquivo(2, 7));
        assertThrows(RegraDeNegocioException.class, () -> documentoService.arquivo(9, null));
    }

    // ===== Revisão =====

    @Test
    void aprovaSemMotivo() {
        DocumentoAluno d = documento(1, aluno(7), "pendente");
        when(documentoRepository.findById(1)).thenReturn(Optional.of(d));
        when(documentoRepository.save(d)).thenReturn(d);

        DocumentoResumo r = documentoService.revisar(1, "aprovado", "  ");

        assertEquals("aprovado", r.status());
        assertNull(r.observacao());
        assertNotNull(r.revisadoEm());
        verifyNoInteractions(emailService);
    }

    @Test
    void aprovaComObservacao() {
        DocumentoAluno d = documento(1, aluno(7), "pendente");
        when(documentoRepository.findById(1)).thenReturn(Optional.of(d));
        when(documentoRepository.save(d)).thenReturn(d);

        assertEquals("Conferido", documentoService.revisar(1, "aprovado", " Conferido ").observacao());
        assertEquals("aprovado", documentoService.revisar(1, "aprovado", null).status());
    }

    @Test
    void recusaComMotivoEAvisaOAlunoPorEmail() {
        DocumentoAluno d = documento(1, aluno(7), "pendente");
        when(documentoRepository.findById(1)).thenReturn(Optional.of(d));
        when(documentoRepository.save(d)).thenReturn(d);

        DocumentoResumo r = documentoService.revisar(1, "recusado", " Foto ilegível ");

        assertEquals("recusado", r.status());
        assertEquals("Foto ilegível", r.observacao());
        verify(emailService).documentoRecusado("lucas@aluno.com", "Lucas Almeida", "Foto ilegível");
    }

    @Test
    void recusaDeDocumentoSemAlunoNaoEnviaEmail() {
        DocumentoAluno d = documento(1, null, "pendente");
        when(documentoRepository.findById(1)).thenReturn(Optional.of(d));
        when(documentoRepository.save(d)).thenReturn(d);

        assertNull(documentoService.revisar(1, "recusado", "Ilegível").idAluno());
        verifyNoInteractions(emailService);
    }

    @Test
    void revisoesRecusadas() {
        assertEquals("Escolha aprovar ou recusar o documento.",
                assertThrows(RegraDeNegocioException.class, () -> documentoService.revisar(1, "talvez", null)).getMessage());
        assertEquals("Informe o motivo da recusa para o aluno saber o que corrigir.",
                assertThrows(RegraDeNegocioException.class, () -> documentoService.revisar(1, "recusado", " ")).getMessage());
        assertThrows(RegraDeNegocioException.class, () -> documentoService.revisar(1, "recusado", null));
        assertEquals("O motivo pode ter no máximo 500 caracteres.",
                assertThrows(RegraDeNegocioException.class, () -> documentoService.revisar(1, "recusado", "x".repeat(501))).getMessage());
        when(documentoRepository.findById(5)).thenReturn(Optional.empty());
        assertEquals("Documento não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> documentoService.revisar(5, "aprovado", null)).getMessage());
    }
}
