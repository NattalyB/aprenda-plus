package com.aprendaplus.controller;

import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.service.ItemCarrinhoService;
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

@WebMvcTest(ItemCarrinhoController.class)
class ItemCarrinhoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ItemCarrinhoService itemCarrinhoService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deveRetornarListaDeItens() throws Exception {
        ItemCarrinho item = new ItemCarrinho();
        item.setIdItem(1);

        when(itemCarrinhoService.listarTodos()).thenReturn(Arrays.asList(item));

        mockMvc.perform(get("/itens-carrinho"))
                .andExpect(status().isOk());
    }

    @Test
    void deveCriarItemComSucesso() throws Exception {
        ItemCarrinho item = new ItemCarrinho();
        item.setIdItem(1);

        when(itemCarrinhoService.salvar(any(ItemCarrinho.class))).thenReturn(item);

        mockMvc.perform(post("/itens-carrinho")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(item)))
                .andExpect(status().isOk());
    }

    @Test
    void deveExcluirItem() throws Exception {
        mockMvc.perform(delete("/itens-carrinho/1"))
                .andExpect(status().isNoContent());
    }
}