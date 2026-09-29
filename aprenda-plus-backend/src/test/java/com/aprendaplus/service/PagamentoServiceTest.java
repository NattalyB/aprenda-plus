package com.aprendaplus.service;

import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.repository.PagamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PagamentoServiceTest {

    @Mock
    private PagamentoRepository pagamentoRepository;

    @InjectMocks
    private PagamentoService pagamentoService;

    private Pagamento pagamento;

    @BeforeEach
    void setUp() {
        pagamento = new Pagamento();
        pagamento.setIdPagamento(1);
        pagamento.setValorParcela(new BigDecimal("150.00"));
        pagamento.setStatus("pendente");
    }

    @Test
    void deveListarTodosOsPagamentos() {
        when(pagamentoRepository.findAll()).thenReturn(Arrays.asList(pagamento));

        List<Pagamento> resultado = pagamentoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarPagamentoPorId() {
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(pagamento));

        Pagamento resultado = pagamentoService.buscarPorId(1);

        assertEquals("pendente", resultado.getStatus());
    }

    @Test
    void deveSalvarPagamento() {
        when(pagamentoRepository.save(pagamento)).thenReturn(pagamento);

        Pagamento resultado = pagamentoService.salvar(pagamento);

        assertEquals(new BigDecimal("150.00"), resultado.getValorParcela());
    }

    @Test
    void deveExcluirPagamento() {
        pagamentoService.deletar(1);

        verify(pagamentoRepository, times(1)).deleteById(1);
    }
}