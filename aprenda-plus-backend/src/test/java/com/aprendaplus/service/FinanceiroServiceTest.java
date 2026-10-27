package com.aprendaplus.service;

import com.aprendaplus.dto.AlertasFinanceiros;
import com.aprendaplus.dto.CalculoParcela;
import com.aprendaplus.dto.ParcelaFinanceira;
import com.aprendaplus.dto.ResumoFinanceiro;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.ConfiguracaoFinanceira;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.ConfiguracaoFinanceiraRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import com.aprendaplus.repository.PagamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinanceiroServiceTest {

    private static final LocalDate HOJE = LocalDate.of(2026, 10, 12);

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private MatriculaRepository matriculaRepository;

    @Mock
    private InscricaoRepository inscricaoRepository;

    @Mock
    private ConfiguracaoFinanceiraRepository configuracaoRepository;

    @InjectMocks
    private FinanceiroService financeiroService;

    // Por padrão, nenhuma parcela pendente está vencida
    @BeforeEach
    void semVencidas() {
        lenient().when(pagamentoRepository.findByStatusAndDataVencimentoBefore(any(), any())).thenReturn(List.of());
        lenient().when(pagamentoRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private static Matricula matricula(int id, String nomeCurso) {
        Curso curso = new Curso();
        curso.setNome(nomeCurso);
        Turma turma = new Turma();
        turma.setIdTurma(3);
        turma.setNome("Turma A");
        turma.setCurso(curso);
        Aluno aluno = new Aluno();
        aluno.setIdAluno(7);
        aluno.setNomeCompleto("Lucas Almeida");
        Matricula m = new Matricula();
        m.setIdMatricula(id);
        m.setAluno(aluno);
        m.setTurma(turma);
        m.setStatus("ativa");
        return m;
    }

    private static Pagamento parcela(int id, Matricula m, int numero, String valor, LocalDate vencimento, String status) {
        Pagamento p = new Pagamento();
        p.setIdPagamento(id);
        p.setMatricula(m);
        p.setNumeroParcela(numero);
        p.setValorParcela(new BigDecimal(valor));
        p.setDataVencimento(vencimento);
        p.setStatus(status);
        p.setFormaPagamento("Boleto bancário");
        return p;
    }

    @SuppressWarnings("unchecked")
    private List<Pagamento> parcelasSalvas() {
        org.mockito.ArgumentCaptor<List<Pagamento>> captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(pagamentoRepository, atLeastOnce()).saveAll(captor.capture());
        return captor.getValue();
    }

    // ===== Geração das parcelas =====

    @Test
    void boletoEm3xGeraTresParcelasMensaisComOsCentavosNaUltima() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10)).thenReturn(List.of());

        financeiroService.prepararParcelas(m, new BigDecimal("1000"), "Boleto bancário · 3x", HOJE);

        List<Pagamento> parcelas = parcelasSalvas();
        assertEquals(3, parcelas.size());
        assertEquals(new BigDecimal("333.33"), parcelas.get(0).getValorParcela());
        assertEquals(new BigDecimal("333.34"), parcelas.get(2).getValorParcela());
        assertEquals(LocalDate.of(2026, 10, 19), parcelas.get(0).getDataVencimento());
        assertEquals(LocalDate.of(2026, 12, 19), parcelas.get(2).getDataVencimento());
        assertEquals("pendente", parcelas.get(1).getStatus());
        assertEquals("Boleto bancário", parcelas.get(0).getFormaPagamento());
        assertEquals(3, parcelas.get(2).getNumeroParcela());
    }

    @Test
    void pixGeraUmaParcelaJaPaga() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10)).thenReturn(List.of());

        financeiroService.prepararParcelas(m, new BigDecimal("950.00"), "Pix à vista (5% de desconto)", HOJE);

        Pagamento unica = parcelasSalvas().get(0);
        assertEquals("pago", unica.getStatus());
        assertEquals(HOJE, unica.getDataPagamento());
        assertEquals("Pix", unica.getFormaPagamento());
    }

    @Test
    void cartaoSemNumeroDeParcelasViraUmaSo() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10)).thenReturn(List.of());

        financeiroService.prepararParcelas(m, new BigDecimal("500"), "CARTAO DE CREDITO", HOJE);

        List<Pagamento> parcelas = parcelasSalvas();
        assertEquals(1, parcelas.size());
        assertEquals("Cartão de crédito", parcelas.get(0).getFormaPagamento());
    }

    @Test
    void naoGeraSemMatriculaOuSemValor() {
        financeiroService.prepararParcelas(null, BigDecimal.TEN, "pix", HOJE);
        financeiroService.prepararParcelas(new Matricula(), BigDecimal.TEN, "pix", HOJE);

        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10)).thenReturn(List.of());
        financeiroService.prepararParcelas(m, null, "pix", HOJE);
        financeiroService.prepararParcelas(m, BigDecimal.ZERO, "pix", HOJE);

        verify(pagamentoRepository, never()).saveAll(anyList());
    }

    @Test
    void matriculaQueJaTemParcelasNaoGeraDeNovo() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10))
                .thenReturn(List.of(parcela(1, m, 1, "100", HOJE, "pago")));

        financeiroService.prepararParcelas(m, new BigDecimal("100"), "pix", HOJE);

        verify(pagamentoRepository, never()).saveAll(anyList());
    }

    @Test
    void matriculaReativadaReabreAsParcelasCanceladas() {
        Matricula m = matricula(10, "Redes");
        Pagamento vencida = parcela(1, m, 1, "100", HOJE.minusDays(3), "cancelado");
        Pagamento futura = parcela(2, m, 2, "100", HOJE.plusMonths(1), "cancelado");
        Pagamento paga = parcela(3, m, 3, "100", HOJE, "pago");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10))
                .thenReturn(List.of(vencida, futura, paga));

        financeiroService.prepararParcelas(m, new BigDecimal("300"), "Boleto · 3x", HOJE);

        assertEquals("atrasado", vencida.getStatus());
        assertEquals("pendente", futura.getStatus());
        assertEquals("pago", paga.getStatus());
    }

    @Test
    void versaoSemDataUsaODiaDeHoje() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10)).thenReturn(List.of());

        financeiroService.prepararParcelas(m, new BigDecimal("100"), "pix");

        assertNotNull(parcelasSalvas().get(0).getDataPagamento());
    }

    // ===== Cancelamento =====

    @Test
    void cancelarMatriculaCancelaSoAsParcelasEmAberto() {
        Matricula m = matricula(10, "Redes");
        Pagamento paga = parcela(1, m, 1, "100", HOJE, "pago");
        Pagamento pendente = parcela(2, m, 2, "100", HOJE.plusMonths(1), "pendente");
        Pagamento atrasada = parcela(3, m, 3, "100", HOJE.minusDays(5), "atrasado");
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10))
                .thenReturn(List.of(paga, pendente, atrasada));

        financeiroService.cancelarParcelasEmAberto(10);

        assertEquals("pago", paga.getStatus());
        assertEquals("cancelado", pendente.getStatus());
        assertEquals("cancelado", atrasada.getStatus());
    }

    @Test
    void cancelarSemMatriculaOuSemParcelasAbertasNaoSalvaNada() {
        financeiroService.cancelarParcelasEmAberto(null);
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(11)).thenReturn(List.of());
        financeiroService.cancelarParcelasEmAberto(11);

        verify(pagamentoRepository, never()).saveAll(anyList());
    }

    // ===== Gerar as que faltam =====

    @Test
    void geraParcelasDasMatriculasAtivasQueAindaNaoTem() {
        Matricula semParcelas = matricula(10, "Redes");
        Matricula comParcelas = matricula(11, "Redes");
        Matricula cancelada = matricula(12, "Redes");
        cancelada.setStatus("cancelada");
        Matricula semInscricao = matricula(13, "Redes");
        Matricula semAluno = matricula(14, "Redes");
        semAluno.setAluno(null);
        Matricula semTurma = matricula(15, "Redes");
        semTurma.setTurma(null);
        Matricula inscricaoSemValor = matricula(16, "Redes");
        inscricaoSemValor.getAluno().setIdAluno(9);
        when(matriculaRepository.findAll())
                .thenReturn(List.of(semParcelas, comParcelas, cancelada, semInscricao, semAluno, semTurma, inscricaoSemValor));
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(any())).thenReturn(List.of());
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(11))
                .thenReturn(List.of(parcela(1, comParcelas, 1, "10", HOJE, "pago")));
        Inscricao confirmada = new Inscricao();
        confirmada.setValorTotal(new BigDecimal("1200"));
        confirmada.setFormaPagamento("Boleto bancário · 12x");
        Inscricao semValor = new Inscricao();
        when(inscricaoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurmaAndStatusOrderByIdInscricaoDesc(7, 3, "confirmada"))
                .thenReturn(Optional.of(confirmada), Optional.empty());
        when(inscricaoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurmaAndStatusOrderByIdInscricaoDesc(9, 3, "confirmada"))
                .thenReturn(Optional.of(semValor));

        assertEquals(1, financeiroService.gerarParcelasQueFaltam());
        assertEquals(12, parcelasSalvas().size());
    }

    // ===== Baixa e estorno =====

    @Test
    void registraOPagamentoComDataEForma() {
        Matricula m = matricula(10, "Redes");
        Pagamento p = parcela(5, m, 2, "100", HOJE.minusDays(2), "atrasado");
        when(pagamentoRepository.findById(5)).thenReturn(Optional.of(p));
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10))
                .thenReturn(List.of(parcela(4, m, 1, "100", HOJE, "pago"), p));

        ParcelaFinanceira resultado = financeiroService.registrarPagamento(5, HOJE.minusDays(1), " Pix ", HOJE);

        assertEquals("pago", resultado.status());
        assertEquals(HOJE.minusDays(1), resultado.dataPagamento());
        assertEquals("Pix", resultado.formaPagamento());
        assertEquals(2, resultado.totalParcelas());
        assertEquals("Lucas Almeida", resultado.aluno());
        assertEquals("Redes", resultado.curso());
    }

    @Test
    void semDataUsaHojeESemFormaMantemAAnterior() {
        Pagamento p = parcela(5, null, 1, "100", HOJE, "pendente");
        when(pagamentoRepository.findById(5)).thenReturn(Optional.of(p));

        ParcelaFinanceira resultado = financeiroService.registrarPagamento(5, null, "  ", HOJE);

        assertEquals(HOJE, resultado.dataPagamento());
        assertEquals("Boleto bancário", resultado.formaPagamento());
        assertEquals(1, resultado.totalParcelas());
        assertNull(resultado.aluno());
        assertEquals("Sem curso", resultado.curso());
    }

    @Test
    void baixasRecusadas() {
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(parcela(1, null, 1, "1", HOJE, "pago")));
        when(pagamentoRepository.findById(2)).thenReturn(Optional.of(parcela(2, null, 1, "1", HOJE, "cancelado")));
        when(pagamentoRepository.findById(3)).thenReturn(Optional.of(parcela(3, null, 1, "1", HOJE, "pendente")));
        when(pagamentoRepository.findById(9)).thenReturn(Optional.empty());

        assertEquals("Esta parcela já está paga.", assertThrows(RegraDeNegocioException.class,
                () -> financeiroService.registrarPagamento(1, null, null, HOJE)).getMessage());
        assertEquals("Parcela cancelada não pode ser paga.", assertThrows(RegraDeNegocioException.class,
                () -> financeiroService.registrarPagamento(2, null, null, HOJE)).getMessage());
        assertEquals("A data do pagamento não pode ser no futuro.", assertThrows(RegraDeNegocioException.class,
                () -> financeiroService.registrarPagamento(3, HOJE.plusDays(1), null, HOJE)).getMessage());
        assertEquals("Parcela não encontrada.", assertThrows(RegraDeNegocioException.class,
                () -> financeiroService.registrarPagamento(9, null, null)).getMessage());
        verify(pagamentoRepository, never()).save(any());
    }

    @Test
    void estornoVoltaParaPendenteOuAtrasado() {
        Matricula m = matricula(10, "Redes");
        Pagamento vencida = parcela(1, m, 1, "100", HOJE.minusDays(1), "pago");
        vencida.setDataPagamento(HOJE.minusDays(1));
        Pagamento futura = parcela(2, m, 2, "100", HOJE.plusDays(10), "pago");
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(vencida));
        when(pagamentoRepository.findById(2)).thenReturn(Optional.of(futura));
        when(pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(10)).thenReturn(List.of(vencida, futura));

        assertEquals("atrasado", financeiroService.estornar(1, HOJE).status());
        assertNull(vencida.getDataPagamento());
        assertEquals("pendente", financeiroService.estornar(2, HOJE).status());
    }

    @Test
    void soEstornaParcelaPaga() {
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(parcela(1, null, 1, "1", HOJE, "pendente")));

        assertEquals("Só dá para estornar uma parcela que está paga.",
                assertThrows(RegraDeNegocioException.class, () -> financeiroService.estornar(1)).getMessage());
    }

    // ===== Consultas =====

    @Test
    void listaAsParcelasMarcandoAsAtrasadasEContandoOTotalDeCadaMatricula() {
        Matricula m = matricula(10, "Redes");
        Pagamento vencida = parcela(1, m, 1, "100", HOJE.minusDays(4), "pendente");
        Pagamento futura = parcela(2, m, 2, "100", HOJE.plusDays(20), "pendente");
        Pagamento semMatricula = parcela(3, null, 1, "50", HOJE.plusDays(1), "pendente");
        when(pagamentoRepository.findByStatusAndDataVencimentoBefore(eq("pendente"), any())).thenReturn(List.of(vencida));
        when(pagamentoRepository.findAll()).thenReturn(List.of(futura, vencida, semMatricula));

        List<ParcelaFinanceira> lista = financeiroService.listarParcelas();

        assertEquals("atrasado", vencida.getStatus());
        assertEquals(List.of(1, 3, 2), lista.stream().map(ParcelaFinanceira::idPagamento).toList());
        assertEquals(2, lista.get(0).totalParcelas());
        assertEquals(1, lista.get(1).totalParcelas());
        assertEquals("Turma A", lista.get(0).turma());
        assertEquals(3, lista.get(0).idTurma());
        assertNull(lista.get(1).idMatricula());
    }

    @Test
    void parcelasDoAluno() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findByMatricula_Aluno_IdAlunoOrderByDataVencimentoAsc(7))
                .thenReturn(List.of(parcela(1, m, 1, "100", HOJE, "pendente")));

        assertEquals(1, financeiroService.parcelasDoAluno(7).size());
    }

    @Test
    void alertasContamOQueVenceEmUmaSemanaEOQueEstaAtrasado() {
        Matricula m = matricula(10, "Redes");
        when(pagamentoRepository.findAll()).thenReturn(List.of(
                parcela(1, m, 1, "100", HOJE, "pendente"),
                parcela(2, m, 2, "100", HOJE.plusDays(7), "pendente"),
                parcela(3, m, 3, "100", HOJE.plusDays(8), "pendente"),
                parcela(4, m, 4, "100", HOJE.minusDays(2), "atrasado"),
                parcela(5, m, 5, "100", HOJE.plusDays(1), "pago")));

        AlertasFinanceiros alertas = financeiroService.alertas(HOJE);

        assertEquals(2, alertas.vencendoEmBreve());
        assertEquals(1, alertas.atrasadas());
        assertNotNull(financeiroService.alertas());
    }

    @Test
    void resumoComIndicadoresEGraficos() {
        Matricula redes = matricula(10, "Redes");
        Matricula design = matricula(11, "Design");
        Pagamento recebidaNoMes = parcela(1, redes, 1, "300", HOJE.minusDays(5), "pago");
        recebidaNoMes.setDataPagamento(HOJE.minusDays(4));
        recebidaNoMes.setFormaPagamento("Pix");
        Pagamento atrasada = parcela(2, redes, 2, "100", HOJE.minusDays(1), "atrasado");
        Pagamento futuraNoMes = parcela(3, design, 1, "200", HOJE.plusDays(5), "pendente");
        Pagamento proximoMes = parcela(4, design, 2, "200", HOJE.plusMonths(1), "pendente");
        Pagamento cancelada = parcela(5, design, 3, "999", HOJE, "cancelado");
        Pagamento semValor = parcela(6, design, 4, "1", HOJE.plusMonths(2), "pendente");
        semValor.setValorParcela(null);
        Pagamento pagaSemData = parcela(7, null, 1, "50", HOJE.minusMonths(2), "pago");
        pagaSemData.setFormaPagamento(null);
        when(pagamentoRepository.findAll()).thenReturn(new ArrayList<>(List.of(
                recebidaNoMes, atrasada, futuraNoMes, proximoMes, cancelada, semValor, pagaSemData)));

        ResumoFinanceiro r = financeiroService.resumo(HOJE);

        assertEquals(new BigDecimal("600.00"), r.previstoNoMes());
        assertEquals(new BigDecimal("300.00"), r.recebidoNoMes());
        assertEquals(new BigDecimal("100.00"), r.emAtraso());
        assertEquals(1, r.parcelasAtrasadas());
        assertEquals(new BigDecimal("500.00"), r.aReceber());
        // Já venceu: 300 + 100 + 50 = 450; em atraso 100 -> 22,2%
        assertEquals(new BigDecimal("22.2"), r.inadimplencia());
        assertEquals(12, r.porMes().size());
        assertEquals("2026-10", r.porMes().get(5).mes());
        assertEquals(new BigDecimal("300.00"), r.porMes().get(5).recebido());
        assertEquals(new BigDecimal("200.00"), r.porMes().get(6).previsto());
        assertEquals("Design", r.porCurso().get(0).nome());
        assertEquals(new BigDecimal("400.00"), r.porCurso().get(0).valor());
        assertEquals("Sem curso", r.porCurso().get(2).nome());
        assertTrue(r.porForma().stream().anyMatch(i -> i.nome().equals("Outros")));
        assertTrue(r.porForma().stream().anyMatch(i -> i.nome().equals("Pix")));
    }

    @Test
    void resumoSemParcelasNaoDividePorZero() {
        when(pagamentoRepository.findAll()).thenReturn(List.of());

        ResumoFinanceiro r = financeiroService.resumo();

        assertEquals(new BigDecimal("0.0"), r.inadimplencia());
        assertTrue(r.porCurso().isEmpty());
    }

    @Test
    void agrupaAsFormasDePagamento() {
        assertEquals("Pix", FinanceiroService.familia("pix à vista"));
        assertEquals("Cartão de crédito", FinanceiroService.familia("Cartão de crédito · 10x"));
        assertEquals("Boleto bancário", FinanceiroService.familia("BOLETO 3x"));
        assertEquals("Outros", FinanceiroService.familia("  "));
        assertEquals("Dinheiro", FinanceiroService.familia(" Dinheiro "));
    }

    // ===== Cobrança automática (Pix e cartão) =====

    private void inscricaoConfirmada(String forma) {
        Matricula m = matricula(99, "Redes");
        Inscricao antiga = new Inscricao();
        antiga.setIdInscricao(1);
        antiga.setAluno(m.getAluno());
        antiga.setTurma(m.getTurma());
        antiga.setStatus("confirmada");
        antiga.setFormaPagamento("Pix");
        Inscricao atual = new Inscricao();
        atual.setIdInscricao(2);
        atual.setAluno(m.getAluno());
        atual.setTurma(m.getTurma());
        atual.setStatus("confirmada");
        atual.setFormaPagamento(forma);
        Inscricao cancelada = new Inscricao();
        cancelada.setStatus("cancelada");
        Inscricao semAluno = new Inscricao();
        semAluno.setStatus("confirmada");
        semAluno.setFormaPagamento("Pix");
        when(inscricaoRepository.findAll()).thenReturn(List.of(atual, cancelada, semAluno, antiga));
    }

    @Test
    void sabeQuaisFormasCaemSozinhas() {
        assertTrue(FinanceiroService.cobrancaAutomatica("Pix"));
        assertTrue(FinanceiroService.cobrancaAutomatica("Cartão de crédito · 10x"));
        assertFalse(FinanceiroService.cobrancaAutomatica("Boleto bancário · 3x"));
        assertFalse(FinanceiroService.cobrancaAutomatica("Dinheiro"));
        assertFalse(FinanceiroService.cobrancaAutomatica(null));
    }

    @Test
    void parcelaDoCartaoQueChegouNoVencimentoEhPagaSozinha() {
        Matricula m = matricula(10, "Redes");
        Pagamento cartao = parcela(1, m, 1, "100", HOJE, "pendente");
        cartao.setFormaPagamento("Cartão de crédito");
        Pagamento cartaoAtrasado = parcela(2, m, 2, "100", HOJE.minusDays(3), "atrasado");
        cartaoAtrasado.setFormaPagamento("Cartão de crédito");
        Pagamento boleto = parcela(3, null, 1, "100", HOJE, "pendente");
        when(pagamentoRepository.findByStatusInAndDataVencimentoLessThanEqual(any(), eq(HOJE)))
                .thenReturn(List.of(cartao, cartaoAtrasado, boleto));

        financeiroService.atualizarAtrasadas(HOJE);

        assertEquals("pago", cartao.getStatus());
        assertEquals(HOJE, cartao.getDataPagamento());
        assertEquals("pago", cartaoAtrasado.getStatus());
        assertEquals(HOJE.minusDays(3), cartaoAtrasado.getDataPagamento());
        assertEquals("pendente", boleto.getStatus());
        assertEquals(2, parcelasSalvas().size());
    }

    @Test
    void quemDecideEhAFormaEscolhidaNaInscricao() {
        inscricaoConfirmada("Boleto bancário · 6x");
        Matricula m = matricula(10, "Redes");
        // A baixa anterior gravou "Pix", mas o aluno comprou no boleto: não pode cair sozinha
        Pagamento boletoComOutraForma = parcela(1, m, 1, "100", HOJE.minusDays(1), "atrasado");
        boletoComOutraForma.setFormaPagamento("Pix");
        when(pagamentoRepository.findByStatusInAndDataVencimentoLessThanEqual(any(), eq(HOJE)))
                .thenReturn(List.of(boletoComOutraForma));

        financeiroService.atualizarAtrasadas(HOJE);

        assertEquals("atrasado", boletoComOutraForma.getStatus());
        verify(pagamentoRepository, never()).saveAll(anyList());
    }

    @Test
    void listaMarcaAsParcelasDeCobrancaAutomatica() {
        inscricaoConfirmada("Cartão de crédito · 12x");
        Matricula cartao = matricula(10, "Redes");
        Matricula boleto = matricula(11, "Redes");
        boleto.getAluno().setIdAluno(8);
        when(pagamentoRepository.findAll()).thenReturn(List.of(
                parcela(1, cartao, 2, "100", HOJE.plusDays(30), "pendente"),
                parcela(2, boleto, 2, "100", HOJE.plusDays(30), "pendente")));

        List<ParcelaFinanceira> lista = financeiroService.listarParcelas();

        assertTrue(lista.get(0).cobrancaAutomatica());
        assertFalse(lista.get(1).cobrancaAutomatica());
    }

    @Test
    void alertasSoContamBoletosETrazemOsIds() {
        inscricaoConfirmada("Cartão de crédito · 12x");
        Matricula cartao = matricula(10, "Redes");
        Matricula boleto = matricula(11, "Redes");
        boleto.getAluno().setIdAluno(8);
        when(pagamentoRepository.findAll()).thenReturn(List.of(
                parcela(1, cartao, 2, "100", HOJE.plusDays(3), "pendente"),
                parcela(2, boleto, 2, "100", HOJE.plusDays(3), "pendente"),
                parcela(3, boleto, 1, "100", HOJE.minusDays(5), "atrasado")));

        AlertasFinanceiros alertas = financeiroService.alertas(HOJE);

        assertEquals(1, alertas.vencendoEmBreve());
        assertEquals(List.of(2), alertas.idsVencendo());
        assertEquals(1, alertas.atrasadas());
        assertEquals(List.of(3), alertas.idsAtrasadas());
        assertEquals(List.of(), new AlertasFinanceiros(0, 0).idsVencendo());
    }

    @Test
    void naoDesfazPagamentoQueCaiuSozinho() {
        Pagamento pix = parcela(1, null, 1, "100", HOJE, "pago");
        pix.setFormaPagamento("Pix");
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(pix));

        assertEquals("Esta parcela é de Pix: o valor é recebido automaticamente e o pagamento não pode ser desfeito.",
                assertThrows(RegraDeNegocioException.class, () -> financeiroService.estornar(1, HOJE)).getMessage());
        assertEquals("pago", pix.getStatus());
        verify(pagamentoRepository, never()).save(any());
    }

    @Test
    void estornoVoltaAFormaDaInscricao() {
        inscricaoConfirmada("Boleto bancário · 6x");
        Matricula m = matricula(10, "Redes");
        Pagamento boletoPagoNoPix = parcela(1, m, 1, "100", HOJE.minusDays(2), "pago");
        boletoPagoNoPix.setFormaPagamento("Pix");
        Pagamento cartaoFuturo = parcela(2, null, 2, "100", HOJE.plusDays(20), "pago");
        cartaoFuturo.setFormaPagamento("Cartão de crédito");
        when(pagamentoRepository.findById(1)).thenReturn(Optional.of(boletoPagoNoPix));
        when(pagamentoRepository.findById(2)).thenReturn(Optional.of(cartaoFuturo));

        ParcelaFinanceira boleto = financeiroService.estornar(1, HOJE);
        ParcelaFinanceira cartao = financeiroService.estornar(2, HOJE);

        assertEquals("atrasado", boleto.status());
        assertEquals("Boleto bancário", boleto.formaPagamento());
        assertFalse(boleto.cobrancaAutomatica());
        // Cartão pago adiantado por engano: volta a esperar o vencimento
        assertEquals("pendente", cartao.status());
        assertTrue(cartao.cobrancaAutomatica());
    }

    // ===== Multa, juros e desconto =====

    private void regrasDeCobranca(String multa, String juros, String desconto, int carencia) {
        ConfiguracaoFinanceira regras = new ConfiguracaoFinanceira();
        regras.setMultaPercentual(new BigDecimal(multa));
        regras.setJurosMesPercentual(new BigDecimal(juros));
        regras.setDescontoPontualidadePercentual(new BigDecimal(desconto));
        regras.setDiasCarencia(carencia);
        when(configuracaoRepository.findById(ConfiguracaoFinanceira.ID_UNICO)).thenReturn(Optional.of(regras));
    }

    @Test
    void baixaAtrasadaGuardaMultaJurosEValorPago() {
        regrasDeCobranca("2", "1", "5", 0);
        Pagamento p = parcela(5, null, 1, "500", HOJE.minusDays(30), "atrasado");
        when(pagamentoRepository.findById(5)).thenReturn(Optional.of(p));

        ParcelaFinanceira resultado = financeiroService.registrarPagamento(5, HOJE, "Boleto bancário", false, null, HOJE);

        assertEquals(new BigDecimal("10.00"), p.getValorMulta());
        assertEquals(new BigDecimal("5.00"), p.getValorJuros());
        assertEquals(new BigDecimal("0.00"), p.getValorDesconto());
        assertEquals(new BigDecimal("515.00"), p.getValorPago());
        assertEquals(new BigDecimal("515.00"), resultado.valorPago());
        assertEquals(new BigDecimal("515.00"), resultado.valorAtualizado());
        assertEquals(new BigDecimal("500"), resultado.valor());
    }

    @Test
    void baixaEmDiaGanhaDescontoEIsencaoTiraOsEncargos() {
        regrasDeCobranca("2", "1", "5", 0);
        Pagamento emDia = parcela(5, null, 1, "500", HOJE, "pendente");
        Pagamento atrasada = parcela(6, null, 1, "500", HOJE.minusDays(30), "atrasado");
        when(pagamentoRepository.findById(5)).thenReturn(Optional.of(emDia));
        when(pagamentoRepository.findById(6)).thenReturn(Optional.of(atrasada));

        financeiroService.registrarPagamento(5, HOJE, null, false, null, HOJE);
        financeiroService.registrarPagamento(6, HOJE, null, true, new BigDecimal("20"), HOJE);

        assertEquals(new BigDecimal("475.00"), emDia.getValorPago());
        assertEquals(new BigDecimal("25.00"), emDia.getValorDesconto());
        assertEquals(new BigDecimal("0.00"), atrasada.getValorMulta());
        assertEquals(new BigDecimal("480.00"), atrasada.getValorPago());
    }

    @Test
    void estornoApagaOsValoresDaBaixa() {
        Pagamento p = parcela(5, null, 1, "500", HOJE.minusDays(5), "pago");
        p.setDataPagamento(HOJE);
        p.setValorMulta(new BigDecimal("10.00"));
        p.setValorJuros(new BigDecimal("0.83"));
        p.setValorDesconto(BigDecimal.ZERO);
        p.setValorPago(new BigDecimal("510.83"));
        when(pagamentoRepository.findById(5)).thenReturn(Optional.of(p));

        ParcelaFinanceira resultado = financeiroService.estornar(5, HOJE);

        assertNull(p.getValorMulta());
        assertNull(p.getValorJuros());
        assertNull(p.getValorDesconto());
        assertNull(p.getValorPago());
        assertNull(resultado.valorPago());
    }

    @Test
    void listaMostraQuantoCustaPagarHoje() {
        regrasDeCobranca("2", "1", "0", 0);
        LocalDate hoje = financeiroService.hoje();
        Pagamento atrasada = parcela(1, null, 1, "500", hoje.minusDays(30), "atrasado");
        Pagamento paga = parcela(2, null, 2, "500", hoje.minusDays(60), "pago");
        paga.setDataPagamento(hoje.minusDays(50));
        paga.setValorPago(new BigDecimal("508.33"));
        Pagamento antiga = parcela(3, null, 3, "500", hoje.minusDays(90), "pago");
        antiga.setDataPagamento(hoje.minusDays(90));
        Pagamento cancelada = parcela(4, null, 4, "500", hoje.minusDays(10), "cancelado");
        when(pagamentoRepository.findAll()).thenReturn(List.of(atrasada, paga, antiga, cancelada));

        List<ParcelaFinanceira> lista = financeiroService.listarParcelas();

        ParcelaFinanceira primeira = lista.stream().filter(x -> x.idPagamento() == 1).findFirst().orElseThrow();
        ParcelaFinanceira segunda = lista.stream().filter(x -> x.idPagamento() == 2).findFirst().orElseThrow();
        ParcelaFinanceira terceira = lista.stream().filter(x -> x.idPagamento() == 3).findFirst().orElseThrow();
        ParcelaFinanceira quarta = lista.stream().filter(x -> x.idPagamento() == 4).findFirst().orElseThrow();
        assertEquals(new BigDecimal("515.00"), primeira.valorAtualizado());
        assertEquals(new BigDecimal("508.33"), segunda.valorAtualizado());
        assertEquals(new BigDecimal("500"), terceira.valorAtualizado());
        assertEquals(new BigDecimal("500"), quarta.valorAtualizado());
    }

    @Test
    void recebidoDoMesSomaOValorPago() {
        Pagamento comJuros = parcela(1, null, 1, "500", HOJE.minusDays(20), "pago");
        comJuros.setDataPagamento(HOJE.minusDays(2));
        comJuros.setValorPago(new BigDecimal("512.50"));
        Pagamento antiga = parcela(2, null, 2, "300", HOJE.minusDays(5), "pago");
        antiga.setDataPagamento(HOJE.minusDays(5));
        when(pagamentoRepository.findAll()).thenReturn(List.of(comJuros, antiga));

        ResumoFinanceiro r = financeiroService.resumo(HOJE);

        assertEquals(new BigDecimal("812.50"), r.recebidoNoMes());
        assertEquals(new BigDecimal("812.50"), r.porMes().get(5).recebido());
    }

    @Test
    void semRegrasSalvasNaoCobraNada() {
        ConfiguracaoFinanceira regras = financeiroService.regras();
        assertEquals(0, regras.getMultaPercentual().signum());
        assertEquals(0, regras.getJurosMesPercentual().signum());
        assertEquals(0, regras.getDiasCarencia());
    }

    @Test
    void salvaAsRegrasSempreNaLinhaUm() {
        when(configuracaoRepository.save(any(ConfiguracaoFinanceira.class))).thenAnswer(i -> i.getArgument(0));
        ConfiguracaoFinanceira novas = new ConfiguracaoFinanceira();
        novas.setId(99);
        novas.setMultaPercentual(new BigDecimal("2"));
        novas.setJurosMesPercentual(new BigDecimal("1"));
        novas.setDescontoPontualidadePercentual(new BigDecimal("5"));
        novas.setDiasCarencia(3);

        ConfiguracaoFinanceira salvas = financeiroService.salvarRegras(novas);

        assertEquals(1, salvas.getId());
        assertNotNull(salvas.getAtualizadoEm());

        novas.setMultaPercentual(new BigDecimal("10"));
        assertThrows(RegraDeNegocioException.class, () -> financeiroService.salvarRegras(novas));
        verify(configuracaoRepository, times(1)).save(any());
    }

    @Test
    void calculaAPreviaDaBaixa() {
        regrasDeCobranca("2", "1", "0", 0);
        Pagamento aberta = parcela(5, null, 1, "500", HOJE.minusDays(15), "atrasado");
        when(pagamentoRepository.findById(5)).thenReturn(Optional.of(aberta));
        when(pagamentoRepository.findById(6)).thenReturn(Optional.of(parcela(6, null, 1, "500", HOJE, "pago")));

        CalculoParcela c = financeiroService.calcular(5, HOJE, false, null);

        assertEquals(new BigDecimal("512.50"), c.total());
        assertEquals(15L, c.diasAtraso());
        assertEquals("Esta parcela não está em aberto.", assertThrows(RegraDeNegocioException.class,
                () -> financeiroService.calcular(6, HOJE, false, null)).getMessage());
    }
}
