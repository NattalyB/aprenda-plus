package com.aprendaplus.service;

import com.aprendaplus.entity.Treinamento;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.TreinamentoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TreinamentoServiceTest {

    private static final byte[] PDF = "%PDF-1.4 conteudo".getBytes();

    @Mock
    private TreinamentoRepository treinamentoRepository;

    @InjectMocks
    private TreinamentoService service;

    private static TreinamentoService.Dados dados(String titulo, String video, byte[] pdf, boolean remover) {
        return new TreinamentoService.Dados(titulo, "  Como cadastrar  ", video, null, "manual.pdf", pdf, remover);
    }

    @Test
    void listaNaOrdem() {
        when(treinamentoRepository.findAllByOrderByOrdemAscIdTreinamentoAsc()).thenReturn(List.of(new Treinamento()));
        assertEquals(1, service.listar().size());
    }

    @Test
    void criaComVideoEPdf() {
        when(treinamentoRepository.save(any(Treinamento.class))).thenAnswer(i -> i.getArgument(0));

        Treinamento t = service.criar(dados("  Cadastro de alunos ", "https://youtu.be/dQw4w9WgXcQ", PDF, false));

        assertEquals("Cadastro de alunos", t.getTitulo());
        assertEquals("Como cadastrar", t.getDescricao());
        assertEquals("https://www.youtube.com/watch?v=dQw4w9WgXcQ", t.getVideoUrl());
        assertEquals("manual.pdf", t.getPdfNome());
        assertEquals(PDF.length, t.getPdfTamanho());
        assertTrue(t.isTemPdf());
        assertEquals(0, t.getOrdem());
        assertNotNull(t.getCriadoEm());
        assertNotNull(t.getAtualizadoEm());
    }

    @Test
    void validaOsDados() {
        assertEquals("Informe o título do treinamento.",
                assertThrows(RegraDeNegocioException.class, () -> service.criar(dados(" ", null, PDF, false))).getMessage());
        assertThrows(RegraDeNegocioException.class, () -> service.criar(dados("a".repeat(151), null, PDF, false)));
        assertThrows(RegraDeNegocioException.class, () -> service.criar(null));
        assertThrows(RegraDeNegocioException.class, () -> service.criar(
                new TreinamentoService.Dados("T", "d".repeat(5001), null, 1, null, PDF, false)));
        assertTrue(assertThrows(RegraDeNegocioException.class,
                () -> service.criar(dados("T", "https://vimeo.com/1", null, false))).getMessage().contains("YouTube"));
        assertEquals("O arquivo precisa ser um PDF.", assertThrows(RegraDeNegocioException.class,
                () -> service.criar(dados("T", null, new byte[]{1, 2, 3, 4}, false))).getMessage());
        assertEquals("O PDF pode ter no máximo 5 MB.", assertThrows(RegraDeNegocioException.class,
                () -> service.criar(dados("T", null, new byte[TreinamentoService.TAMANHO_MAXIMO_PDF + 1], false))).getMessage());
        assertTrue(assertThrows(RegraDeNegocioException.class,
                () -> service.criar(dados("T", null, null, false))).getMessage().contains("vídeo"));
        verify(treinamentoRepository, never()).save(any());
    }

    @Test
    void editarMantemOuRemoveOPdf() {
        Treinamento existente = new Treinamento();
        existente.setIdTreinamento(3);
        existente.setPdfNome("antigo.pdf");
        existente.setPdfTamanho(10);
        existente.setPdfConteudo(PDF);
        when(treinamentoRepository.findById(3)).thenReturn(Optional.of(existente));
        when(treinamentoRepository.save(any(Treinamento.class))).thenAnswer(i -> i.getArgument(0));

        // Sem PDF novo: continua com o antigo
        Treinamento mantido = service.atualizar(3, new TreinamentoService.Dados("Novo título", null, null, 2, null, null, false));
        assertEquals("antigo.pdf", mantido.getPdfNome());
        assertEquals(2, mantido.getOrdem());

        // Removendo o PDF sem vídeo: não pode ficar vazio
        assertThrows(RegraDeNegocioException.class,
                () -> service.atualizar(3, new TreinamentoService.Dados("T", null, null, null, null, null, true)));

        // Removendo o PDF com vídeo: ok
        Treinamento semPdf = service.atualizar(3, dados("T", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", null, true));
        assertNull(semPdf.getPdfNome());
        assertNull(semPdf.getPdfConteudo());
        assertFalse(semPdf.isTemPdf());
    }

    @Test
    void excluiEBaixaOPdf() {
        Treinamento comPdf = new Treinamento();
        comPdf.setPdfTamanho(10);
        comPdf.setPdfConteudo(PDF);
        Treinamento semPdf = new Treinamento();
        when(treinamentoRepository.findById(1)).thenReturn(Optional.of(comPdf));
        when(treinamentoRepository.findById(2)).thenReturn(Optional.of(semPdf));
        when(treinamentoRepository.findById(9)).thenReturn(Optional.empty());

        assertSame(comPdf, service.pdf(1));
        assertEquals("Este treinamento não tem PDF.", assertThrows(RegraDeNegocioException.class, () -> service.pdf(2)).getMessage());
        assertEquals("Treinamento não encontrado.", assertThrows(RegraDeNegocioException.class, () -> service.excluir(9)).getMessage());
        service.excluir(1);
        verify(treinamentoRepository).delete(comPdf);
    }
}
