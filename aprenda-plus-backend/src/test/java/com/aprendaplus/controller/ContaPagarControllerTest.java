package com.aprendaplus.controller;

import com.aprendaplus.dto.FluxoDeCaixa;
import com.aprendaplus.dto.FolhaDoProfessor;
import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ContaPagarService;
import com.aprendaplus.service.PagamentoProfessorService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContaPagarController.class)
class ContaPagarControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContaPagarService contaPagarService;

    @MockitoBean
    private PagamentoProfessorService pagamentoProfessorService;

    private static ContaPagar conta(String status) {
        ContaPagar c = new ContaPagar();
        c.setIdConta(8);
        c.setDescricao("Aluguel");
        c.setCategoria("Aluguel");
        c.setValor(new BigDecimal("3500.00"));
        c.setDataVencimento(LocalDate.of(2030, 1, 10));
        c.setStatus(status);
        return c;
    }

    @Test
    void listaAsContasComASituacao() throws Exception {
        when(contaPagarService.listar()).thenReturn(List.of(conta("pendente")));

        mockMvc.perform(get("/financeiro/contas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].descricao").value("Aluguel"))
                .andExpect(jsonPath("$[0].situacao").value("pendente"))
                .andExpect(jsonPath("$[0].dataVencimento").value("2030-01-10"));
        mockMvc.perform(get("/financeiro/contas/categorias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Aluguel"));
    }

    @Test
    void criaContaRepetidaSemDeixarCriarPagamentoDeProfessor() throws Exception {
        when(contaPagarService.criar(any(ContaPagar.class), eq(12))).thenReturn(List.of(conta("pendente")));

        mockMvc.perform(post("/financeiro/contas").param("repetirMeses", "12")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"descricao\": \"Aluguel\", \"categoria\": \"Aluguel\", \"valor\": 3500,"
                                + " \"dataVencimento\": \"2026-11-10\", \"professorId\": 3, \"referencia\": \"2026-10\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idConta").value(8));

        ArgumentCaptor<ContaPagar> enviada = ArgumentCaptor.forClass(ContaPagar.class);
        verify(contaPagarService).criar(enviada.capture(), eq(12));
        assertNull(enviada.getValue().getProfessorId());
        assertNull(enviada.getValue().getReferencia());
    }

    @Test
    void editaExcluiPagaEDesfaz() throws Exception {
        when(contaPagarService.atualizar(eq(8), any(ContaPagar.class))).thenReturn(conta("pendente"));
        when(contaPagarService.pagar(8, LocalDate.of(2026, 10, 20), "Pix")).thenReturn(conta("pago"));
        when(contaPagarService.estornar(8)).thenReturn(conta("pendente"));

        mockMvc.perform(put("/financeiro/contas/8").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"descricao\": \"Aluguel\" }"))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/financeiro/contas/8"))
                .andExpect(status().isNoContent());
        verify(contaPagarService).excluir(8);
        mockMvc.perform(put("/financeiro/contas/8/pagamento").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \"2026-10-20\", \"formaPagamento\": \"Pix\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pago"));
        mockMvc.perform(put("/financeiro/contas/8/estorno"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("pendente"));
    }

    @Test
    void pagarSemCorpoEDataInvalida() throws Exception {
        when(contaPagarService.pagar(eq(8), isNull(), isNull())).thenReturn(conta("pago"));

        mockMvc.perform(put("/financeiro/contas/8/pagamento"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/financeiro/contas/8/pagamento").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"dataPagamento\": \"20/10/2026\" }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void erroDeRegraVoltaComAMensagem() throws Exception {
        doThrow(new RegraDeNegocioException("Esta conta já foi paga. Desfaça o pagamento antes de excluir."))
                .when(contaPagarService).excluir(8);

        mockMvc.perform(delete("/financeiro/contas/8"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Esta conta já foi paga. Desfaça o pagamento antes de excluir."));
    }

    @Test
    void fluxoDeCaixa() throws Exception {
        when(contaPagarService.fluxo()).thenReturn(new FluxoDeCaixa(BigDecimal.TEN, BigDecimal.ONE, new BigDecimal("9"),
                BigDecimal.ZERO, BigDecimal.ZERO, 2, new BigDecimal("350"), List.of(), List.of()));

        mockMvc.perform(get("/financeiro/fluxo-caixa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoNoMes").value(9))
                .andExpect(jsonPath("$.contasAtrasadas").value(2));
    }

    @Test
    void folhaDosProfessores() throws Exception {
        when(pagamentoProfessorService.folha("2026-10")).thenReturn(List.of(new FolhaDoProfessor(1, "Ana", "ativo",
                new BigDecimal("50.00"), List.of("ADS"), new BigDecimal("40"), null, null, null, null)));

        mockMvc.perform(get("/financeiro/professores").param("referencia", "2026-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Ana"))
                .andExpect(jsonPath("$[0].turmas[0]").value("ADS"));
    }

    @Test
    void valorDaHora() throws Exception {
        when(pagamentoProfessorService.definirValorHora(1, new BigDecimal("55.5"))).thenReturn(new BigDecimal("55.50"));

        mockMvc.perform(put("/financeiro/professores/1/valor-hora").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"valorHora\": \"55,5\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorHora").value(55.5))
                .andExpect(jsonPath("$.idProfessor").value(1));
        mockMvc.perform(put("/financeiro/professores/1/valor-hora").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"valorHora\": \"cinquenta\" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe o valor da hora-aula em reais, por exemplo 55.00."));
        mockMvc.perform(put("/financeiro/professores/1/valor-hora"))
                .andExpect(status().isOk());
        verify(pagamentoProfessorService).definirValorHora(1, null);
    }

    @Test
    void gerarPagamentoDoProfessor() throws Exception {
        when(pagamentoProfessorService.gerarPagamento(1, "2026-10", new BigDecimal("40"), LocalDate.of(2026, 11, 5)))
                .thenReturn(conta("pendente"));

        mockMvc.perform(post("/financeiro/professores/1/pagamento").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"referencia\": \"2026-10\", \"horas\": 40, \"vencimento\": \"2026-11-05\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idConta").value(8));
        mockMvc.perform(post("/financeiro/professores/1/pagamento").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"referencia\": \"2026-10\", \"horas\": \"muitas\" }"))
                .andExpect(status().isBadRequest());
    }
}
