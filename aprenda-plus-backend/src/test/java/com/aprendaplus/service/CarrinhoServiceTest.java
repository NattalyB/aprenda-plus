package com.aprendaplus.service;

import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.repository.CarrinhoRepository;
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
class CarrinhoServiceTest {

    @Mock
    private CarrinhoRepository carrinhoRepository;

    @InjectMocks
    private CarrinhoService carrinhoService;

    @Test
    void deveListarTodosOsCarrinhos() {
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(1);
        when(carrinhoRepository.findAll()).thenReturn(Arrays.asList(carrinho));

        List<Carrinho> resultado = carrinhoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarCarrinhoPorId() {
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(1);
        when(carrinhoRepository.findById(1)).thenReturn(Optional.of(carrinho));

        Carrinho resultado = carrinhoService.buscarPorId(1);

        assertEquals(1, resultado.getIdCarrinho());
    }

    @Test
    void deveSalvarCarrinho() {
        Carrinho carrinho = new Carrinho();
        when(carrinhoRepository.save(carrinho)).thenReturn(carrinho);

        Carrinho resultado = carrinhoService.salvar(carrinho);

        assertNotNull(resultado);
    }

    @Test
    void deveExcluirCarrinho() {
        carrinhoService.deletar(1);

        verify(carrinhoRepository, times(1)).deleteById(1);
    }
}