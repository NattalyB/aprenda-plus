package com.aprendaplus.controller;

import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.service.PagamentoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PagamentoController.class)
class PagamentoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PagamentoService pagamentoService;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void deveRetornarListaDePagamentos() throws Exception {
        Pagamento pagamento = new Pagamento();
        pagamento.setIdPagamento(1);
        pagamento.setValorParcela(new BigDecimal("150.00"));

        when(pagamentoService.listarTodos()).thenReturn(Arrays.asList(pagamento));

        mockMvc.perform(get("/pagamentos"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarPagamentoComSucesso() throws Exception {
        Pagamento pagamento = new Pagamento();
        pagamento.setIdPagamento(1);
        pagamento.setValorParcela(new BigDecimal("150.00"));

        when(pagamentoService.salvar(any(Pagamento.class))).thenReturn(pagamento);

        mockMvc.perform(post("/pagamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pagamento)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirPagamento() throws Exception {
        mockMvc.perform(delete("/pagamentos/1"))
                .andExpect(status().isNoContent());
    }
}