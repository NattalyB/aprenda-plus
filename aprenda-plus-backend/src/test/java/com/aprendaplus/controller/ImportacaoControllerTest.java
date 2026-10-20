package com.aprendaplus.controller;

import com.aprendaplus.dto.ResultadoImportacao;
import com.aprendaplus.dto.ResultadoImportacao.LinhaImportada;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ImportacaoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ImportacaoController.class)
class ImportacaoControllerTest {

    private static final String PLANILHA = "{\"linhas\":[{\"Nome completo\":\"Ana\",\"_linha\":\"2\"}]}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImportacaoService importacaoService;

    private static ResultadoImportacao resultado(boolean confirmado) {
        return new ResultadoImportacao(confirmado, 2, 1, 1, confirmado ? 1 : 0, List.of(
                new LinhaImportada(2, "Ana", List.of(), confirmado),
                new LinhaImportada(3, "Linha 3", List.of("Informe o e-mail."), false)));
    }

    @Test
    void previaDosAlunosPorPadraoNaoConfirma() throws Exception {
        when(importacaoService.alunos(List.of(Map.of("Nome completo", "Ana", "_linha", "2")), false))
                .thenReturn(resultado(false));

        mockMvc.perform(post("/alunos/importacao").contentType(MediaType.APPLICATION_JSON).content(PLANILHA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmado").value(false))
                .andExpect(jsonPath("$.validas").value(1))
                .andExpect(jsonPath("$.linhas[1].linha").value(3))
                .andExpect(jsonPath("$.linhas[1].erros[0]").value("Informe o e-mail."));
    }

    @Test
    void cadaCadastroTemASuaRota() throws Exception {
        when(importacaoService.professores(any(), eq(true))).thenReturn(resultado(true));
        when(importacaoService.cursos(any(), eq(true))).thenReturn(resultado(true));
        when(importacaoService.disciplinas(any(), eq(false))).thenReturn(resultado(false));
        when(importacaoService.aulas(eq(3), any(), eq(true))).thenReturn(resultado(true));

        mockMvc.perform(post("/professores/importacao?confirmar=true").contentType(MediaType.APPLICATION_JSON).content(PLANILHA))
                .andExpect(jsonPath("$.importadas").value(1))
                .andExpect(jsonPath("$.linhas[0].importada").value(true));
        mockMvc.perform(post("/cursos/importacao").param("confirmar", "true")
                        .contentType(MediaType.APPLICATION_JSON).content(PLANILHA))
                .andExpect(jsonPath("$.confirmado").value(true));
        mockMvc.perform(post("/disciplinas/importacao").contentType(MediaType.APPLICATION_JSON).content(PLANILHA))
                .andExpect(jsonPath("$.confirmado").value(false));
        mockMvc.perform(post("/planos-de-aula/turma/3/aulas/importacao?confirmar=true")
                        .contentType(MediaType.APPLICATION_JSON).content(PLANILHA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2));
    }

    @Test
    void problemaNaPlanilhaInteiraVoltaComOMotivo() throws Exception {
        when(importacaoService.cursos(null, false))
                .thenThrow(new RegraDeNegocioException("A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho."));

        mockMvc.perform(post("/cursos/importacao").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho."));
    }
}
