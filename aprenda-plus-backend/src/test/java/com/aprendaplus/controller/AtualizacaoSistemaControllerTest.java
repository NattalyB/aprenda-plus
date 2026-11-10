package com.aprendaplus.controller;

import com.aprendaplus.entity.AtualizacaoSistema;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.AtualizacaoSistemaService;
import com.aprendaplus.service.AtualizacaoSistemaService.Dados;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AtualizacaoSistemaController.class, DocenteManutencaoController.class})
class AtualizacaoSistemaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AtualizacaoSistemaService service;

    private static AtualizacaoSistema atualizacao(String tipo) {
        AtualizacaoSistema a = new AtualizacaoSistema();
        a.setIdAtualizacao(3);
        a.setTitulo("Manutenção do servidor");
        a.setTipo(tipo);
        a.setInicioManutencao(LocalDateTime.of(2026, 11, 20, 22, 0));
        return a;
    }

    @Test
    void listaEMostraAsManutencoes() throws Exception {
        when(service.listar()).thenReturn(List.of(atualizacao("novidade")));
        when(service.manutencoesPendentes()).thenReturn(List.of(atualizacao("manutencao")));

        mockMvc.perform(get("/atualizacoes")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idAtualizacao").value(3));
        mockMvc.perform(get("/atualizacoes/manutencoes")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipo").value("manutencao"))
                .andExpect(jsonPath("$[0].inicioManutencao").exists());
        mockMvc.perform(get("/docente/manutencoes")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].titulo").value("Manutenção do servidor"));
    }

    @Test
    void publicaEditaEExclui() throws Exception {
        when(service.criar(any(), eq(1))).thenReturn(atualizacao("manutencao"));
        when(service.editar(eq(3), any())).thenReturn(atualizacao("melhoria"));

        mockMvc.perform(post("/atualizacoes").requestAttr("usuarioId", 1).contentType("application/json")
                        .content("{\"titulo\":\"Manutenção\",\"descricao\":\"Fora do ar\",\"tipo\":\"manutencao\","
                                + "\"inicioManutencao\":\"2026-11-20T22:00\",\"fimManutencao\":\"2026-11-20T22:30\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idAtualizacao").value(3));
        verify(service).criar(new Dados("Manutenção", "Fora do ar", "manutencao", null,
                LocalDateTime.of(2026, 11, 20, 22, 0), LocalDateTime.of(2026, 11, 20, 22, 30)), 1);

        mockMvc.perform(put("/atualizacoes/3").contentType("application/json")
                        .content("{\"titulo\":\"T\",\"descricao\":\"D\",\"tipo\":\"melhoria\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("melhoria"));

        mockMvc.perform(delete("/atualizacoes/3")).andExpect(status().isNoContent());
        verify(service).excluir(3);
    }

    @Test
    void erroDeRegraViraMensagemClara() throws Exception {
        when(service.criar(any(), any())).thenThrow(new RegraDeNegocioException("Descreva o que mudou."));
        mockMvc.perform(post("/atualizacoes").contentType("application/json").content("{\"titulo\":\"T\"}"))
                .andExpect(status().isBadRequest());
    }
}
