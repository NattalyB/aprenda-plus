package com.aprendaplus.controller;

import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.InscricaoService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Observação: nos testes a proteção da API (AuthInterceptor) fica desligada.
// O id e o papel que ela colocaria na requisição são simulados com .requestAttr(...)
// As regras de valor e pagamento são testadas no InscricaoServiceTest;
// aqui testamos se o controller encaminha cada caso para o lugar certo.
@WebMvcTest(InscricaoController.class)
class InscricaoControllerTest {

    // Uma inscrição "maliciosa": tenta usar o aluno 99, já confirmada,
    // com id de outra inscrição e pagando só R$ 0,01
    private static final String INSCRICAO_ADULTERADA = """
            {
              "idInscricao": 50,
              "aluno": { "idAluno": 99 },
              "turma": { "idTurma": 3 },
              "valorTotal": 0.01,
              "formaPagamento": "Pix à vista (5% de desconto)",
              "status": "confirmada"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InscricaoService inscricaoService;

    @Test
    void deveRetornarListaDeInscricoes() throws Exception {
        Inscricao inscricao = new Inscricao();
        inscricao.setIdInscricao(1);
        inscricao.setStatus("pendente_pagamento");

        when(inscricaoService.listarTodos()).thenReturn(Arrays.asList(inscricao));

        mockMvc.perform(get("/inscricoes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("pendente_pagamento"));
    }

    @Test
    void deveBuscarInscricaoPorId() throws Exception {
        Inscricao inscricao = new Inscricao();
        inscricao.setIdInscricao(4);
        when(inscricaoService.buscarPorId(4)).thenReturn(inscricao);

        mockMvc.perform(get("/inscricoes/4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idInscricao").value(4));
    }

    // ===== Aluno comprando pelo site =====

    @Test
    void compraDoAlunoUsaOIdDoTokenEOValorCalculadoNoServidor() throws Exception {
        Inscricao calculada = new Inscricao();
        calculada.setIdInscricao(10);
        calculada.setStatus("pendente_pagamento");
        calculada.setValorTotal(new BigDecimal("9500.00"));
        when(inscricaoService.criarInscricaoDoAluno(any(Inscricao.class), eq(7))).thenReturn(calculada);

        mockMvc.perform(post("/inscricoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INSCRICAO_ADULTERADA)
                        .requestAttr("usuarioId", 7)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorTotal").value(9500.00))
                .andExpect(jsonPath("$.status").value("pendente_pagamento"));

        // O aluno nunca usa o "salvar" livre do admin
        verify(inscricaoService, never()).salvar(any(Inscricao.class));

        // O controller repassa ao service a turma e a forma de pagamento escolhidas
        ArgumentCaptor<Inscricao> captor = ArgumentCaptor.forClass(Inscricao.class);
        verify(inscricaoService).criarInscricaoDoAluno(captor.capture(), eq(7));
        assertEquals(3, captor.getValue().getTurma().getIdTurma());
        assertEquals("Pix à vista (5% de desconto)", captor.getValue().getFormaPagamento());
    }

    @Test
    void alunoSemIdentificacaoNoTokenEhRecusado() throws Exception {
        mockMvc.perform(post("/inscricoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INSCRICAO_ADULTERADA)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").exists());

        verify(inscricaoService, never()).salvar(any(Inscricao.class));
        verify(inscricaoService, never()).criarInscricaoDoAluno(any(Inscricao.class), anyInt());
    }

    @Test
    void erroDeRegraDeNegocioViraRespostaComMensagem() throws Exception {
        when(inscricaoService.criarInscricaoDoAluno(any(Inscricao.class), eq(7)))
                .thenThrow(new RegraDeNegocioException("O curso \"Java\" pode ser pago em no máximo 6x."));

        mockMvc.perform(post("/inscricoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INSCRICAO_ADULTERADA)
                        .requestAttr("usuarioId", 7)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("O curso \"Java\" pode ser pago em no máximo 6x."));
    }

    // ===== Admin criando inscrição pelo painel =====

    @Test
    void adminPodeCriarInscricaoParaQualquerAluno() throws Exception {
        when(inscricaoService.salvar(any(Inscricao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/inscricoes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INSCRICAO_ADULTERADA)
                        .requestAttr("usuarioId", 1)
                        .requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk());

        ArgumentCaptor<Inscricao> captor = ArgumentCaptor.forClass(Inscricao.class);
        verify(inscricaoService).salvar(captor.capture());
        Inscricao salva = captor.getValue();
        assertEquals(99, salva.getAluno().getIdAluno());
        assertEquals("confirmada", salva.getStatus());
        verify(inscricaoService, never()).criarInscricaoDoAluno(any(Inscricao.class), anyInt());
    }

    @Test
    void deveAtualizarInscricao() throws Exception {
        when(inscricaoService.salvar(any(Inscricao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/inscricoes/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"status\": \"confirmada\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idInscricao").value(5))
                .andExpect(jsonPath("$.status").value("confirmada"));
    }

    @Test
    void deveExcluirInscricao() throws Exception {
        mockMvc.perform(delete("/inscricoes/1"))
                .andExpect(status().isNoContent());

        verify(inscricaoService).deletar(1);
    }
}
