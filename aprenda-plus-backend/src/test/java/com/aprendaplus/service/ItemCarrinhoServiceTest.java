package com.aprendaplus.service;

import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItemCarrinhoServiceTest {

    @Mock
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @InjectMocks
    private ItemCarrinhoService itemCarrinhoService;

    @Test
    void deveListarTodosOsItens() {
        ItemCarrinho item = new ItemCarrinho();
        item.setIdItem(1);
        when(itemCarrinhoRepository.findAll()).thenReturn(Arrays.asList(item));

        List<ItemCarrinho> resultado = itemCarrinhoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarItemPorId() {
        ItemCarrinho item = new ItemCarrinho();
        item.setIdItem(1);
        when(itemCarrinhoRepository.findById(1)).thenReturn(Optional.of(item));

        ItemCarrinho resultado = itemCarrinhoService.buscarPorId(1);

        assertEquals(1, resultado.getIdItem());
    }

    @Test
    void deveSalvarItem() {
        ItemCarrinho item = new ItemCarrinho();
        when(itemCarrinhoRepository.save(item)).thenReturn(item);

        ItemCarrinho resultado = itemCarrinhoService.salvar(item);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirItem() {
        itemCarrinhoService.deletar(1);

        verify(itemCarrinhoRepository, times(1)).deleteById(1);
    }
}