package com.aprendaplus.controller;

import com.aprendaplus.dto.AndamentoAluno;
import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.AvisoForm;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ConteudoEadService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ConteudoEadController.class)
class ConteudoEadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ConteudoEadService conteudoEadService;

    private static PlanoDaTurma plano() {
        return new PlanoDaTurma(9, 5, "Turma A", 1, "Administração", 3, "Carla", List.of(), List.of());
    }

    @Test
    void consultaASalaOResumoEOAndamento() throws Exception {
        when(conteudoEadService.planoDaTurma(5)).thenReturn(plano());
        when(conteudoEadService.quantidadeDeAulasPorTurma()).thenReturn(Map.of(5, 12));
        when(conteudoEadService.andamento(5)).thenReturn(List.of(
                new AndamentoAluno(7, "Lucas", "lucas@aluno.com", "ativa", 6, 12, 50, null, false)));

        mockMvc.perform(get("/planos-de-aula/turma/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.professor").value("Carla"));
        mockMvc.perform(get("/planos-de-aula/resumo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['5']").value(12));
        mockMvc.perform(get("/planos-de-aula/turma/5/andamento"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].percentual").value(50));
    }

    @Test
    void defineOProfessor() throws Exception {
        when(conteudoEadService.definirProfessor(5, 3)).thenReturn(plano());

        mockMvc.perform(put("/planos-de-aula/turma/5/professor").contentType(MediaType.APPLICATION_JSON).content("{\"idProfessor\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPlano").value(9));
    }

    @Test
    void criaEditaMoveEExcluiAulas() throws Exception {
        when(conteudoEadService.adicionarAula(eq(5), any(AulaForm.class))).thenReturn(plano());
        when(conteudoEadService.atualizarAula(eq(11), any(AulaForm.class))).thenReturn(plano());
        when(conteudoEadService.moverAula(11, "cima")).thenReturn(plano());
        when(conteudoEadService.excluirAula(11)).thenReturn(plano());
        String json = """
                {"titulo":"Introdução","idDisciplina":4,"tipo":"video","dataLiberacao":"2026-11-03",
                 "videoUrl":"https://youtu.be/dQw4w9WgXcQ","duracaoMinutos":30,"publicada":true}
                """;

        mockMvc.perform(post("/planos-de-aula/turma/5/aulas").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk());
        mockMvc.perform(put("/planos-de-aula/aulas/11").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk());
        mockMvc.perform(put("/planos-de-aula/aulas/11/mover").param("direcao", "cima"))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/planos-de-aula/aulas/11"))
                .andExpect(status().isOk());

        ArgumentCaptor<AulaForm> form = ArgumentCaptor.forClass(AulaForm.class);
        verify(conteudoEadService).adicionarAula(eq(5), form.capture());
        assertEquals("Introdução", form.getValue().titulo());
        assertEquals(4, form.getValue().idDisciplina());
        assertEquals(LocalDate.of(2026, 11, 3), form.getValue().dataLiberacao());
        assertEquals(30, form.getValue().duracaoMinutos());
        assertTrue(form.getValue().publicada());
    }

    @Test
    void excluiVariasAulasDeUmaVez() throws Exception {
        when(conteudoEadService.excluirAulas(5, List.of(11, 12))).thenReturn(plano());

        mockMvc.perform(post("/planos-de-aula/turma/5/aulas/excluir")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[11,12]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idPlano").value(9));
    }

    @Test
    void copiaAsAulasDeOutraTurma() throws Exception {
        when(conteudoEadService.copiarAulas(5, 2)).thenReturn(8);
        when(conteudoEadService.planoDaTurma(5)).thenReturn(plano());

        mockMvc.perform(post("/planos-de-aula/turma/5/copiar").param("origem", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.copiadas").value(8))
                .andExpect(jsonPath("$.plano.idTurma").value(5));
    }

    @Test
    void publicaEExcluiAvisoComOAutorLogado() throws Exception {
        when(conteudoEadService.publicarAviso(eq(5), any(AvisoForm.class), eq(1))).thenReturn(plano());
        when(conteudoEadService.excluirAviso(3)).thenReturn(plano());

        mockMvc.perform(post("/planos-de-aula/turma/5/avisos").requestAttr("usuarioId", 1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titulo\":\"Prova\",\"mensagem\":\"Dia 10\",\"fixado\":true,\"enviarEmail\":true}"))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/planos-de-aula/avisos/3"))
                .andExpect(status().isOk());

        ArgumentCaptor<AvisoForm> aviso = ArgumentCaptor.forClass(AvisoForm.class);
        verify(conteudoEadService).publicarAviso(eq(5), aviso.capture(), eq(1));
        assertEquals(new AvisoForm("Prova", "Dia 10", true, true), aviso.getValue());
    }

    @Test
    void editaAviso() throws Exception {
        when(conteudoEadService.editarAviso(eq(3), any(AvisoForm.class))).thenReturn(plano());

        mockMvc.perform(put("/planos-de-aula/avisos/3").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titulo\":\"Prova\",\"mensagem\":\"Dia 12\",\"fixado\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idTurma").value(5));

        verify(conteudoEadService).editarAviso(3, new AvisoForm("Prova", "Dia 12", false, null));
    }

    @Test
    void erroDeRegraViraMensagem() throws Exception {
        when(conteudoEadService.adicionarAula(eq(5), any(AulaForm.class)))
                .thenThrow(new RegraDeNegocioException("Informe o título da aula."));

        mockMvc.perform(post("/planos-de-aula/turma/5/aulas").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe o título da aula."));
    }
}
