package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.TurmaRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InscricaoServiceTest {

    @Mock
    private InscricaoRepository inscricaoRepository;

    @Mock
    private TurmaRepository turmaRepository;

    @InjectMocks
    private InscricaoService inscricaoService;

    private Inscricao inscricao;

    @BeforeEach
    void setUp() {
        inscricao = new Inscricao();
        inscricao.setIdInscricao(1);
        inscricao.setStatus("pendente_pagamento");
        inscricao.setValorTotal(new BigDecimal("199.90"));
    }

    // ===== Operações básicas (usadas pelo painel do admin) =====

    @Test
    void deveListarTodasAsInscricoes() {
        when(inscricaoRepository.findAll()).thenReturn(Arrays.asList(inscricao));

        List<Inscricao> resultado = inscricaoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarInscricaoPorId() {
        when(inscricaoRepository.findById(1)).thenReturn(Optional.of(inscricao));

        Inscricao resultado = inscricaoService.buscarPorId(1);

        assertEquals("pendente_pagamento", resultado.getStatus());
    }

    @Test
    void deveAtualizarStatusDaInscricao() {
        inscricao.setStatus("confirmada");
        when(inscricaoRepository.save(inscricao)).thenReturn(inscricao);

        Inscricao resultado = inscricaoService.salvar(inscricao);

        assertEquals("confirmada", resultado.getStatus());
    }

    @Test
    void deveExcluirInscricao() {
        inscricaoService.deletar(1);

        verify(inscricaoRepository, times(1)).deleteById(1);
    }

    // ===== Compra feita pelo aluno: o valor é calculado no servidor =====

    // Cria a turma 3, de um curso de R$ 10.000,00 que pode ser pago em até 10x
    private void turmaDoCurso(String valor, Integer numeroParcelas) {
        Curso curso = new Curso();
        curso.setNome("Desenvolvimento Full Stack");
        curso.setValor(valor == null ? null : new BigDecimal(valor));
        curso.setNumeroParcelas(numeroParcelas);

        Turma turma = new Turma();
        turma.setIdTurma(3);
        turma.setCurso(curso);

        when(turmaRepository.findById(3)).thenReturn(Optional.of(turma));
    }

    // Monta o que chega do navegador: aqui com aluno, status e valor "adulterados"
    private Inscricao pedido(String formaPagamento) {
        Aluno outroAluno = new Aluno();
        outroAluno.setIdAluno(99);

        Turma turma = new Turma();
        turma.setIdTurma(3);

        Inscricao dados = new Inscricao();
        dados.setIdInscricao(50);
        dados.setAluno(outroAluno);
        dados.setTurma(turma);
        dados.setStatus("confirmada");
        dados.setValorTotal(new BigDecimal("0.01"));
        dados.setFormaPagamento(formaPagamento);
        dados.setObservacoes("Prefiro aulas à noite");
        return dados;
    }

    private void saveDevolveAPropriaInscricao() {
        when(inscricaoRepository.save(any(Inscricao.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void pixDeveTerCincoPorCentoDeDescontoCalculadoNoServidor() {
        turmaDoCurso("10000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Pix à vista (5% de desconto)"), 7);

        // O valor enviado pelo navegador (R$ 0,01) é ignorado
        assertEquals(new BigDecimal("9500.00"), salva.getValorTotal());
        assertEquals("Pix à vista (5% de desconto)", salva.getFormaPagamento());
    }

    @Test
    void inscricaoDoAlunoUsaDadosDoServidorENaoDoNavegador() {
        turmaDoCurso("10000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7);

        assertNull(salva.getIdInscricao());                 // não sobrescreve outra inscrição
        assertEquals(7, salva.getAluno().getIdAluno());     // aluno do token, não o 99
        assertEquals("pendente_pagamento", salva.getStatus()); // não nasce confirmada
        assertEquals(3, salva.getTurma().getIdTurma());
        assertEquals("Prefiro aulas à noite", salva.getObservacoes());
    }

    @Test
    void descontoPixDeveSerArredondadoEmCentavos() {
        turmaDoCurso("199.90", 1);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Pix"), 7);

        // 199,90 x 0,95 = 189,905 -> 189,91
        assertEquals(new BigDecimal("189.91"), salva.getValorTotal());
    }

    @Test
    void cartaoParceladoCobraOValorCheioDoCurso() {
        turmaDoCurso("10000", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 10x"), 7);

        assertEquals(new BigDecimal("10000.00"), salva.getValorTotal());
        assertEquals("Cartão de crédito · 10x", salva.getFormaPagamento());
    }

    @Test
    void boletoParceladoCobraOValorCheioDoCurso() {
        turmaDoCurso("10000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 4x"), 7);

        assertEquals(new BigDecimal("10000.00"), salva.getValorTotal());
        assertEquals("Boleto bancário · 4x", salva.getFormaPagamento());
    }

    @Test
    void formaDePagamentoSemParcelasEhConsideradaAVista() {
        turmaDoCurso("500.00", 3);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("CARTAO DE CREDITO"), 7);

        assertEquals("Cartão de crédito · 1x", salva.getFormaPagamento());
        assertEquals(new BigDecimal("500.00"), salva.getValorTotal());
    }

    @Test
    void naoPodeParcelarAcimaDoLimiteDoCurso() {
        turmaDoCurso("10000.00", 10);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 12x"), 7));

        assertEquals("O curso \"Desenvolvimento Full Stack\" pode ser pago em no máximo 10x.", erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void naoPodeEscolherZeroParcelas() {
        turmaDoCurso("10000.00", 10);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 0x"), 7));
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void cursoSemLimiteDeParcelasSoPodeSerPagoAVista() {
        turmaDoCurso("800.00", null);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 2x"), 7));

        assertTrue(erro.getMessage().contains("no máximo 1x"));
    }

    @Test
    void cursoComLimiteZeradoSoPodeSerPagoAVista() {
        turmaDoCurso("800.00", 0);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 1x"), 7);

        assertEquals("Boleto bancário · 1x", salva.getFormaPagamento());
    }

    @Test
    void formaDePagamentoDesconhecidaEhRecusada() {
        turmaDoCurso("10000.00", 10);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Bitcoin"), 7));

        assertEquals("Escolha uma forma de pagamento válida: Pix, cartão ou boleto.", erro.getMessage());
    }

    @Test
    void formaDePagamentoVaziaEhRecusada() {
        turmaDoCurso("10000.00", 10);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido(null), 7));
    }

    @Test
    void inscricaoSemTurmaEhRecusada() {
        Inscricao semTurma = pedido("pix");
        semTurma.setTurma(null);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(semTurma, 7));

        assertEquals("Informe a turma da inscrição.", erro.getMessage());
    }

    @Test
    void inscricaoComTurmaSemIdEhRecusada() {
        Inscricao turmaSemId = pedido("pix");
        turmaSemId.getTurma().setIdTurma(null);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(turmaSemId, 7));
    }

    @Test
    void turmaInexistenteEhRecusada() {
        when(turmaRepository.findById(3)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));

        assertEquals("Turma não encontrada.", erro.getMessage());
    }

    @Test
    void turmaSemCursoEhRecusada() {
        Turma turma = new Turma();
        turma.setIdTurma(3);
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turma));

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));
    }

    @Test
    void cursoSemValorEhRecusado() {
        turmaDoCurso(null, 10);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));
    }
}
