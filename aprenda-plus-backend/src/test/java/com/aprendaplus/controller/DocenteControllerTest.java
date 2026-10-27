package com.aprendaplus.controller;

import com.aprendaplus.dto.AndamentoAluno;
import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.AvisoForm;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.dto.TurmaDoProfessor;
import com.aprendaplus.service.ConteudoEadService;
import com.aprendaplus.service.DocenteService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DocenteController.class)
class DocenteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocenteService docenteService;

    @MockitoBean
    private ConteudoEadService conteudoEadService;

    private static PlanoDaTurma sala() {
        return new PlanoDaTurma(9, 5, "Turma ESI-A", 1, "ES", 3, "Roberto", List.of(), List.of());
    }

    private static final String AULA = "{\"titulo\":\"Introdução\",\"tipo\":\"video\",\"publicada\":true}";
    private static final String AVISO = "{\"titulo\":\"Prova\",\"mensagem\":\"Dia 10\"}";

    @Test
    void semLoginNaoEntra() throws Exception {
        mockMvc.perform(get("/docente/eu")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/docente/turmas")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/docente/turmas/5")).andExpect(status().isUnauthorized());
        verifyNoInteractions(docenteService);
    }

    @Test
    void dadosETurmasDoProfessor() throws Exception {
        when(docenteService.meusDados(3)).thenReturn(new DocenteService.MeusDados(3, "Roberto", "r@x.com"));
        when(docenteService.turmas(3)).thenReturn(List.of(
                new TurmaDoProfessor(5, "Turma ESI-A", 1, "ES", "EAD", "Seg", "2026/2", true, true, 12, 8, 64)));

        mockMvc.perform(get("/docente/eu").requestAttr("usuarioId", 3))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nome").value("Roberto"));
        mockMvc.perform(get("/docente/turmas").requestAttr("usuarioId", 3))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].progressoMedio").value(64));
    }

    @Test
    void turmaDeOutroProfessorDa403() throws Exception {
        when(docenteService.ehTurmaDoProfessor(3, 7)).thenReturn(false);

        mockMvc.perform(get("/docente/turmas/7").requestAttr("usuarioId", 3))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensagem").value("Esta turma não é sua."));
        mockMvc.perform(post("/docente/turmas/7/aulas").requestAttr("usuarioId", 3)
                        .contentType(MediaType.APPLICATION_JSON).content(AULA))
                .andExpect(status().isForbidden());
        verify(conteudoEadService, never()).planoDaTurma(any());
        verify(conteudoEadService, never()).adicionarAula(any(), any());
    }

    @Test
    void aulaOuAvisoInexistenteDa404() throws Exception {
        when(conteudoEadService.turmaDaAula(99)).thenReturn(null);
        when(conteudoEadService.turmaDoAviso(98)).thenReturn(null);

        mockMvc.perform(put("/docente/aulas/99").requestAttr("usuarioId", 3)
                .contentType(MediaType.APPLICATION_JSON).content(AULA)).andExpect(status().isNotFound());
        mockMvc.perform(delete("/docente/avisos/98").requestAttr("usuarioId", 3)).andExpect(status().isNotFound());
    }

    @Test
    void professorDaTurmaUsaASalaDeAula() throws Exception {
        when(docenteService.ehTurmaDoProfessor(3, 5)).thenReturn(true);
        when(docenteService.nome(3)).thenReturn("Roberto");
        when(conteudoEadService.turmaDaAula(11)).thenReturn(5);
        when(conteudoEadService.turmaDoAviso(2)).thenReturn(5);
        when(conteudoEadService.planoDaTurma(5)).thenReturn(sala());
        when(conteudoEadService.andamento(5)).thenReturn(List.of(
                new AndamentoAluno(7, "Lucas", "l@x.com", "ativa", 6, 12, 50, null, false)));
        when(docenteService.disciplinasDaTurma(5)).thenReturn(List.of(Map.of("idDisciplina", 2, "nome", "Banco")));
        when(conteudoEadService.adicionarAula(eq(5), any(AulaForm.class))).thenReturn(sala());
        when(conteudoEadService.atualizarAula(eq(11), any(AulaForm.class))).thenReturn(sala());
        when(conteudoEadService.excluirAula(11)).thenReturn(sala());
        when(conteudoEadService.moverAula(11, "cima")).thenReturn(sala());
        when(conteudoEadService.publicarAvisoDe(eq(5), any(AvisoForm.class), eq("Roberto"))).thenReturn(sala());
        when(conteudoEadService.editarAviso(eq(2), any(AvisoForm.class))).thenReturn(sala());
        when(conteudoEadService.excluirAviso(2)).thenReturn(sala());

        mockMvc.perform(get("/docente/turmas/5").requestAttr("usuarioId", 3))
                .andExpect(status().isOk()).andExpect(jsonPath("$.turma").value("Turma ESI-A"));
        mockMvc.perform(get("/docente/turmas/5/andamento").requestAttr("usuarioId", 3))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].percentual").value(50));
        mockMvc.perform(get("/docente/turmas/5/disciplinas").requestAttr("usuarioId", 3))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].nome").value("Banco"));
        mockMvc.perform(post("/docente/turmas/5/aulas").requestAttr("usuarioId", 3)
                .contentType(MediaType.APPLICATION_JSON).content(AULA)).andExpect(status().isOk());
        mockMvc.perform(put("/docente/aulas/11").requestAttr("usuarioId", 3)
                .contentType(MediaType.APPLICATION_JSON).content(AULA)).andExpect(status().isOk());
        mockMvc.perform(put("/docente/aulas/11/mover").param("direcao", "cima").requestAttr("usuarioId", 3))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/docente/aulas/11").requestAttr("usuarioId", 3)).andExpect(status().isOk());
        mockMvc.perform(post("/docente/turmas/5/avisos").requestAttr("usuarioId", 3)
                .contentType(MediaType.APPLICATION_JSON).content(AVISO)).andExpect(status().isOk());
        mockMvc.perform(put("/docente/avisos/2").requestAttr("usuarioId", 3)
                .contentType(MediaType.APPLICATION_JSON).content(AVISO)).andExpect(status().isOk());
        mockMvc.perform(delete("/docente/avisos/2").requestAttr("usuarioId", 3)).andExpect(status().isOk());

        verify(conteudoEadService).publicarAvisoDe(eq(5), any(AvisoForm.class), eq("Roberto"));
        verify(conteudoEadService).excluirAula(11);
        verify(conteudoEadService).excluirAviso(2);
    }
}
