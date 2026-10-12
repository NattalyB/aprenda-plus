package com.aprendaplus.controller;

import com.aprendaplus.dto.AlertasFinanceiros;
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
                LocalDate.of(2026, 10, 19), null, "Boleto bancário", status);
    }

    @Test
    void listaAsParcelas() throws Exception {
        when(financeiroService.listarParcelas()).thenReturn(List.of(parcela("pendente")));

        mockMvc.perform(get("/financeiro/parcelas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].aluno").value("Lucas"))
                .andExpect(jsonPath("$[0].vencimento").value("2026-10-19"))
                .andExpect(jsonPath("$[0].totalParcelas").value(12));
    }

    @Test
    void resumoEAlertas() throws Exception {
        when(financeiroService.resumo()).thenReturn(new ResumoFinanceiro(BigDecimal.TEN, BigDecimal.ONE, BigDecimal.ZERO, 0,
                BigDecimal.TEN, new BigDecimal("0.0"), List.of(), List.of(), List.of()));
        when(financeiroService.alertas()).thenReturn(new AlertasFinanceiros(3, 1));

        mockMvc.perform(get("/financeiro/resumo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previstoNoMes").value(10));
        mockMvc.perform(get("/financeiro/alertas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vencendoEmBreve").value(3))
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
        when(financeiroService.registrarPagamento(5, LocalDate.of(2026, 10, 10), "Pix")).thenReturn(parcela("pago"));

        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \"2026-10-10\", \"formaPagamento\": \"Pix\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pago"));
    }

    @Test
    void registraPagamentoSemCorpoOuSemData() throws Exception {
        when(financeiroService.registrarPagamento(eq(5), isNull(), any())).thenReturn(parcela("pago"));

        mockMvc.perform(put("/financeiro/parcelas/5/pagamento"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/financeiro/parcelas/5/pagamento")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \" \" }"))
                .andExpect(status().isOk());
        verify(financeiroService, times(2)).registrarPagamento(eq(5), isNull(), any());
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
}
