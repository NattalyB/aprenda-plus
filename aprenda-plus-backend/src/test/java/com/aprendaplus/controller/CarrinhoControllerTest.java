package com.aprendaplus.controller;

import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.service.CarrinhoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CarrinhoController.class)
class CarrinhoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CarrinhoService carrinhoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeCarrinhos() throws Exception {
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(1);

        when(carrinhoService.listarTodos()).thenReturn(Arrays.asList(carrinho));

        mockMvc.perform(get("/carrinhos"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarCarrinhoComSucesso() throws Exception {
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(1);

        when(carrinhoService.salvar(any(Carrinho.class))).thenReturn(carrinho);

        mockMvc.perform(post("/carrinhos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(carrinho)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirCarrinho() throws Exception {
        mockMvc.perform(delete("/carrinhos/1"))
                .andExpect(status().isNoContent());
    }
}