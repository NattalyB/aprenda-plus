package com.aprendaplus.service;

import com.aprendaplus.dto.FluxoDeCaixa;
import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.ContaPagarRepository;
import com.aprendaplus.repository.PagamentoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContaPagarServiceTest {

    private static final LocalDate HOJE = LocalDate.of(2026, 10, 20);

    @Mock
    private ContaPagarRepository contaPagarRepository;

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private FinanceiroService financeiroService;

    @InjectMocks
    private ContaPagarService contaPagarService;

    private static ContaPagar conta(Integer id, String status) {
        ContaPagar c = new ContaPagar();
        c.setIdConta(id);
        c.setDescricao("Aluguel");
        c.setCategoria("Aluguel");
        c.setValor(new BigDecimal("3500"));
        c.setDataVencimento(LocalDate.of(2026, 10, 10));
        c.setStatus(status);
        return c;
    }

    @Test
    void contaFixaSeRepeteTodoMes() {
        when(contaPagarRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));
        ContaPagar dados = conta(null, null);
        dados.setDescricao("  Aluguel da sede ");
        dados.setFornecedor("  ");
        dados.setDataVencimento(LocalDate.of(2026, 11, 30));

        List<ContaPagar> criadas = contaPagarService.criar(dados, 3);

        assertEquals(3, criadas.size());
        assertEquals("Aluguel da sede (1/3)", criadas.get(0).getDescricao());
        assertEquals("Aluguel da sede (3/3)", criadas.get(2).getDescricao());
        assertEquals(LocalDate.of(2026, 12, 30), criadas.get(1).getDataVencimento());
        assertEquals(LocalDate.of(2027, 1, 30), criadas.get(2).getDataVencimento());
        assertEquals(new BigDecimal("3500.00"), criadas.get(0).getValor());
        assertEquals("pendente", criadas.get(0).getStatus());
        assertNull(criadas.get(0).getFornecedor());
    }

    @Test
    void contaUnicaNaoGanhaNumero() {
        when(contaPagarRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));
        List<ContaPagar> criadas = contaPagarService.criar(conta(null, null), null);
        assertEquals(1, criadas.size());
        assertEquals("Aluguel", criadas.get(0).getDescricao());
    }

    @Test
    void conferirOsDadosDaConta() {
        ContaPagar semDescricao = conta(null, null);
        semDescricao.setDescricao(" ");
        ContaPagar semCategoria = conta(null, null);
        semCategoria.setCategoria(null);
        ContaPagar semValor = conta(null, null);
        semValor.setValor(BigDecimal.ZERO);
        ContaPagar semData = conta(null, null);
        semData.setDataVencimento(null);
        ContaPagar longa = conta(null, null);
        longa.setDescricao("x".repeat(141));

        assertEquals("Informe a descrição da conta.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.criar(semDescricao, 1)).getMessage());
        assertEquals("Escolha a categoria da conta.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.criar(semCategoria, 1)).getMessage());
        assertEquals("Informe um valor maior que zero.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.criar(semValor, 1)).getMessage());
        assertEquals("Informe a data de vencimento.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.criar(semData, 1)).getMessage());
        assertEquals("A descrição pode ter no máximo 140 caracteres.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.criar(longa, 1)).getMessage());
        assertEquals("A conta pode se repetir por no máximo 36 meses.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.criar(conta(null, null), 37)).getMessage());
        verify(contaPagarRepository, never()).saveAll(anyList());
    }

    @Test
    void editaContaEmAbertoMasNaoContaPaga() {
        ContaPagar aberta = conta(1, "pendente");
        when(contaPagarRepository.findById(1)).thenReturn(Optional.of(aberta));
        when(contaPagarRepository.findById(2)).thenReturn(Optional.of(conta(2, "pago")));
        when(contaPagarRepository.save(any(ContaPagar.class))).thenAnswer(i -> i.getArgument(0));
        ContaPagar dados = conta(null, "cancelado");
        dados.setValor(new BigDecimal("3600.5"));
        dados.setObservacao(" reajuste ");

        ContaPagar salva = contaPagarService.atualizar(1, dados);

        assertEquals(new BigDecimal("3600.50"), salva.getValor());
        assertEquals("reajuste", salva.getObservacao());
        assertEquals("cancelado", salva.getStatus());
        assertEquals("Esta conta já foi paga. Desfaça o pagamento antes de editar.",
                assertThrows(RegraDeNegocioException.class, () -> contaPagarService.atualizar(2, dados)).getMessage());
    }

    @Test
    void editarNaoMarcaComoPagaPeloStatus() {
        ContaPagar aberta = conta(1, "pendente");
        when(contaPagarRepository.findById(1)).thenReturn(Optional.of(aberta));
        when(contaPagarRepository.save(any(ContaPagar.class))).thenAnswer(i -> i.getArgument(0));

        assertEquals("pendente", contaPagarService.atualizar(1, conta(null, "pago")).getStatus());
    }

    @Test
    void excluiSoContaQueNaoFoiPaga() {
        ContaPagar aberta = conta(1, "pendente");
        when(contaPagarRepository.findById(1)).thenReturn(Optional.of(aberta));
        when(contaPagarRepository.findById(2)).thenReturn(Optional.of(conta(2, "pago")));
        when(contaPagarRepository.findById(3)).thenReturn(Optional.empty());

        contaPagarService.excluir(1);

        verify(contaPagarRepository).delete(aberta);
        assertEquals("Esta conta já foi paga. Desfaça o pagamento antes de excluir.",
                assertThrows(RegraDeNegocioException.class, () -> contaPagarService.excluir(2)).getMessage());
        assertEquals("Conta não encontrada.",
                assertThrows(RegraDeNegocioException.class, () -> contaPagarService.excluir(3)).getMessage());
    }

    @Test
    void pagaEDesfazOPagamento() {
        ContaPagar c = conta(1, "pendente");
        when(contaPagarRepository.findById(1)).thenReturn(Optional.of(c));
        when(contaPagarRepository.save(any(ContaPagar.class))).thenAnswer(i -> i.getArgument(0));

        ContaPagar paga = contaPagarService.pagar(1, null, " Pix ", HOJE);
        assertEquals("pago", paga.getStatus());
        assertEquals(HOJE, paga.getDataPagamento());
        assertEquals("Pix", paga.getFormaPagamento());
        assertEquals("pago", paga.getSituacao());

        ContaPagar desfeita = contaPagarService.estornar(1);
        assertEquals("pendente", desfeita.getStatus());
        assertNull(desfeita.getDataPagamento());
        assertNull(desfeita.getFormaPagamento());
    }

    @Test
    void pagamentosRecusados() {
        when(contaPagarRepository.findById(1)).thenReturn(Optional.of(conta(1, "pago")));
        when(contaPagarRepository.findById(2)).thenReturn(Optional.of(conta(2, "cancelado")));
        when(contaPagarRepository.findById(3)).thenReturn(Optional.of(conta(3, "pendente")));

        assertEquals("Esta conta já está paga.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.pagar(1, null, null, HOJE)).getMessage());
        assertEquals("Conta cancelada não pode ser paga.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.pagar(2, null, null, HOJE)).getMessage());
        assertEquals("A data do pagamento não pode ser no futuro.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.pagar(3, HOJE.plusDays(1), null, HOJE)).getMessage());
        assertEquals("Só dá para desfazer o pagamento de uma conta paga.", assertThrows(RegraDeNegocioException.class,
                () -> contaPagarService.estornar(3)).getMessage());
        verify(contaPagarRepository, never()).save(any());
    }

    @Test
    void listaPorVencimento() {
        ContaPagar depois = conta(1, "pendente");
        depois.setDataVencimento(LocalDate.of(2026, 12, 1));
        ContaPagar antes = conta(2, "pendente");
        when(contaPagarRepository.findAll()).thenReturn(List.of(depois, antes));

        List<ContaPagar> lista = contaPagarService.listar();

        assertEquals(2, lista.get(0).getIdConta());
        assertEquals(1, lista.get(1).getIdConta());
    }

    @Test
    void contaPendenteVencidaApareceAtrasada() {
        ContaPagar vencida = conta(1, "pendente");
        vencida.setDataVencimento(LocalDate.of(2020, 1, 1));
        assertEquals("atrasado", vencida.getSituacao());
        assertEquals("cancelado", conta(2, "cancelado").getSituacao());
    }

    @Test
    void fluxoDeCaixaJuntaParcelasEContas() {
        when(pagamentoRepository.findAll()).thenReturn(List.of());
        when(contaPagarRepository.findAll()).thenReturn(List.of(conta(1, "pendente")));

        FluxoDeCaixa fluxo = contaPagarService.fluxo();

        verify(financeiroService).atualizarAtrasadas(any());
        assertEquals(12, fluxo.meses().size());
    }
}
