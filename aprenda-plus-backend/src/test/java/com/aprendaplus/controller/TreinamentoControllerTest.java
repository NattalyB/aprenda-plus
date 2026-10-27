package com.aprendaplus.controller;

import com.aprendaplus.entity.Treinamento;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.TreinamentoService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TreinamentoController.class)
class TreinamentoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TreinamentoService treinamentoService;

    private static Treinamento treinamento() {
        Treinamento t = new Treinamento();
        t.setIdTreinamento(3);
        t.setTitulo("Cadastro de alunos");
        t.setPdfNome("manual de uso.pdf");
        t.setPdfTamanho(9);
        t.setPdfConteudo("%PDF-1.4x".getBytes());
        return t;
    }

    @Test
    void listaSemMandarOArquivo() throws Exception {
        when(treinamentoService.listar()).thenReturn(List.of(treinamento()));

        mockMvc.perform(get("/treinamentos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].titulo").value("Cadastro de alunos"))
                .andExpect(jsonPath("$[0].temPdf").value(true))
                .andExpect(jsonPath("$[0].pdfConteudo").doesNotExist());
    }

    @Test
    void criaComPdf() throws Exception {
        when(treinamentoService.criar(any())).thenReturn(treinamento());

        mockMvc.perform(multipart("/treinamentos")
                        .file(new MockMultipartFile("pdf", "manual.pdf", "application/pdf", "%PDF-1.4x".getBytes()))
                        .param("titulo", "Cadastro de alunos")
                        .param("videoUrl", "https://youtu.be/dQw4w9WgXcQ")
                        .param("ordem", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idTreinamento").value(3));

        ArgumentCaptor<TreinamentoService.Dados> dados = ArgumentCaptor.forClass(TreinamentoService.Dados.class);
        verify(treinamentoService).criar(dados.capture());
        assertEquals("Cadastro de alunos", dados.getValue().titulo());
        assertEquals(2, dados.getValue().ordem());
        assertEquals("manual.pdf", dados.getValue().pdfNome());
        assertEquals(9, dados.getValue().pdf().length);
        assertFalse(dados.getValue().removerPdf());
    }

    @Test
    void editaSemPdfERemovendoOAntigo() throws Exception {
        when(treinamentoService.atualizar(eq(3), any())).thenReturn(treinamento());

        mockMvc.perform(multipart(HttpMethod.PUT, "/treinamentos/3")
                        .param("titulo", "Novo")
                        .param("removerPdf", "true"))
                .andExpect(status().isOk());

        ArgumentCaptor<TreinamentoService.Dados> dados = ArgumentCaptor.forClass(TreinamentoService.Dados.class);
        verify(treinamentoService).atualizar(eq(3), dados.capture());
        assertNull(dados.getValue().pdf());
        assertNull(dados.getValue().pdfNome());
        assertTrue(dados.getValue().removerPdf());
    }

    @Test
    void erroDeValidacaoVolta400() throws Exception {
        when(treinamentoService.criar(any())).thenThrow(new RegraDeNegocioException("Informe o título do treinamento."));

        mockMvc.perform(multipart("/treinamentos").param("titulo", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe o título do treinamento."));
    }

    @Test
    void excluiEBaixaOPdf() throws Exception {
        when(treinamentoService.pdf(3)).thenReturn(treinamento());

        mockMvc.perform(delete("/treinamentos/3")).andExpect(status().isNoContent());
        verify(treinamentoService).excluir(3);

        mockMvc.perform(get("/treinamentos/3/pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", "inline; filename*=UTF-8''manual%20de%20uso.pdf"))
                .andExpect(content().bytes("%PDF-1.4x".getBytes()));
    }
}
