package com.aprendaplus.controller;

import com.aprendaplus.dto.AlertasFinanceiros;
import com.aprendaplus.dto.CalculoParcela;
import com.aprendaplus.entity.ConfiguracaoFinanceira;
import com.aprendaplus.dto.ParcelaFinanceira;
import com.aprendaplus.dto.ResumoFinanceiro;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.FinanceiroService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FinanceiroController.class)
class FinanceiroControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FinanceiroService financeiroService;

    private static ParcelaFinanceira parcela(String status) {
        return new ParcelaFinanceira(5, 10, 3, "Lucas", "Redes", "Turma A", 2, 12, new BigDecimal("400.00"),
                LocalDate.of(2026, 10, 19), null, "Boleto bancário", status, false);
    }

    @Test
    void listaAsParcelas() throws Exception {
        when(financeiroService.listarParcelas()).thenReturn(List.of(parcela("pendente")));

        mockMvc.perform(get("/financeiro/parcelas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].aluno").value("Lucas"))
                .andExpect(jsonPath("$[0].vencimento").value("2026-10-19"))
                .andExpect(jsonPath("$[0].totalParcelas").value(12))
                .andExpect(jsonPath("$[0].cobrancaAutomatica").value(false));
    }

    @Test
    void resumoEAlertas() throws Exception {
        when(financeiroService.resumo()).thenReturn(new ResumoFinanceiro(BigDecimal.TEN, BigDecimal.ONE, BigDecimal.ZERO, 0,
                BigDecimal.TEN, new BigDecimal("0.0"), List.of(), List.of(), List.of()));
        when(financeiroService.alertas()).thenReturn(new AlertasFinanceiros(3, 1, List.of(4, 5, 6), List.of(9)));

        mockMvc.perform(get("/financeiro/resumo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previstoNoMes").value(10));
        mockMvc.perform(get("/financeiro/alertas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vencendoEmBreve").value(3))
                .andExpect(jsonPath("$.idsAtrasadas[0]").value(9))
                .andExpect(jsonPath("$.atrasadas").value(1));
    }

    @Test
    void alunoVeAsProprias() throws Exception {
        when(financeiroService.parcelasDoAluno(7)).thenReturn(List.of(parcela("pago")));

        mockMvc.perform(get("/financeiro/meus").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("pago"));
    }

    @Test
    void meusSemSerAluno() throws Exception {
        mockMvc.perform(get("/financeiro/meus").requestAttr("usuarioId", 1).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/financeiro/meus"))
                .andExpect(status().isUnauthorized());
        verify(financeiroService, never()).parcelasDoAluno(any());
    }

    @Test
    void registraPagamentoComDataEForma() throws Exception {
        when(financeiroService.registrarPagamento(5, LocalDate.of(2026, 10, 10), "Pix", false, null)).thenReturn(parcela("pago"));

        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \"2026-10-10\", \"formaPagamento\": \"Pix\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pago"));
    }

    @Test
    void registraPagamentoSemCorpoOuSemData() throws Exception {
        when(financeiroService.registrarPagamento(eq(5), isNull(), any(), eq(false), isNull())).thenReturn(parcela("pago"));

        mockMvc.perform(put("/financeiro/parcelas/5/pagamento"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \" \" }"))
                .andExpect(status().isOk());
        verify(financeiroService, times(2)).registrarPagamento(eq(5), isNull(), any(), eq(false), isNull());
    }

    @Test
    void dataInvalidaEhRecusada() throws Exception {
        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \"10/10/2026\" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe a data do pagamento no formato AAAA-MM-DD."));
    }

    @Test
    void erroDeRegraVoltaComAMensagem() throws Exception {
        when(financeiroService.estornar(5)).thenThrow(new RegraDeNegocioException("Só dá para estornar uma parcela que está paga."));

        mockMvc.perform(put("/financeiro/parcelas/5/estorno"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Só dá para estornar uma parcela que está paga."));
    }

    @Test
    void estornaEGeraAsQueFaltam() throws Exception {
        when(financeiroService.estornar(5)).thenReturn(parcela("pendente"));
        when(financeiroService.gerarParcelasQueFaltam()).thenReturn(4);

        mockMvc.perform(put("/financeiro/parcelas/5/estorno"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pendente"));
        mockMvc.perform(post("/financeiro/gerar-parcelas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matriculas").value(4));
    }

    // ===== Multa, juros e desconto =====

    @Test
    void baixaComIsencaoEDescontoNegociado() throws Exception {
        when(financeiroService.registrarPagamento(5, LocalDate.of(2026, 10, 10), "Boleto bancário", true,
                new BigDecimal("15.50"))).thenReturn(parcela("pago"));

        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \"2026-10-10\", \"formaPagamento\": \"Boleto bancário\","
                                + " \"isentarEncargos\": true, \"desconto\": \"15,50\" }"))
                .andExpect(status().isOk());
    }

    @Test
    void descontoInvalidoEhRecusado() throws Exception {
        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"desconto\": \"dez reais\" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe o desconto em reais, por exemplo 10.50."));
        verify(financeiroService, never()).registrarPagamento(any(), any(), any(), anyBoolean(), any());
    }

    @Test
    void previaDaBaixa() throws Exception {
        when(financeiroService.calcular(5, LocalDate.of(2026, 10, 25), false, null)).thenReturn(new CalculoParcela(
                new BigDecimal("500.00"), new BigDecimal("10.00"), new BigDecimal("2.50"), new BigDecimal("0.00"),
                new BigDecimal("512.50"), 15, LocalDate.of(2026, 10, 25)));

        mockMvc.perform(get("/financeiro/parcelas/5/calculo").param("data", "2026-10-25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(512.5))
                .andExpect(jsonPath("$.multa").value(10.0))
                .andExpect(jsonPath("$.diasAtraso").value(15));
        mockMvc.perform(get("/financeiro/parcelas/5/calculo").param("data", "amanhã"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void consultaESalvaAsRegras() throws Exception {
        ConfiguracaoFinanceira regras = new ConfiguracaoFinanceira();
        regras.setMultaPercentual(new BigDecimal("2.00"));
        regras.setJurosMesPercentual(new BigDecimal("1.00"));
        when(financeiroService.regras()).thenReturn(regras);
        when(financeiroService.salvarRegras(any(ConfiguracaoFinanceira.class))).thenAnswer(i -> i.getArgument(0));

        mockMvc.perform(get("/financeiro/configuracao"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.multaPercentual").value(2.0))
                .andExpect(jsonPath("$.diasCarencia").value(0));
        mockMvc.perform(put("/financeiro/configuracao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"multaPercentual\": 2, \"jurosMesPercentual\": 1, "
                                + "\"descontoPontualidadePercentual\": 5, \"diasCarencia\": 3 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descontoPontualidadePercentual").value(5))
                .andExpect(jsonPath("$.diasCarencia").value(3));
    }

    @Test
    void leOsValoresDaTela() {
        org.junit.jupiter.api.Assertions.assertNull(FinanceiroController.lerData(" "));
        org.junit.jupiter.api.Assertions.assertNull(FinanceiroController.lerValor(null));
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("10.5"), FinanceiroController.lerValor(10.5));
        org.junit.jupiter.api.Assertions.assertTrue(FinanceiroController.sim("TRUE"));
        org.junit.jupiter.api.Assertions.assertFalse(FinanceiroController.sim(null));
        org.junit.jupiter.api.Assertions.assertFalse(FinanceiroController.sim("sim"));
    }
}
